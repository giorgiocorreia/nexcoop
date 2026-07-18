'use server'

import { createClient } from '@/lib/supabase/server'
import { getResumoPagamentosMes } from './saidas-caixa'

export async function getDashboardComercializacao(organizacaoId: string) {
  const supabase = await createClient()
  // "hoje" no fuso de Brasília (UTC-3): dia começa às 03:00 UTC
  const agora = new Date()
  const inicioDiaBrasilia = new Date(agora)
  inicioDiaBrasilia.setUTCHours(3, 0, 0, 0)
  if (agora.getUTCHours() < 3) {
    inicioDiaBrasilia.setUTCDate(inicioDiaBrasilia.getUTCDate() - 1)
  }
  const fimDiaBrasilia = new Date(inicioDiaBrasilia)
  fimDiaBrasilia.setUTCDate(fimDiaBrasilia.getUTCDate() + 1)
  const inicioHoje = inicioDiaBrasilia.toISOString()
  const fimHoje = fimDiaBrasilia.toISOString()

  // Usuário logado e funções
  const { data: { user } } = await supabase.auth.getUser()
  const { data: usuarioLogado } = await supabase
    .from('usuarios')
    .select('id, funcoes')
    .eq('id', user?.id ?? '')
    .maybeSingle()

  const isAdmin = ((usuarioLogado?.funcoes as string[] | null) ?? []).includes('admin')
  const usuarioId = usuarioLogado?.id ?? ''

  // Admin vê todas as sessões abertas; atendente vê só a própria
  let queryBase = supabase
    .from('sessoes_caixa')
    .select(`
      id,
      created_at,
      saldo_inicial_especie,
      saldo_especie_calculado,
      total_saidas_especie,
      usuario_id,
      usuarios!sessoes_caixa_usuario_id_fkey(nome_completo)
    `)
    .eq('organizacao_id', organizacaoId)
    .eq('status', 'aberta')
    .order('created_at', { ascending: false })

  if (!isAdmin) {
    queryBase = queryBase.eq('usuario_id', usuarioId) as typeof queryBase
  }

  const { data: sessoesRaw } = await queryBase

  // Aportes e sangrias por sessão
  const sessoesComMovimentos: {
    id: string
    operador: string
    abertura: string
    saldoCalculado: number
    aportes: number
    sangrias: number
  }[] = []

  for (const sessao of sessoesRaw ?? []) {
    const { data: movimentos } = await supabase
      .from('aportes_sangrias')
      .select('tipo, valor')
      .eq('sessao_caixa_id', sessao.id)

    let aportes = 0
    let sangrias = 0
    for (const m of movimentos ?? []) {
      if (m.tipo === 'aporte') aportes += Number(m.valor)
      else sangrias += Number(m.valor)
    }

    const saldoInicial = Number((sessao as any).saldo_inicial_especie ?? 0)
    const totalSaidas = Number((sessao as any).total_saidas_especie ?? 0)
    sessoesComMovimentos.push({
      id: sessao.id,
      operador: (sessao.usuarios as any)?.nome_completo ?? '—',
      abertura: sessao.created_at as string,
      saldoCalculado: saldoInicial + aportes - sangrias - totalSaidas,
      aportes,
      sangrias,
    })
  }

  // Sessão do próprio usuário (para botão de solicitar aporte)
  const minhaSessao = sessoesComMovimentos.find((_, i) =>
    (sessoesRaw ?? [])[i]?.usuario_id === usuarioId
  ) ?? null

  let entregasHoje: { count: number; totalKg: number } = { count: 0, totalKg: 0 }
  let produtoresHoje = 0
  let entregasSemana: { dia: string; totalKg: number }[] = []
  let ultimasEntregas: {
    produtor: string
    produto: string
    kg: number
    valor: number
    horario: string
  }[] = []

  try {
    const { data: movsHoje } = await supabase
      .from('movimentacoes_conta')
      .select('quantidade_produto, created_at, contas_produtor!inner(produtor_id)')
      .eq('organizacao_id', organizacaoId)
      .eq('tipo', 'entrega')
      .gte('created_at', inicioHoje)
      .lt('created_at', fimHoje)

    if (movsHoje) {
      entregasHoje = {
        count: movsHoje.length,
        totalKg: movsHoje.reduce((s, m) => s + Number(m.quantidade_produto ?? 0), 0),
      }
      produtoresHoje = new Set(movsHoje.map((m: any) => m.contas_produtor?.produtor_id)).size
    }

    const diasAtras7 = new Date(inicioDiaBrasilia)
    diasAtras7.setUTCDate(diasAtras7.getUTCDate() - 6)

    const { data: movsSemana } = await supabase
      .from('movimentacoes_conta')
      .select('quantidade_produto, created_at')
      .eq('organizacao_id', organizacaoId)
      .eq('tipo', 'entrega')
      .gte('created_at', diasAtras7.toISOString())

    if (movsSemana) {
      const mapa: Record<string, number> = {}
      for (let i = 0; i < 7; i++) {
        const d = new Date(diasAtras7)
        d.setUTCDate(d.getUTCDate() + i)
        mapa[d.toISOString().slice(0, 10)] = 0
      }
      for (const m of movsSemana) {
        const dtUTC = new Date(m.created_at ?? Date.now())
        const dtBrasilia = new Date(dtUTC.getTime() - 3 * 60 * 60 * 1000)
        const key = dtBrasilia.toISOString().slice(0, 10)
        if (key in mapa) mapa[key] += Number(m.quantidade_produto ?? 0)
      }
      entregasSemana = Object.entries(mapa).map(([dia, totalKg]) => ({ dia, totalKg }))
    }

    const { data: ultimas } = await supabase
      .from('movimentacoes_conta')
      .select(`
        quantidade_produto,
        valor_financeiro,
        created_at,
        produtos(nome),
        contas_produtor!inner(produtores(nome))
      `)
      .eq('organizacao_id', organizacaoId)
      .eq('tipo', 'entrega')
      .order('created_at', { ascending: false })
      .limit(5)

    if (ultimas) {
      ultimasEntregas = ultimas.map((m: any) => ({
        produtor: m.contas_produtor?.produtores?.nome ?? '—',
        produto: m.produtos?.nome ?? '—',
        kg: Number(m.quantidade_produto ?? 0),
        valor: Number(m.valor_financeiro ?? 0),
        horario: new Date(m.created_at ?? Date.now()).toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      }))
    }
  } catch {
    // silencioso
  }

  // Total pago a produtores no mês corrente (saques em espécie/Pix no caixa —
  // ver critério completo em saidas-caixa.ts) para o KPI clicável do
  // dashboard, que leva ao relatório de Saídas de Caixa (mais abrangente).
  let pagamentosProdutoresMes = { total: 0, totalEspecie: 0, totalPix: 0, count: 0 }
  try {
    // Mês/ano com base em inicioDiaBrasilia (já calculado acima) — evita virar
    // o mês antes da hora perto da meia-noite UTC.
    pagamentosProdutoresMes = await getResumoPagamentosMes(
      organizacaoId,
      inicioDiaBrasilia.getUTCMonth() + 1,
      inicioDiaBrasilia.getUTCFullYear()
    )
  } catch {
    // silencioso
  }

  const { count: totalProdutores } = await supabase
    .from('cooperados')
    .select('id', { count: 'exact', head: true })
    .eq('organizacao_id', organizacaoId)

  let lotesAbertos = 0
  try {
    const { count } = await supabase
      .from('lotes')
      .select('id', { count: 'exact', head: true })
      .eq('organizacao_id', organizacaoId)
      .in('status', ['aberto', 'em_venda', 'entregue'])
    lotesAbertos = count ?? 0
  } catch {
    // silencioso
  }

  // Solicitações de aporte pendentes — só para admin
  let solicitacoesPendentes: { id: string; valor: number; motivo: string | null; operador: string; created_at: string }[] = []
  if (isAdmin) {
    try {
      const { data: solic } = await supabase
        .from('solicitacoes_aporte')
        .select(`id, valor, motivo, created_at, operador:usuarios!operador_id(nome_completo)`)
        .eq('organizacao_id', organizacaoId)
        .eq('status', 'pendente')
        .order('created_at', { ascending: false })

      solicitacoesPendentes = (solic ?? []).map((s) => ({
        id: s.id,
        valor: Number(s.valor),
        motivo: s.motivo,
        operador: (s.operador as any)?.nome_completo ?? '—',
        created_at: s.created_at,
      }))
    } catch { /* silencioso */ }
  }

  // Saldo do último fechamento
  // Não-admin: restrito ao próprio operador (usuario_id) — cada operador só vê o
  // histórico do próprio caixa, nunca o saldo residual de outro operador.
  // Admin: mantido AGREGADO (qualquer operador da org), mas identificando de quem é
  // o fechamento (campo `operador`) para não passar a impressão de ser o saldo do
  // próprio admin. `sessoes_caixa` tem uma única FK para `usuarios` (usuario_id) —
  // sem ambiguidade, mas o nome do relacionamento é especificado explicitamente
  // por convenção (ver `sessoesAbertas` acima, que já usa o mesmo padrão).
  let ultimoFechamento: { saldo: number; fechamento: string; operador?: string } | null = null
  try {
    let ultimoFechamentoQuery = supabase
      .from('sessoes_caixa')
      .select('saldo_especie_calculado, hora_fechamento, usuario_id, usuarios!sessoes_caixa_usuario_id_fkey(nome_completo)')
      .eq('organizacao_id', organizacaoId)
      .eq('status', 'fechada')
      .order('hora_fechamento', { ascending: false })

    if (!isAdmin) {
      ultimoFechamentoQuery = ultimoFechamentoQuery.eq('usuario_id', usuarioId) as typeof ultimoFechamentoQuery
    }

    const { data: uf } = await ultimoFechamentoQuery.limit(1).maybeSingle()

    if (uf) {
      ultimoFechamento = {
        saldo: Number(uf.saldo_especie_calculado ?? 0),
        fechamento: uf.hora_fechamento as string,
        // Não-admin já sabe que é o próprio caixa — nome do operador só é útil (e só
        // é buscado com propósito) na visão agregada do admin.
        ...(isAdmin ? { operador: (uf as any).usuarios?.nome_completo ?? undefined } : {}),
      }
    }
  } catch {
    // silencioso
  }

  return {
    isAdmin,
    sessoesAbertas: sessoesComMovimentos,
    minhaSessao,
    ultimoFechamento,
    entregasHoje,
    entregasSemana,
    ultimasEntregas,
    produtoresHoje,
    totalProdutores: totalProdutores ?? 0,
    lotesAbertos,
    solicitacoesPendentes,
    pagamentosProdutoresMes,
  }
}
