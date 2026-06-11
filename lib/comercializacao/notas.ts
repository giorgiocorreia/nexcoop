'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export interface DadosComprovante {
  nota: {
    id: string
    numero_sequencial: number
    emitida_em: string
    status: string
  }
  organizacao: {
    nome: string
    cnpj: string
    endereco: string
    municipio: string
  }
  operador: {
    nome: string
  }
  produtor: {
    nome: string
    cpf: string
    municipio: string
  }
  produto: {
    nome: string
    unidade: string
  }
  movimentacao: {
    id: string
    quantidade_produto: number
    observacoes: string | null
    created_at: string
  }
  rateio: Array<{
    nome: string
    cpf: string
    percentual: number
    quantidade_kg: number
  }>
}

export async function emitirComprovante(movimentacao_id: string): Promise<{ nota_id: string; numero: number }> {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const { data: notaExistente } = await supabase
    .from('notas_entrega')
    .select('id, numero_sequencial')
    .eq('movimentacao_id', movimentacao_id)
    .neq('status', 'cancelada')
    .maybeSingle()

  if (notaExistente) {
    return { nota_id: notaExistente.id, numero: notaExistente.numero_sequencial }
  }

  const { data: mov, error: movErr } = await adminClient
    .from('movimentacoes_conta')
    .select(`
      id,
      quantidade_produto,
      observacoes,
      created_at,
      contas_produtor!inner(
        produtores!inner(nome, cpf, municipio)
      ),
      produtos!inner(nome, unidade),
      sessoes_caixa!sessao_caixa_id(
        organizacao_id,
        usuario_id
      )
    `)
    .eq('id', movimentacao_id)
    .single()

  if (movErr || !mov) throw new Error('Movimentação não encontrada')

  const org_id = (mov as any).sessoes_caixa.organizacao_id

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: numeroData, error: numErr } = await (adminClient as any)
    .rpc('proximo_numero_nota', { p_org_id: org_id })

  if (numErr) throw new Error('Erro ao gerar número sequencial')
  const numero_sequencial = numeroData as number

  const snapshot = {
    movimentacao_id,
    quantidade_produto: mov.quantidade_produto,
    observacoes: mov.observacoes,
    produto_nome: (mov as any).produtos.nome,
    produto_unidade: (mov as any).produtos.unidade,
    produtor_nome: (mov as any).contas_produtor.produtores.nome,
    produtor_cpf: (mov as any).contas_produtor.produtores.cpf,
    produtor_municipio: (mov as any).contas_produtor.produtores.municipio,
  }

  const { data: { user } } = await supabase.auth.getUser()
  const { data: nota, error: insertErr } = await adminClient
    .from('notas_entrega')
    .insert({
      organizacao_id: org_id,
      movimentacao_id,
      numero_sequencial,
      status: 'emitida',
      snapshot,
      emitida_por: user?.id,
    })
    .select('id, numero_sequencial')
    .single()

  if (insertErr || !nota) throw new Error('Erro ao criar nota: ' + insertErr?.message)

  return { nota_id: nota.id, numero: nota.numero_sequencial }
}

export async function buscarDadosComprovante(nota_id: string): Promise<DadosComprovante> {
  const adminClient = createAdminClient()

  const { data: nota, error } = await adminClient
    .from('notas_entrega')
    .select(`
      id,
      numero_sequencial,
      emitida_em,
      status,
      snapshot,
      emitida_por,
      movimentacao_id,
      organizacao_id
    `)
    .eq('id', nota_id)
    .single()

  if (error || !nota) throw new Error('Nota não encontrada')

  const snap = (nota.snapshot as any) ?? {}

  const { data: org, error: orgErr } = await adminClient
    .from('organizacoes')
    .select('nome, cnpj')
    .eq('id', nota.organizacao_id)
    .single()

  console.error('[comprovante] org result:', JSON.stringify({ org, orgErr }))

  if (!org) throw new Error('Organização não encontrada: ' + nota.organizacao_id)

  const { data: operador } = nota.emitida_por
    ? await adminClient.from('usuarios').select('nome_completo').eq('id', nota.emitida_por).maybeSingle()
    : { data: null }

  const { data: mov, error: movErr } = await adminClient
    .from('movimentacoes_conta')
    .select(`
      id,
      quantidade_produto,
      observacoes,
      created_at,
      contas_produtor!conta_id(
        produtor_id,
        produtores!produtor_id(nome, cpf, municipio)
      ),
      produtos!produto_id(nome, unidade)
    `)
    .eq('id', nota.movimentacao_id)
    .single()

  if (movErr) console.error('[buscarDadosComprovante] mov error:', movErr)

  const contaProdutor = (mov as any)?.contas_produtor
  const produtorData = Array.isArray(contaProdutor)
    ? contaProdutor[0]?.produtores
    : contaProdutor?.produtores
  const produtorFinal = Array.isArray(produtorData) ? produtorData[0] : produtorData
  const produtoData = (mov as any)?.produtos
  const produtoFinal = Array.isArray(produtoData) ? produtoData[0] : produtoData

  const { data: rateioRows } = await adminClient
    .from('rateio_entrega')
    .select(`
      percentual,
      quantidade_rateada,
      produtores!produtor_id(nome, cpf)
    `)
    .eq('movimentacao_id', nota.movimentacao_id)

  const rateio = (rateioRows || []).map((r: any) => {
    const p = Array.isArray(r.produtores) ? r.produtores[0] : r.produtores
    return {
      nome: p?.nome ?? '',
      cpf: p?.cpf ?? '',
      percentual: r.percentual,
      quantidade_kg: r.quantidade_rateada,
    }
  })

  return {
    nota: {
      id: nota.id,
      numero_sequencial: nota.numero_sequencial,
      emitida_em: nota.emitida_em ?? new Date().toISOString(),
      status: nota.status,
    },
    organizacao: {
      nome: org.nome,
      cnpj: org.cnpj ?? '',
      endereco: '',
      municipio: '',
    },
    operador: { nome: operador?.nome_completo || 'Operador' },
    produtor: {
      nome: produtorFinal?.nome ?? snap.produtor_nome ?? '',
      cpf: produtorFinal?.cpf ?? snap.produtor_cpf ?? '',
      municipio: produtorFinal?.municipio ?? snap.produtor_municipio ?? '',
    },
    produto: {
      nome: produtoFinal?.nome ?? snap.produto_nome ?? '',
      unidade: produtoFinal?.unidade ?? snap.produto_unidade ?? '',
    },
    movimentacao: {
      id: mov?.id ?? nota.movimentacao_id,
      quantidade_produto: mov?.quantidade_produto ?? snap.quantidade_produto ?? 0,
      observacoes: mov?.observacoes ?? snap.observacoes ?? null,
      created_at: mov?.created_at ?? nota.emitida_em ?? new Date().toISOString(),
    },
    rateio,
  }
}
