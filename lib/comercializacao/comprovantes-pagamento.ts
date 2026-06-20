'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export interface DadosComprovantePagamento {
  comprovante: {
    id: string
    numero_sequencial: number
    emitido_em: string | null
    status: string
  }
  organizacao: {
    nome: string
    cnpj: string
    cidade: string
  }
  operador: {
    nome: string
  }
  produtor: {
    nome: string
    cpf: string | null
  }
  pagamento: {
    tipo: string
    valor_financeiro: number
    forma_pagamento: string | null
    observacoes: string | null
    created_at: string
    quantidade_produto: number | null
    preco_unitario: number | null
  }
  produto: {
    nome: string
    unidade: string
  } | null
  posicao: {
    saldo_financeiro_antes: number
    valor_pago: number
    saldo_financeiro_depois: number
  }
}

export async function emitirComprovantePagamento(
  movimentacao_id: string
): Promise<{ comprovante_id: string; numero: number }> {
  const admin = createAdminClient()
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuário não autenticado')

  // Idempotente: retorna o existente se já emitido
  const { data: existente } = await admin
    .from('comprovantes_pagamento')
    .select('id, numero_sequencial')
    .eq('movimentacao_id', movimentacao_id)
    .neq('status', 'cancelado')
    .maybeSingle()

  if (existente) {
    return { comprovante_id: existente.id, numero: existente.numero_sequencial }
  }

  // Busca a movimentação com joins
  const { data: mov, error: movErr } = await admin
    .from('movimentacoes_conta')
    .select(`
      id,
      tipo,
      conta_id,
      valor_financeiro,
      forma_pagamento,
      observacoes,
      quantidade_produto,
      preco_unitario,
      created_at,
      produto_id,
      contas_produtor(
        produtor_id,
        produtores(nome, cpf)
      ),
      produtos(nome, unidade),
      sessoes_caixa!sessao_caixa_id(
        organizacao_id,
        usuario_id,
        usuarios!usuario_id(nome_completo)
      )
    `)
    .eq('id', movimentacao_id)
    .single()

  if (movErr || !mov) throw new Error('Movimentação não encontrada')

  const sessaoCaixa = (mov as any).sessoes_caixa
  const organizacao_id: string = Array.isArray(sessaoCaixa)
    ? sessaoCaixa[0]?.organizacao_id
    : sessaoCaixa?.organizacao_id

  if (!organizacao_id) throw new Error('Organização não encontrada na sessão')

  // Saldo financeiro atual da conta (após a movimentação)
  const { data: conta } = await admin
    .from('contas_produtor')
    .select('saldo_financeiro')
    .eq('id', (mov as any).conta_id)
    .single()

  const saldo_depois = (conta as any)?.saldo_financeiro ?? 0
  const valor = Math.abs((mov as any).valor_financeiro ?? 0)
  const saldo_antes = saldo_depois + valor

  // Número sequencial via RPC
  const { data: numeroData, error: numErr } = await (admin as any)
    .rpc('proximo_numero_comprovante_pagamento', { p_org_id: organizacao_id })
  if (numErr) throw new Error('Erro ao gerar número sequencial: ' + numErr.message)
  const numero_sequencial = numeroData as number

  // Dados do produtor
  const contaProdutor = (mov as any).contas_produtor
  const cp = Array.isArray(contaProdutor) ? contaProdutor[0] : contaProdutor
  const produtorRaw = Array.isArray(cp?.produtores) ? cp.produtores[0] : cp?.produtores

  // Dados do produto (se a movimentação tem produto_id)
  const produtoRaw = (mov as any).produtos
  const produto = produtoRaw
    ? (Array.isArray(produtoRaw) ? produtoRaw[0] : produtoRaw)
    : null

  // Dados do operador
  const sessaoUsuarios = Array.isArray(sessaoCaixa?.usuarios)
    ? sessaoCaixa.usuarios[0]
    : sessaoCaixa?.usuarios
  const operadorNome = sessaoUsuarios?.nome_completo ?? ''

  const snapshot = {
    movimentacao_id,
    tipo: (mov as any).tipo,
    valor_financeiro: (mov as any).valor_financeiro,
    forma_pagamento: (mov as any).forma_pagamento,
    observacoes: (mov as any).observacoes,
    quantidade_produto: (mov as any).quantidade_produto,
    preco_unitario: (mov as any).preco_unitario,
    created_at: (mov as any).created_at,
    produtor_nome: produtorRaw?.nome ?? '',
    produtor_cpf: produtorRaw?.cpf ?? null,
    produto_nome: produto?.nome ?? null,
    produto_unidade: produto?.unidade ?? null,
    operador_nome: operadorNome,
    saldo_financeiro_antes: saldo_antes,
    saldo_financeiro_depois: saldo_depois,
  }

  const { data: comprovante, error: insertErr } = await admin
    .from('comprovantes_pagamento')
    .insert({
      organizacao_id,
      movimentacao_id,
      numero_sequencial,
      status: 'emitido',
      snapshot,
      emitido_por: user.id,
    })
    .select('id, numero_sequencial')
    .single()

  if (insertErr || !comprovante) throw new Error('Erro ao criar comprovante: ' + insertErr?.message)

  return { comprovante_id: comprovante.id, numero: comprovante.numero_sequencial }
}

export async function buscarDadosComprovantePagamento(
  comprovante_id: string
): Promise<DadosComprovantePagamento> {
  const admin = createAdminClient()

  const { data: comp, error } = await admin
    .from('comprovantes_pagamento')
    .select('id, numero_sequencial, emitido_em, status, snapshot, organizacao_id, emitido_por')
    .eq('id', comprovante_id)
    .single()

  if (error || !comp) throw new Error('Comprovante não encontrado')

  const snap = (comp.snapshot as any) ?? {}

  const { data: org } = await admin
    .from('organizacoes')
    .select('nome, cnpj, cidade')
    .eq('id', comp.organizacao_id)
    .single()

  if (!org) throw new Error('Organização não encontrada')

  const { data: operadorData } = comp.emitido_por
    ? await admin.from('usuarios').select('nome_completo').eq('id', comp.emitido_por).maybeSingle()
    : { data: null }

  const operadorNome: string = snap.operador_nome
    || (operadorData as any)?.nome_completo
    || ''

  return {
    comprovante: {
      id: comp.id,
      numero_sequencial: comp.numero_sequencial,
      emitido_em: comp.emitido_em,
      status: comp.status,
    },
    organizacao: {
      nome: (org as any).nome ?? '',
      cnpj: (org as any).cnpj ?? '',
      cidade: (org as any).cidade ?? '',
    },
    operador: { nome: operadorNome },
    produtor: {
      nome: snap.produtor_nome ?? '',
      cpf: snap.produtor_cpf ?? null,
    },
    pagamento: {
      tipo: snap.tipo ?? '',
      valor_financeiro: snap.valor_financeiro ?? 0,
      forma_pagamento: snap.forma_pagamento ?? null,
      observacoes: snap.observacoes ?? null,
      created_at: snap.created_at ?? comp.emitido_em ?? '',
      quantidade_produto: snap.quantidade_produto ?? null,
      preco_unitario: snap.preco_unitario ?? null,
    },
    produto: snap.produto_nome
      ? { nome: snap.produto_nome, unidade: snap.produto_unidade ?? '' }
      : null,
    posicao: {
      saldo_financeiro_antes: snap.saldo_financeiro_antes ?? 0,
      valor_pago: Math.abs(snap.valor_financeiro ?? 0),
      saldo_financeiro_depois: snap.saldo_financeiro_depois ?? 0,
    },
  }
}
