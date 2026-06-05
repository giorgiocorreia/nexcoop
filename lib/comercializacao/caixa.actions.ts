'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getUsuarioLogado } from '@/lib/auth'

export async function getSessaoAberta() {
  const usuario = await getUsuarioLogado()
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('sessoes_caixa')
    .select('*')
    .eq('organizacao_id', usuario.organizacao_id as string)
    .eq('status', 'aberta')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data
}

export async function abrirCaixa(saldo_inicial_especie: number) {
  const usuario = await getUsuarioLogado()
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('sessoes_caixa')
    .insert({
      organizacao_id: usuario.organizacao_id as string,
      usuario_id: usuario.id,
      data: new Date().toISOString().split('T')[0],
      saldo_inicial_especie,
      status: 'aberta'
    })
  if (error) throw new Error(error.message)
}

export async function fecharCaixa(sessao_id: string, saldo_final_especie: number, observacoes?: string) {
  const supabase = createAdminClient()
  const { data: movs } = await supabase
    .from('movimentacoes_conta')
    .select('tipo, valor_financeiro, forma_pagamento')
    .eq('sessao_caixa_id', sessao_id)
  const totalEspecie = (movs ?? [])
    .filter((m: any) => m.forma_pagamento === 'especie' && m.valor_financeiro)
    .reduce((acc: number, m: any) => acc + Math.abs(m.valor_financeiro), 0)
  const totalPix = (movs ?? [])
    .filter((m: any) => m.forma_pagamento === 'pix' && m.valor_financeiro)
    .reduce((acc: number, m: any) => acc + Math.abs(m.valor_financeiro), 0)
  const { error } = await supabase
    .from('sessoes_caixa')
    .update({
      hora_fechamento: new Date().toISOString(),
      saldo_final_especie,
      total_saidas_especie: totalEspecie,
      total_pix: totalPix,
      status: 'fechada',
      observacoes_fechamento: observacoes
    })
    .eq('id', sessao_id)
  if (error) throw new Error(error.message)
}

export async function buscarProdutor(termo: string) {
  const usuario = await getUsuarioLogado()
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('produtores')
    .select('id, nome, cpf, telefone, tipo, chave_pix')
    .eq('organizacao_id', usuario.organizacao_id as string)
    .eq('ativo', true)
    .or(`nome.ilike.%${termo}%,cpf.ilike.%${termo}%`)
    .limit(10)
  if (error) throw new Error(error.message)
  return data
}

export async function getContaProdutor(produtor_id: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('contas_produtor')
    .select(`
      *,
      saldos_produto(*, produtos(nome, unidade))
    `)
    .eq('produtor_id', produtor_id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

export async function getExtrato(conta_id: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('movimentacoes_conta')
    .select('*, produtos(nome, unidade)')
    .eq('conta_id', conta_id)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw new Error(error.message)
  return data
}

export async function registrarEntrega(params: {
  sessao_id: string
  produtor_id: string
  conta_id: string
  produto_id: string
  quantidade_produto: number
  observacoes?: string
}) {
  const usuario = await getUsuarioLogado()
  const supabase = createAdminClient()
  // 1. Movimentação na conta (virtual)
  const { error: e1 } = await supabase
    .from('movimentacoes_conta')
    .insert({
      organizacao_id: usuario.organizacao_id as string,
      conta_id: params.conta_id,
      usuario_id: usuario.id,
      sessao_caixa_id: params.sessao_id,
      tipo: 'entrega',
      produto_id: params.produto_id,
      quantidade_produto: params.quantidade_produto,
      observacoes: params.observacoes
    })
  if (e1) throw new Error(e1.message)
  // 2. Movimentação no estoque físico
  const { error: e2 } = await supabase
    .from('movimentacoes_estoque_fisico')
    .insert({
      organizacao_id: usuario.organizacao_id as string,
      produto_id: params.produto_id,
      tipo: 'entrada',
      quantidade: params.quantidade_produto,
      responsavel_id: usuario.id,
      referencia_tipo: 'entrega_caixa'
    })
  if (e2) throw new Error(e2.message)
}

export async function registrarConversaoESaque(params: {
  sessao_id: string
  produtor_id: string
  conta_id: string
  produto_id: string
  quantidade_produto: number
  preco_unitario: number
  valor_financeiro: number
  forma_pagamento: 'especie' | 'pix'
  chave_pix?: string
  observacoes?: string
}) {
  const usuario = await getUsuarioLogado()
  const supabase = createAdminClient()
  const base = {
    organizacao_id: usuario.organizacao_id as string,
    conta_id: params.conta_id,
    usuario_id: usuario.id,
    sessao_caixa_id: params.sessao_id,
    produto_id: params.produto_id,
    quantidade_produto: params.quantidade_produto,
    preco_unitario: params.preco_unitario,
    observacoes: params.observacoes
  }
  // 1. Conversão produto → R$
  const { error: e1 } = await supabase
    .from('movimentacoes_conta')
    .insert({ ...base, tipo: 'conversao', valor_financeiro: params.valor_financeiro })
  if (e1) throw new Error(e1.message)
  // 2. Saque
  const tipoSaque = params.forma_pagamento === 'pix' ? 'saque_pix' : 'saque_especie'
  const { error: e2 } = await supabase
    .from('movimentacoes_conta')
    .insert({
      organizacao_id: usuario.organizacao_id as string,
      conta_id: params.conta_id,
      usuario_id: usuario.id,
      sessao_caixa_id: params.sessao_id,
      tipo: tipoSaque,
      valor_financeiro: params.valor_financeiro,
      forma_pagamento: params.forma_pagamento,
      observacoes: params.chave_pix ? `Pix: ${params.chave_pix}` : params.observacoes
    })
  if (e2) throw new Error(e2.message)
  // 3. Atualizar total caixa
  const campo = params.forma_pagamento === 'pix' ? 'total_pix' : 'total_saidas_especie'
  const { data: sessao } = await supabase
    .from('sessoes_caixa')
    .select(campo)
    .eq('id', params.sessao_id)
    .single()
  if (sessao) {
    await supabase
      .from('sessoes_caixa')
      .update({ [campo]: (sessao[campo as keyof typeof sessao] as number ?? 0) + params.valor_financeiro } as any)
      .eq('id', params.sessao_id)
  }
}

export async function registrarSaqueFinanceiro(params: {
  sessao_id: string
  conta_id: string
  valor_financeiro: number
  forma_pagamento: 'especie' | 'pix'
  chave_pix?: string
  observacoes?: string
}) {
  const usuario = await getUsuarioLogado()
  const supabase = createAdminClient()
  const tipoSaque = params.forma_pagamento === 'pix' ? 'saque_pix' : 'saque_especie'
  const { error } = await supabase
    .from('movimentacoes_conta')
    .insert({
      organizacao_id: usuario.organizacao_id as string,
      conta_id: params.conta_id,
      usuario_id: usuario.id,
      sessao_caixa_id: params.sessao_id,
      tipo: tipoSaque,
      valor_financeiro: params.valor_financeiro,
      forma_pagamento: params.forma_pagamento,
      observacoes: params.chave_pix ? `Pix: ${params.chave_pix}` : params.observacoes
    })
  if (error) throw new Error(error.message)
  const campo = params.forma_pagamento === 'pix' ? 'total_pix' : 'total_saidas_especie'
  const { data: sessao } = await supabase
    .from('sessoes_caixa')
    .select(campo)
    .eq('id', params.sessao_id)
    .single()
  if (sessao) {
    await supabase
      .from('sessoes_caixa')
      .update({ [campo]: (sessao[campo as keyof typeof sessao] as number ?? 0) + params.valor_financeiro } as any)
      .eq('id', params.sessao_id)
  }
}

export async function listarSolicitacoesPendentes() {
  const usuario = await getUsuarioLogado()
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('solicitacoes_venda')
    .select('*, produtores(nome, telefone), produtos(nome, unidade), cotacoes(preco_cooperado)')
    .eq('organizacao_id', usuario.organizacao_id as string)
    .eq('status', 'pendente')
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return data
}
