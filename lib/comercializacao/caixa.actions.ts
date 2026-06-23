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

export async function abrirCaixa(
  saldo_inicial_especie: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const usuario = await getUsuarioLogado()
    const supabase = createAdminClient()

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
      forma_pagamento,
      observacoes,
      created_at,
      produtos(nome, unidade),
      contas_produtor(
        produtor_id,
        produtores(nome)
      )
    `)
    .eq('sessao_caixa_id', sessao_id)
    .order('created_at', { ascending: false })
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
      observacoes: params.observacoes
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
  const { error: e1 } = await supabase
    .from('movimentacoes_conta')
    .insert({ ...base, tipo: 'conversao', valor_financeiro: params.valor_financeiro })
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
  if (!adminUser.funcoes?.includes('admin')) throw new Error('Usuário não tem permissão de admin.')

  const { error: insertError } = await supabase
    .from('aportes_sangrias')
    .insert({
      organizacao_id: usuario.organizacao_id as string,
      sessao_caixa_id: params.sessao_id,
      tipo: params.tipo,
      valor: params.valor,
      autorizado_por: adminUser.id,
      executado_por: usuario.id,
      observacoes: params.observacoes
    })
  if (insertError) throw new Error(insertError.message)

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