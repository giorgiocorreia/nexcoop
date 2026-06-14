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
    telefone: string
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
  saldo_atual: number
  saldo_anterior: number
  cotacao_atual: number
  estimativa_valor: number
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
    .select('nome, cnpj, logradouro, bairro, cidade, estado, telefone')
    .eq('id', nota.organizacao_id)
    .single()

  if (!org) {
    console.error('[buscarDadosComprovante] org error:', orgErr?.message, 'nota.organizacao_id:', nota.organizacao_id)
    throw new Error('Organização não encontrada: ' + orgErr?.message)
  }

  const { data: operador } = nota.emitida_por
    ? await adminClient.from('usuarios').select('nome_completo').eq('id', nota.emitida_por).maybeSingle()
    : { data: null }

  const { data: mov, error: movErr } = await adminClient
    .from('movimentacoes_conta')
    .select(`
      id,
      conta_id,
      produto_id,
      quantidade_produto,
      observacoes,
      created_at,
      contas_produtor!inner(
        produtor_id,
        produtores!inner(nome, cpf, municipio, cooperado_id)
      ),
      produtos!inner(nome, unidade)
    `)
    .eq('id', nota.movimentacao_id)
    .single()

  if (movErr) console.error('[buscarDadosComprovante] mov error:', movErr?.message, 'movimentacao_id:', nota.movimentacao_id)

  const contaProdutor = (mov as any)?.contas_produtor
  const produtorData = Array.isArray(contaProdutor)
    ? contaProdutor[0]?.produtores
    : contaProdutor?.produtores
  const produtorFinal = Array.isArray(produtorData) ? produtorData[0] : produtorData
  const produtoData = (mov as any)?.produtos
  const produtoFinal = Array.isArray(produtoData) ? produtoData[0] : produtoData

  // Saldo atual do produtor para este produto
  const contaId = (mov as any)?.conta_id as string | null
  const produtoId = (mov as any)?.produto_id as string | null
  let saldo_atual = 0
  if (contaId && produtoId) {
    const { data: saldoProd } = await adminClient
      .from('saldos_produto')
      .select('quantidade')
      .eq('conta_id', contaId)
      .eq('produto_id', produtoId)
      .maybeSingle()
    saldo_atual = Number((saldoProd as any)?.quantidade ?? 0)
  }
  const quantidade_entrega = mov?.quantidade_produto ?? 0
  const saldo_anterior = Math.max(0, saldo_atual - quantidade_entrega)

  // Cotação vigente
  const isCooperado = !!(produtorFinal as any)?.cooperado_id
  let cotacao_atual = 0
  if (produtoId) {
    const { data: cotacao } = await adminClient
      .from('cotacoes')
      .select('preco_cooperado, preco_externo')
      .eq('organizacao_id', nota.organizacao_id)
      .eq('produto_id', produtoId)
      .order('data', { ascending: false })
      .limit(1)
      .maybeSingle()
    cotacao_atual = isCooperado
      ? Number((cotacao as any)?.preco_cooperado ?? 0)
      : Number((cotacao as any)?.preco_externo ?? 0)
  }
  const estimativa_valor = saldo_atual * cotacao_atual

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

  const enderecoOrg = [
    [(org as any).logradouro, (org as any).bairro].filter(Boolean).join(', '),
    [(org as any).cidade, (org as any).estado].filter(Boolean).join('/'),
  ].filter(Boolean).join(' — ')

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
      endereco: enderecoOrg,
      telefone: (org as any).telefone ?? '',
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
    saldo_atual,
    saldo_anterior,
    cotacao_atual,
    estimativa_valor,
  }
}
