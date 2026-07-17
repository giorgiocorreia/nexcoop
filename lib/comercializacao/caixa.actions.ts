'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getUsuarioLogado } from '@/lib/auth'
import { calcularSaldoEspecieNoFechamento } from './caixa-utils'
import { getSaldoResponsabilidadeComercializacao, getSaldoResponsabilidadeLoja } from '@/lib/tesouraria/saldo-responsabilidade'

// Saldo pra pré-preencher a abertura de caixa do usuário logado — "saldo inicial = saldo final
// do caixa anterior" (continuidade entre sessões, ver plano de tesouraria).
export async function getMeuSaldoResponsabilidadeComercializacao() {
  const usuario = await getUsuarioLogado()
  return getSaldoResponsabilidadeComercializacao(usuario.organizacao_id as string, usuario.id)
}

// Wrappers pra ponte com a Loja — evitam o cliente precisar saber o orgId.
export async function listarAtendentesLojaParaTransferencia() {
  const usuario = await getUsuarioLogado()
  const { listarAtendentesComCaixaLoja } = await import('@/lib/loja/actions')
  return listarAtendentesComCaixaLoja(usuario.organizacao_id as string)
}

export async function getSaldoLojaDoAtendente(atendenteId: string) {
  const usuario = await getUsuarioLogado()
  return getSaldoResponsabilidadeLoja(usuario.organizacao_id as string, atendenteId)
}

export async function getSaldoComercializacaoDoAtendente(atendenteId: string) {
  const usuario = await getUsuarioLogado()
  return getSaldoResponsabilidadeComercializacao(usuario.organizacao_id as string, atendenteId)
}

// Lista outros atendentes com sessão na própria Comercialização (exclui o
// usuário logado — não faz sentido transferir do seu próprio caixa aberto
// pra ele mesmo). Usado na transferência "mesmo módulo, outro atendente".
export async function listarOutrosAtendentesComercializacao() {
  const usuario = await getUsuarioLogado()
  const lista = await listarAtendentesComSessaoCaixa(usuario.organizacao_id as string)
  return lista.filter(a => a.usuario_id !== usuario.id)
}

export async function getSessaoAberta() {
  const usuario = await getUsuarioLogado()
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('sessoes_caixa')
    .select('*')
    .eq('organizacao_id', usuario.organizacao_id as string)
    .eq('usuario_id', usuario.id)
    .eq('status', 'aberta')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data
}

export async function abrirCaixa(): Promise<{ success: boolean; error?: string }> {
  try {
    const usuario = await getUsuarioLogado()
    const supabase = createAdminClient()

    // Continuidade travada: o saldo inicial nunca é digitado — é sempre o
    // saldo sob responsabilidade do usuário calculado pelo sistema (herda do
    // fechamento anterior + qualquer aporte/sangria/transferência posterior).
    const resp = await getSaldoResponsabilidadeComercializacao(usuario.organizacao_id as string, usuario.id)
    const saldo_inicial_especie = resp.saldo_atual_especie

    const { data: estoqueAtual } = await supabase
      .from('estoque_fisico')
      .select('produto_id, quantidade, produtos(nome, unidade)')
      .eq('organizacao_id', usuario.organizacao_id as string)

    const snapshot = (estoqueAtual ?? []).map((e: any) => ({
      produto_id: e.produto_id,
      nome: e.produtos?.nome ?? '',
      unidade: e.produtos?.unidade ?? 'kg',
      quantidade: e.quantidade
    }))

    const { error } = await supabase
      .from('sessoes_caixa')
      .insert({
        organizacao_id: usuario.organizacao_id as string,
        usuario_id: usuario.id,
        data: new Date().toISOString().split('T')[0],
        saldo_inicial_especie,
        saldo_especie_calculado: saldo_inicial_especie,
        snapshot_estoque: snapshot,
        status: 'aberta'
      })
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message ?? 'Erro ao abrir caixa.' }
  }
}

export async function fecharCaixa(sessao_id: string, valor_contado_especie?: number, observacoes?: string) {
  const supabase = createAdminClient()
  const { data: movs } = await supabase
    .from('movimentacoes_conta')
    .select('tipo, valor_financeiro, forma_pagamento')
    .eq('sessao_caixa_id', sessao_id)
  const totalEspecieMovimentacoes = (movs ?? [])
    .filter((m: any) => m.forma_pagamento === 'especie' && m.valor_financeiro)
    .reduce((acc: number, m: any) => acc + Math.abs(m.valor_financeiro), 0)
  const totalPix = (movs ?? [])
    .filter((m: any) => m.forma_pagamento === 'pix' && m.valor_financeiro)
    .reduce((acc: number, m: any) => acc + Math.abs(m.valor_financeiro), 0)

  // Saídas avulsas de caixa (registrarSaidaAvulsa, migration 057) — gravadas em
  // `lancamentos`, não em `movimentacoes_conta`. A tabela `lancamentos` não tem
  // coluna de forma de pagamento: este fluxo é sempre "despesa operacional paga em
  // espécie" (ver modal de saída avulsa em caixa/page.tsx), então todo lançamento
  // vinculado a esta sessão entra no total de saídas em espécie. Mesmo filtro usado
  // em getFechamentoDiario (lib/comercializacao/diario.actions.ts:101-107).
  const { data: saidasAvulsas } = await supabase
    .from('lancamentos')
    .select('valor')
    .eq('sessao_caixa_id', sessao_id)
  const totalSaidasAvulsasEspecie = (saidasAvulsas ?? [])
    .reduce((acc: number, l: any) => acc + Number(l.valor ?? 0), 0)

  const totalEspecie = totalEspecieMovimentacoes + totalSaidasAvulsasEspecie

  const { data: sessaoAtual, error: sessaoError } = await supabase
    .from('sessoes_caixa')
    .select('saldo_especie_calculado')
    .eq('id', sessao_id)
    .single()
  if (sessaoError || !sessaoAtual) throw new Error(sessaoError?.message ?? 'Sessão de caixa não encontrada.')

  const saldoEspecieCalculado = calcularSaldoEspecieNoFechamento({
    saldoEspecieCalculadoAtual: Number(sessaoAtual.saldo_especie_calculado ?? 0),
    totalSaidasEspecie: totalEspecie,
  })

  // saldo_final_especie é SEMPRE o valor calculado pelo sistema — nunca mais
  // recebido do cliente. valor_contado_especie (opcional) é só um registro de
  // auditoria da contagem física do operador; nunca afeta saldo/continuidade.
  const { error } = await supabase
    .from('sessoes_caixa')
    .update({
      hora_fechamento: new Date().toISOString(),
      saldo_final_especie: saldoEspecieCalculado,
      valor_contado_especie: valor_contado_especie ?? null,
      total_saidas_especie: totalEspecie,
      total_pix: totalPix,
      saldo_especie_calculado: saldoEspecieCalculado,
      status: 'fechada',
      observacoes_fechamento: observacoes
    } as any)
    .eq('id', sessao_id)
  if (error) throw new Error(error.message)
}

export async function buscarProdutor(termo: string) {
  const usuario = await getUsuarioLogado()
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('produtores')
    .select('id, nome, cpf, telefone, tipo, chave_pix, tipo_posse, percentual_posse')
    .eq('organizacao_id', usuario.organizacao_id as string)
    .eq('ativo', true)
    .or(`nome.ilike.%${termo}%,cpf.ilike.%${termo}%`)
    .limit(10)
  if (error) throw new Error(error.message)
  return data
}

export async function getProdutorParaRateio(produtor_id: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('produtores')
    .select('id, nome, cpf, tipo_posse, percentual_posse, chave_pix')
    .eq('id', produtor_id)
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function getContaProdutor(produtor_id: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('contas_produtor')
    .select(`
      *,
      saldos_produto(*, produtos(nome, unidade)),
      produtores(nome, cpf, telefone, tipo, chave_pix)
    `)
    .eq('produtor_id', produtor_id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

// Base pro autocomplete de "Pagar produtor": TODOS os produtos catalogados,
// com o saldo atual do produtor (0 se nunca houve movimento — hoje
// saldos_produto só tem linha pra quem já movimentou, então sem isso produto
// nunca-movimentado simplesmente não aparecia como opção).
export async function getSaldosProdutoParaSelecao(conta_id: string) {
  const usuario = await getUsuarioLogado()
  const supabase = createAdminClient()
  const [{ data: produtos, error: e1 }, { data: saldos, error: e2 }] = await Promise.all([
    supabase
      .from('produtos')
      .select('id, nome, unidade')
      .eq('organizacao_id', usuario.organizacao_id as string)
      .eq('ativo', true)
      .order('nome'),
    supabase
      .from('saldos_produto')
      .select('produto_id, quantidade')
      .eq('conta_id', conta_id)
  ])
  if (e1) throw new Error(e1.message)
  if (e2) throw new Error(e2.message)
  const saldoPorProduto = new Map((saldos ?? []).map(s => [s.produto_id, s.quantidade as number]))
  return (produtos ?? []).map(p => ({
    produto_id: p.id,
    nome: p.nome,
    unidade: p.unidade,
    saldo: saldoPorProduto.get(p.id) ?? 0
  }))
}

export async function getProdutorPorId(produtor_id: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('produtores')
    .select('id, nome, cpf, telefone, tipo, chave_pix')
    .eq('id', produtor_id)
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

export async function getOperacoesHoje(sessao_id: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('movimentacoes_conta')
    .select(`
      id,
      tipo,
      quantidade_produto,
      valor_financeiro,
      preco_unitario,
      referencia_tipo,
      forma_pagamento,
      observacoes,
      created_at,
      produtos(nome, unidade, loja_produto_id),
      contas_produtor(
        produtor_id,
        produtores(nome)
      )
    `)
    .eq('sessao_caixa_id', sessao_id)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)

  // Aportes/sangrias (ex.: integralização de cota paga no cadastro do
  // cooperado, ver lib/comercializacao/aportes.ts) entram no saldo da sessão
  // mas vêm de uma tabela separada (aportes_sangrias) — sem isso, ficavam
  // visíveis só na aba "Fechar caixa" e o operador achava que o dinheiro
  // tinha sumido da lista de operações do dia.
  const { data: aportes, error: errAportes } = await supabase
    .from('aportes_sangrias')
    .select('id, tipo, valor, forma_pagamento, observacoes, created_at')
    .eq('sessao_caixa_id', sessao_id)
  if (errAportes) throw new Error(errAportes.message)

  const aportesComoOperacoes = (aportes ?? []).map(a => ({
    id: a.id,
    tipo: a.tipo, // 'aporte' | 'sangria'
    quantidade_produto: null,
    valor_financeiro: a.tipo === 'sangria' ? -Number(a.valor) : Number(a.valor),
    preco_unitario: null,
    referencia_tipo: null,
    forma_pagamento: a.forma_pagamento,
    observacoes: a.observacoes,
    created_at: a.created_at,
    produtos: null,
    contas_produtor: a.observacoes ? { produtor_id: '', produtores: { nome: a.observacoes } } : null,
  }))

  return [...(data ?? []), ...aportesComoOperacoes]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

export async function registrarEntrega(params: {
  sessao_id: string
  produtor_id: string
  conta_id: string
  produto_id: string
  quantidade_produto: number
  observacoes?: string
  // Preço de custo por unidade, opcional — para produtos que não seguem a
  // cotação diária (ex.: manufatura artesanal comprada por encomenda). Grava
  // em movimentacoes_conta.preco_unitario/valor_financeiro, que já existem na
  // tabela mas ficavam sempre vazios pra entregas (a valorização normal só
  // acontece depois, na conversão/saque pela cotação do dia).
  preco_unitario?: number
}) {
  const usuario = await getUsuarioLogado()
  const supabase = createAdminClient()
  const valorFinanceiro = params.preco_unitario
    ? Number((params.preco_unitario * params.quantidade_produto).toFixed(2))
    : null
  const { data: mov, error: e1 } = await supabase
    .from('movimentacoes_conta')
    .insert({
      organizacao_id: usuario.organizacao_id as string,
      conta_id: params.conta_id,
      usuario_id: usuario.id,
      sessao_caixa_id: params.sessao_id,
      tipo: 'entrega',
      produto_id: params.produto_id,
      quantidade_produto: params.quantidade_produto,
      observacoes: params.observacoes,
      preco_unitario: params.preco_unitario ?? null,
      valor_financeiro: valorFinanceiro,
    })
    .select('id')
    .single()
  if (e1) throw new Error(e1.message)
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
  return { id: mov!.id }
}

export type ParticipanteRateio = {
  produtor_id: string
  conta_id: string
  percentual: number
  quantidade_rateada: number
}

export async function registrarEntregaComRateio(params: {
  sessao_id: string
  produto_id: string
  quantidade_total: number
  participantes: ParticipanteRateio[]
  observacoes?: string
}) {
  const usuario = await getUsuarioLogado()
  const supabase = createAdminClient()

  const totalPercentual = params.participantes.reduce((acc, p) => acc + p.percentual, 0)
  if (Math.abs(totalPercentual - 100) > 0.01) {
    throw new Error(`Percentuais somam ${totalPercentual.toFixed(2)}%, devem somar 100%`)
  }

  for (const participante of params.participantes) {
    const { data: mov, error: eMov } = await supabase
      .from('movimentacoes_conta')
      .insert({
        organizacao_id: usuario.organizacao_id as string,
        conta_id: participante.conta_id,
        usuario_id: usuario.id,
        sessao_caixa_id: params.sessao_id,
        tipo: 'entrega',
        produto_id: params.produto_id,
        quantidade_produto: participante.quantidade_rateada,
        observacoes: params.observacoes
          ? `[Rateio ${participante.percentual}%] ${params.observacoes}`
          : `Rateio ${participante.percentual}%`
      })
      .select('id')
      .single()
    if (eMov) throw new Error(eMov.message)

    const { error: eRateio } = await supabase
      .from('rateio_entrega')
      .insert({
        organizacao_id: usuario.organizacao_id as string,
        movimentacao_id: mov.id,
        produtor_id: participante.produtor_id,
        percentual: participante.percentual,
        quantidade_rateada: participante.quantidade_rateada
      })
    if (eRateio) throw new Error(eRateio.message)
  }

  const { error: eEstoque } = await supabase
    .from('movimentacoes_estoque_fisico')
    .insert({
      organizacao_id: usuario.organizacao_id as string,
      produto_id: params.produto_id,
      tipo: 'entrada',
      quantidade: params.quantidade_total,
      responsavel_id: usuario.id,
      referencia_tipo: 'entrega_caixa'
    })
  if (eEstoque) throw new Error(eEstoque.message)
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
  const { data: cotacao } = await supabase
    .from('cotacoes')
    .select('id')
    .eq('organizacao_id', usuario.organizacao_id as string)
    .eq('produto_id', params.produto_id)
    .lte('vigente_a_partir_de', new Date().toISOString())
    .order('vigente_a_partir_de', { ascending: false })
    .limit(1)
    .maybeSingle()
  const cotacaoId = cotacao?.id ?? null

  const { error: e1 } = await supabase
    .from('movimentacoes_conta')
    .insert({ ...base, tipo: 'conversao', valor_financeiro: params.valor_financeiro, cotacao_id: cotacaoId })
  if (e1) throw new Error(e1.message)
  const tipoSaque = params.forma_pagamento === 'pix' ? 'saque_pix' : 'saque_especie'
  const { data: saqueData, error: e2 } = await supabase
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
    .select('id')
    .single()
  if (e2) throw new Error(e2.message)
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
  try {
    const { criarLancamento } = await import('@/lib/financeiro/actions')
    const tipoPagto = params.forma_pagamento === 'pix' ? 'PIX' : 'Espécie'
    await criarLancamento({
      organizacao_id: usuario.organizacao_id!,
      tipo: 'despesa' as any,
      status: 'pago' as any,
      descricao: `Saque produtor — ${tipoPagto}`,
      valor: Number(params.valor_financeiro),
      data_competencia: new Date().toISOString().split('T')[0],
      data_pagamento: new Date().toISOString().split('T')[0],
      observacoes: params.chave_pix ? `Pix: ${params.chave_pix}` : (params.observacoes ?? 'Conversão de produto e saque'),
      usuario_id: usuario.id,
      usuario_email: usuario.email ?? undefined,
    })
  } catch (e) {
    console.error('[contabil] Erro ao criar lançamento saque produtor:', e)
  }
  return { saque_id: saqueData!.id as string }
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

  const { data: conta } = await supabase
    .from('contas_produtor')
    .select('saldo_financeiro')
    .eq('id', params.conta_id)
    .single()
  const saldoAtual = (conta?.saldo_financeiro as number) ?? 0
  if (params.valor_financeiro > saldoAtual) {
    throw new Error(
      `Saldo insuficiente: conta tem R$ ${saldoAtual.toFixed(2)}, saque de R$ ${params.valor_financeiro.toFixed(2)} solicitado.`
    )
  }

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

// Cascata do "saque financeiro": cobre o que der do saldo em R$ (nunca deixa
// negativar) e converte o restante em produto (venda antecipada — pode
// deixar saldos_produto negativo, essa parte é permitida e liquida sozinha
// quando o produtor entregar). Reusa as duas primitivas já existentes em vez
// de duplicar a lógica de inserção nas movimentações.
export async function registrarSaquePorValor(params: {
  sessao_id: string
  produtor_id: string
  conta_id: string
  valor_total: number
  forma_pagamento: 'especie' | 'pix'
  chave_pix?: string
  produto_id?: string
  preco_unitario?: number
  observacoes?: string
}): Promise<{
  usou_saldo: number
  converteu_produto: number
  quantidade_produto: number
  valor_total_processado: number
}> {
  const supabase = createAdminClient()
  const { data: conta } = await supabase
    .from('contas_produtor')
    .select('saldo_financeiro')
    .eq('id', params.conta_id)
    .single()
  const saldoAtual = (conta?.saldo_financeiro as number) ?? 0

  const usarDoSaldo = Math.min(params.valor_total, Math.max(saldoAtual, 0))
  const restante = Number((params.valor_total - usarDoSaldo).toFixed(2))

  if (restante > 0 && (!params.produto_id || !params.preco_unitario)) {
    throw new Error('Saldo em conta insuficiente: informe produto e preço para converter o restante (venda antecipada).')
  }

  if (usarDoSaldo > 0) {
    await registrarSaqueFinanceiro({
      sessao_id: params.sessao_id,
      conta_id: params.conta_id,
      valor_financeiro: usarDoSaldo,
      forma_pagamento: params.forma_pagamento,
      chave_pix: params.chave_pix,
      observacoes: params.observacoes
    })
  }

  let quantidadeProduto = 0
  if (restante > 0) {
    quantidadeProduto = Number((restante / params.preco_unitario!).toFixed(3))
    await registrarConversaoESaque({
      sessao_id: params.sessao_id,
      produtor_id: params.produtor_id,
      conta_id: params.conta_id,
      produto_id: params.produto_id!,
      quantidade_produto: quantidadeProduto,
      preco_unitario: params.preco_unitario!,
      valor_financeiro: restante,
      forma_pagamento: params.forma_pagamento,
      chave_pix: params.chave_pix,
      observacoes: params.observacoes
    })
  }

  return {
    usou_saldo: usarDoSaldo,
    converteu_produto: restante,
    quantidade_produto: quantidadeProduto,
    valor_total_processado: usarDoSaldo + restante
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

export async function listarCategoriasDesp() {
  const usuario = await getUsuarioLogado()
  const supabase = createAdminClient()
  const { data, error } = await (supabase as any)
    .from('financeiro_categorias')
    .select('id, nome, grupo')
    .eq('organizacao_id', usuario.organizacao_id as string)
    .eq('tipo', 'despesa')
    .eq('ativo', true)
    .order('nome')
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function criarCategoriaDesp(
  nome: string,
  grupo?: string
): Promise<{ id: string; nome: string; grupo: string | null }> {
  const usuario = await getUsuarioLogado()
  const supabase = createAdminClient()
  const { data, error } = await (supabase as any)
    .from('financeiro_categorias')
    .insert({
      organizacao_id: usuario.organizacao_id,
      nome: nome.trim(),
      grupo: grupo?.trim() || null,
      tipo: 'despesa',
      ativo: true,
    })
    .select('id, nome, grupo')
    .single()
  if (error) throw new Error(error.message)
  return data as { id: string; nome: string; grupo: string | null }
}

export async function registrarSaidaAvulsa(params: {
  sessao_id: string
  descricao: string
  valor: number
  data_competencia: string
  categoria_id?: string
  numero_documento?: string
  centro_custo?: string
  observacoes?: string
  comprovante_url?: string
}): Promise<{ lancamento_id: string }> {
  const usuario = await getUsuarioLogado()
  const supabase = createAdminClient()

  const { criarLancamento } = await import('@/lib/financeiro/actions')
  const lancamento = await criarLancamento({
    organizacao_id: usuario.organizacao_id!,
    tipo: 'despesa' as any,
    status: 'pago' as any,
    descricao: params.descricao,
    valor: params.valor,
    data_competencia: params.data_competencia,
    data_pagamento: params.data_competencia,
    numero_documento: params.numero_documento ?? null,
    observacoes: params.observacoes ?? null,
    usuario_id: usuario.id,
    usuario_email: usuario.email ?? undefined,
  })

  // Sempre atualiza sessao_caixa_id (migration 057) + campos opcionais
  await supabase
    .from('lancamentos')
    .update({
      sessao_caixa_id: params.sessao_id,
      ...(params.categoria_id    ? { categoria_id:    params.categoria_id }    : {}),
      ...(params.centro_custo    ? { centro_custo:    params.centro_custo }    : {}),
      ...(params.comprovante_url ? { comprovante_url: params.comprovante_url } : {}),
    })
    .eq('id', lancamento.id)

  const { data: sessao } = await supabase
    .from('sessoes_caixa')
    .select('total_saidas_especie')
    .eq('id', params.sessao_id)
    .single()

  await supabase
    .from('sessoes_caixa')
    .update({ total_saidas_especie: (sessao?.total_saidas_especie ?? 0) + params.valor })
    .eq('id', params.sessao_id)

  return { lancamento_id: lancamento.id }
}

export async function listarAdminsDaOrg() {
  const usuario = await getUsuarioLogado()
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('usuarios')
    .select('id, nome_completo, email')
    .eq('organizacao_id', usuario.organizacao_id as string)
    .contains('funcoes', ['admin'])
    .eq('ativo', true)
    .order('nome_completo')
  if (error) throw new Error(error.message)
  return data
}

export async function getAportesESangriasDaSessao(sessao_id: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('aportes_sangrias')
    .select('*, autorizador:autorizado_por(nome_completo), executor:executado_por(nome_completo)')
    .eq('sessao_caixa_id', sessao_id)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return data
}

export async function registrarAporteSangria(params: {
  sessao_id: string
  tipo: 'aporte' | 'sangria'
  valor: number
  admin_email: string
  admin_senha: string
  observacoes?: string
  // Transferência: em vez de aporte em dinheiro solto, puxa de um caixa da
  // Loja OU de outra sessão da própria Comercialização (outro atendente) —
  // do próprio usuário logado ou de outro atendente, ver regra de autorização
  // abaixo. Só válido com tipo='aporte'.
  origem?: { modulo: 'loja' | 'comercializacao'; atendente_origem_id: string }
}) {
  const usuario = await getUsuarioLogado()
  const supabase = createAdminClient()

  const { createClient } = await import('@supabase/supabase-js')
  const supabasePublic = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: authData, error: authError } = await supabasePublic.auth.signInWithPassword({
    email: params.admin_email,
    password: params.admin_senha
  })
  if (authError || !authData.user) throw new Error('Credenciais inválidas.')

  const { data: adminUser } = await supabase
    .from('usuarios')
    .select('id, funcoes, organizacao_id')
    .eq('id', authData.user.id)
    .single()

  if (!adminUser) throw new Error('Usuário não encontrado.')
  if (adminUser.organizacao_id !== usuario.organizacao_id) throw new Error('Admin de outra organização.')

  if (params.origem) {
    if (params.origem.modulo === 'comercializacao' && params.origem.atendente_origem_id === usuario.id) {
      throw new Error('Não é possível transferir do seu próprio caixa da Comercialização pra ele mesmo.')
    }
    // Transferência entre caixas: se o dono da origem é o próprio usuário
    // logado (só possível no caso cross-módulo, Loja → Comercialização), a
    // senha dele mesmo já basta — é dinheiro sob responsabilidade dele pra
    // ele mesmo. Se for de outro atendente, só admin ou a senha do próprio
    // dono da origem autorizam — nunca um terceiro qualquer.
    const isMesmoUsuario = params.origem.atendente_origem_id === usuario.id
    if (isMesmoUsuario) {
      if (adminUser.id !== usuario.id) {
        throw new Error('Pra transferir do seu próprio caixa da Loja, confirme com a sua própria senha.')
      }
    } else {
      const isAdmin = !!adminUser.funcoes?.includes('admin')
      const isDonoOrigem = adminUser.id === params.origem.atendente_origem_id
      if (!isAdmin && !isDonoOrigem) {
        throw new Error('Autorização precisa ser de um admin ou do próprio atendente dono do caixa de origem.')
      }
    }
  } else {
    if (!adminUser.funcoes?.includes('admin')) throw new Error('Usuário não tem permissão de admin.')
  }

  let referenciaTransferenciaId: string | null = null

  if (params.origem && params.tipo === 'aporte' && params.origem.modulo === 'loja') {
    const { getSaldoResponsabilidadeLoja } = await import('@/lib/tesouraria/saldo-responsabilidade')
    const saldoOrigem = await getSaldoResponsabilidadeLoja(
      usuario.organizacao_id as string,
      params.origem.atendente_origem_id
    )
    if (!saldoOrigem.caixa_id) {
      throw new Error('Esse atendente não tem caixa aberto nem fechado na Loja.')
    }
    if (saldoOrigem.saldo_atual_especie < params.valor) {
      throw new Error(`Saldo insuficiente no caixa da Loja desse atendente (disponível: R$ ${saldoOrigem.saldo_atual_especie.toFixed(2)}).`)
    }

    referenciaTransferenciaId = crypto.randomUUID()

    const { error: errSangriaLoja } = await (supabase as any)
      .from('loja_sangrias')
      .insert({
        org_id: usuario.organizacao_id as string,
        caixa_id: saldoOrigem.caixa_id,
        tipo: 'sangria',
        valor: params.valor,
        autorizado_por: adminUser.id,
        executado_por: usuario.id,
        observacoes: params.observacoes ?? 'Transferência para o caixa da Comercialização',
        origem_transferencia: 'comercializacao',
        referencia_transferencia_id: referenciaTransferenciaId,
      })
    if (errSangriaLoja) throw new Error('Erro ao debitar o caixa da Loja: ' + errSangriaLoja.message)
  } else if (params.origem && params.tipo === 'aporte' && params.origem.modulo === 'comercializacao') {
    // Mesmo módulo: puxa de outra sessão de Comercialização (outro atendente).
    const saldoOrigem = await getSaldoResponsabilidadeComercializacao(
      usuario.organizacao_id as string,
      params.origem.atendente_origem_id
    )
    if (!saldoOrigem.sessao_id) {
      throw new Error('Esse atendente não tem caixa aberto nem fechado na Comercialização.')
    }
    if (saldoOrigem.saldo_atual_especie < params.valor) {
      throw new Error(`Saldo insuficiente no caixa desse atendente (disponível: R$ ${saldoOrigem.saldo_atual_especie.toFixed(2)}).`)
    }

    referenciaTransferenciaId = crypto.randomUUID()

    const { error: errSangriaOutraSessao } = await supabase
      .from('aportes_sangrias')
      .insert({
        organizacao_id: usuario.organizacao_id as string,
        sessao_caixa_id: saldoOrigem.sessao_id,
        tipo: 'sangria',
        valor: params.valor,
        autorizado_por: adminUser.id,
        executado_por: usuario.id,
        observacoes: params.observacoes ?? 'Transferência entre atendentes da Comercialização',
        origem_transferencia: 'comercializacao',
        referencia_transferencia_id: referenciaTransferenciaId,
      } as any)
    if (errSangriaOutraSessao) throw new Error('Erro ao debitar o caixa do outro atendente: ' + errSangriaOutraSessao.message)

    // Se a sessão de origem estiver aberta, decrementa seu saldo_especie_calculado
    // (mesmo comportamento que já existe pra sangria normal). Sessão fechada não
    // é tocada — a leitura de saldo por responsabilidade já soma essa sangria.
    if (saldoOrigem.status_sessao === 'aberta') {
      const { data: sessaoOrigemAtual } = await supabase
        .from('sessoes_caixa')
        .select('saldo_especie_calculado')
        .eq('id', saldoOrigem.sessao_id)
        .single()
      if (sessaoOrigemAtual) {
        await supabase
          .from('sessoes_caixa')
          .update({ saldo_especie_calculado: (sessaoOrigemAtual.saldo_especie_calculado ?? 0) - params.valor })
          .eq('id', saldoOrigem.sessao_id)
      }
    }
  }

  const { error: insertError } = await supabase
    .from('aportes_sangrias')
    .insert({
      organizacao_id: usuario.organizacao_id as string,
      sessao_caixa_id: params.sessao_id,
      tipo: params.tipo,
      valor: params.valor,
      autorizado_por: adminUser.id,
      executado_por: usuario.id,
      observacoes: params.observacoes,
      ...(referenciaTransferenciaId
        ? { origem_transferencia: params.origem?.modulo, referencia_transferencia_id: referenciaTransferenciaId }
        : {}),
    } as any)
  if (insertError) {
    // Rollback manual: se a ponta de entrada falhar depois da saída já ter sido
    // debitada da origem, desfaz a sangria pra não perder dinheiro "no ar".
    if (referenciaTransferenciaId) {
      if (params.origem?.modulo === 'loja') {
        await (supabase as any).from('loja_sangrias').delete().eq('referencia_transferencia_id', referenciaTransferenciaId)
      } else if (params.origem?.modulo === 'comercializacao') {
        await supabase.from('aportes_sangrias').delete().eq('referencia_transferencia_id', referenciaTransferenciaId)
      }
    }
    throw new Error(insertError.message)
  }

  const { data: sessao } = await supabase
    .from('sessoes_caixa')
    .select('saldo_especie_calculado')
    .eq('id', params.sessao_id)
    .single()

  if (sessao) {
    const novoSaldo = params.tipo === 'aporte'
      ? (sessao.saldo_especie_calculado ?? 0) + params.valor
      : (sessao.saldo_especie_calculado ?? 0) - params.valor

    await supabase
      .from('sessoes_caixa')
      .update({ saldo_especie_calculado: novoSaldo })
      .eq('id', params.sessao_id)
  }
}

// Lista, por usuário da org, o caixa aberto (se houver) ou o fechado mais
// recente — popula o seletor "de qual atendente" na transferência da Loja
// pra Comercialização.
export async function listarAtendentesComSessaoCaixa(orgId: string) {
  const supabase = createAdminClient()
  const { data: sessoes } = await supabase
    .from('sessoes_caixa')
    .select('id, usuario_id, status, usuarios!sessoes_caixa_usuario_id_fkey(nome_completo)')
    .eq('organizacao_id', orgId)
    .order('created_at', { ascending: false })

  const porUsuario = new Map<string, { usuario_id: string; nome: string; sessao_id: string; status: 'aberta' | 'fechada' }>()
  for (const s of sessoes ?? []) {
    if (porUsuario.has(s.usuario_id)) continue
    const nome = (s as any).usuarios?.nome_completo ?? '—'
    porUsuario.set(s.usuario_id, {
      usuario_id: s.usuario_id,
      nome,
      sessao_id: s.id,
      status: s.status === 'aberta' ? 'aberta' : 'fechada',
    })
  }
  return Array.from(porUsuario.values())
}