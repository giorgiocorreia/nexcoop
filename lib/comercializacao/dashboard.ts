'use server'

import { createClient } from '@/lib/supabase/server'

export async function getDashboardComercializacao(organizacaoId: string) {
  const supabase = await createClient()
  const hoje = new Date()
  const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).toISOString()
  const fimHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1).toISOString()

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
      saldo_especie_calculado,
      usuario_id,
      usuarios!usuario_id(nome_completo)
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

    sessoesComMovimentos.push({
      id: sessao.id,
      operador: (sessao.usuarios as any)?.nome_completo ?? '—',
      abertura: sessao.created_at as string,
      saldoCalculado: Number(sessao.saldo_especie_calculado ?? 0),
      aportes,
      sangrias,
    })
  }

  // Sessão do próprio usuário (para botão de solicitar aporte)
  const minhaSessao = sessoesComMovimentos.find((_, i) =>
    (sessoesRaw ?? [])[i]?.usuario_id === usuarioId
  ) ?? null

  let entregasHoje: { count: number; totalKg: number } = { count: 0, totalKg: 0 }
  let entregasSemana: { dia: string; totalKg: number }[] = []
  let ultimasEntregas: {
    produtor: string
    produto: string
    kg: number
    valor: number
    horario: string
  }[] = []

  try {
    const { data: notasHoje } = await supabase
      .from('notas_entrega')
      .select('peso_liquido, valor_total, created_at')
      .eq('organizacao_id', organizacaoId)
      .gte('created_at', inicioHoje)
      .lt('created_at', fimHoje)

    if (notasHoje) {
      entregasHoje = {
        count: notasHoje.length,
        totalKg: notasHoje.reduce((s, n) => s + Number(n.peso_liquido ?? 0), 0),
      }
    }

    const diasAtras7 = new Date(hoje)
    diasAtras7.setDate(diasAtras7.getDate() - 6)
    diasAtras7.setHours(0, 0, 0, 0)

    const { data: notasSemana } = await supabase
      .from('notas_entrega')
      .select('peso_liquido, created_at')
      .eq('organizacao_id', organizacaoId)
      .gte('created_at', diasAtras7.toISOString())

    if (notasSemana) {
      const mapa: Record<string, number> = {}
      for (let i = 0; i < 7; i++) {
        const d = new Date(diasAtras7)
        d.setDate(d.getDate() + i)
        const key = d.toISOString().slice(0, 10)
        mapa[key] = 0
      }
      for (const n of notasSemana) {
        const key = (n.created_at ?? '').slice(0, 10)
        if (key in mapa) mapa[key] += Number(n.peso_liquido ?? 0)
      }
      entregasSemana = Object.entries(mapa).map(([dia, totalKg]) => ({ dia, totalKg }))
    }

    const { data: ultimas } = await supabase
      .from('notas_entrega')
      .select(`
        peso_liquido,
        valor_total,
        created_at,
        produto,
        cooperado:cooperados(nome)
      `)
      .eq('organizacao_id', organizacaoId)
      .order('created_at', { ascending: false })
      .limit(5)

    if (ultimas) {
      ultimasEntregas = ultimas.map((n) => ({
        produtor: (n.cooperado as any)?.nome ?? '—',
        produto: (n as any).produto ?? 'Cacau seco',
        kg: Number(n.peso_liquido ?? 0),
        valor: Number(n.valor_total ?? 0),
        horario: new Date(n.created_at ?? Date.now()).toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      }))
    }
  } catch {
    // notas_entrega ainda não existe — silencioso
  }

  let produtoresHoje = 0
  try {
    const { data: ids } = await supabase
      .from('notas_entrega')
      .select('cooperado_id')
      .eq('organizacao_id', organizacaoId)
      .gte('created_at', inicioHoje)
      .lt('created_at', fimHoje)
    produtoresHoje = new Set((ids ?? []).map((r: any) => r.cooperado_id)).size
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
      .eq('status', 'aberto')
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
  let ultimoFechamento: { saldo: number; fechamento: string } | null = null
  try {
    const { data: uf } = await supabase
      .from('sessoes_caixa')
      .select('saldo_especie_calculado, hora_fechamento')
      .eq('organizacao_id', organizacaoId)
      .eq('status', 'fechada')
      .order('hora_fechamento', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (uf) {
      ultimoFechamento = {
        saldo: Number(uf.saldo_especie_calculado ?? 0),
        fechamento: uf.hora_fechamento as string,
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
  }
}
