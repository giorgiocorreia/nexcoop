'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getUsuarioLogado } from '@/lib/auth'

export async function listarDistribuicoes() {
  const usuario = await getUsuarioLogado()
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('distribuicao_resultado')
    .select('*, vendas_externas(data_venda, valor_liquido, lotes(codigo), compradores(nome)), produtores(nome)')
    .eq('organizacao_id', usuario.organizacao_id as string)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data
}

export async function listarDistribuicaoPorVenda(venda_id: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('distribuicao_resultado')
    .select('*, produtores(nome, chave_pix, telefone)')
    .eq('venda_externa_id', venda_id)
    .order('valor_liquido', { ascending: false })
  if (error) throw new Error(error.message)
  return data
}

export async function calcularDistribuicao(venda_id: string) {
  const usuario = await getUsuarioLogado()
  const supabase = createAdminClient()

  // 1. Buscar venda
  const { data: venda, error: e1 } = await supabase
    .from('vendas_externas')
    .select('*')
    .eq('id', venda_id)
    .single()
  if (e1 || !venda) throw new Error('Venda não encontrada')
  if (!venda.valor_liquido) throw new Error('Venda sem valor líquido calculado')

  // 2. Buscar movimentações de entrega por conta, filtrando pelo lote da venda
  const lote_id = (venda as any).lote_id as string | null
  const entregasBase = supabase
    .from('movimentacoes_conta')
    .select(`
      conta_id,
      quantidade_produto,
      contas_produtor!inner(produtor_id, organizacao_id)
    `)
    .eq('organizacao_id', usuario.organizacao_id as string)
    .eq('tipo', 'entrega')
  const { data: entregas, error: e3 } = await (
    lote_id ? entregasBase.eq('lote_id', lote_id) : entregasBase
  )
  if (e3) throw new Error(e3.message)

  // 4. Agrupar por produtor
  const totaisPorConta: Record<string, { conta_id: string; produtor_id: string; total: number }> = {}
  for (const m of (entregas ?? [])) {
    const conta = m as any
    const cid = conta.conta_id
    const pid = conta.contas_produtor?.produtor_id
    if (!cid || !pid) continue
    if (!totaisPorConta[cid]) totaisPorConta[cid] = { conta_id: cid, produtor_id: pid, total: 0 }
    totaisPorConta[cid].total += Number(conta.quantidade_produto ?? 0)
  }

  const lista = Object.values(totaisPorConta).filter(x => x.total > 0)
  const totalGeral = lista.reduce((acc, x) => acc + x.total, 0)
  if (totalGeral === 0) throw new Error('Nenhuma entrega encontrada para calcular distribuição')

  // 5. Deletar distribuição anterior desta venda se existir
  await supabase
    .from('distribuicao_resultado')
    .delete()
    .eq('venda_externa_id', venda_id)
    .eq('status', 'calculado')

  // 6. Inserir nova distribuição
  const linhas = lista.map(x => ({
    organizacao_id: usuario.organizacao_id as string,
    venda_externa_id: venda_id,
    produtor_id: x.produtor_id,
    conta_id: x.conta_id,
    quantidade_kg: x.total,
    percentual: parseFloat(((x.total / totalGeral) * 100).toFixed(4)),
    valor_bruto: parseFloat((venda.valor_liquido! * (x.total / totalGeral)).toFixed(2)),
    valor_liquido: parseFloat((venda.valor_liquido! * (x.total / totalGeral)).toFixed(2)),
    status: 'calculado' as const
  }))

  const { error: e4 } = await supabase
    .from('distribuicao_resultado')
    .insert(linhas)
  if (e4) throw new Error(e4.message)

  return linhas.length
}

export async function pagarDistribuicao(id: string) {
  const usuario = await getUsuarioLogado()
  const supabase = createAdminClient()

  // 1. Buscar linha
  const { data: linha, error: e1 } = await supabase
    .from('distribuicao_resultado')
    .select('*, produtores(nome, cooperado_id)')
    .eq('id', id)
    .single()
  if (e1 || !linha) throw new Error('Distribuição não encontrada')

  // 2. Criar movimentação de crédito na conta do produtor
  const { data: mov, error: e2 } = await supabase
    .from('movimentacoes_conta')
    .insert({
      organizacao_id: usuario.organizacao_id as string,
      conta_id: linha.conta_id,
      usuario_id: usuario.id,
      tipo: 'ajuste_financeiro',
      valor_financeiro: linha.valor_liquido,
      referencia_id: linha.venda_externa_id,
      referencia_tipo: 'distribuicao_resultado',
      observacoes: 'Distribuição de resultado de venda'
    })
    .select('id')
    .single()
  if (e2) throw new Error(e2.message)

  // 3. Atualizar status
  const { error: e3 } = await supabase
    .from('distribuicao_resultado')
    .update({
      status: 'pago',
      data_pagamento: new Date().toISOString().split('T')[0],
      movimentacao_id: mov.id
    })
    .eq('id', id)
  if (e3) throw new Error(e3.message)

  try {
    const { criarLancamento } = await import('@/lib/financeiro/actions')
    const produtorInfo = (linha as any).produtores
    const nomeProdutor = produtorInfo?.nome ?? linha.produtor_id

    const lancamento = await criarLancamento({
      organizacao_id: usuario.organizacao_id!,
      tipo: 'despesa' as any,
      status: 'pago' as any,
      descricao: `Pagamento produtor — ${nomeProdutor} — Venda ${linha.venda_externa_id.slice(0, 8)}`,
      valor: Number(linha.valor_liquido),
      data_competencia: new Date().toISOString().split('T')[0],
      data_pagamento: new Date().toISOString().split('T')[0],
      cooperado_id: produtorInfo?.cooperado_id ?? null,
      observacoes: `Distribuição resultado venda externa`,
      usuario_id: usuario.id,
      usuario_email: usuario.email ?? undefined,
    })

    await supabase
      .from('distribuicao_resultado')
      .update({ lancamento_id: lancamento.id } as any)
      .eq('id', id)
  } catch (e) {
    console.error('[contabil] Erro ao criar lançamento distribuição:', e)
  }
}

export async function listarVendasPagas() {
  const usuario = await getUsuarioLogado()
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('vendas_externas')
    .select('id, data_venda, valor_liquido, lotes(codigo), compradores(nome)')
    .eq('organizacao_id', usuario.organizacao_id as string)
    .in('status', ['paga', 'entregue', 'confirmada'])
    .order('data_venda', { ascending: false })
  if (error) throw new Error(error.message)
  return data
}
