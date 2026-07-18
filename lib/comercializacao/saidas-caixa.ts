'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getUsuarioLogado } from '@/lib/auth'
import {
  calcularIntervaloMes,
  agregarSaidas,
  type SaidaCaixaLinha,
} from './saidas-caixa-utils'

export type { SaidaCaixaLinha, TipoSaidaCaixa, FiltrosSaidaCaixa } from './saidas-caixa-utils'

// Relatório "Saídas de Caixa" — cobre TODA fonte que representa dinheiro
// saindo do caixa da Comercialização, não só saque de produtor. Ver critério
// completo e o que fica de fora (ajuste_produto, entrega, conversao) no
// comentário de topo de saidas-caixa-utils.ts.
export async function listarSaidasCaixa(mes: number, ano: number) {
  const usuario = await getUsuarioLogado()
  const supabase = createAdminClient()
  const orgId = usuario.organizacao_id as string
  const { inicioIso, fimIso } = calcularIntervaloMes(mes, ano)
  // `lancamentos.data_pagamento` é coluna `date` pura (sem hora) — mesmo
  // recorte de mês, só em 'YYYY-MM-DD'.
  const inicioData = inicioIso.slice(0, 10)
  const fimData = fimIso.slice(0, 10) // exclusivo: dia 1 do mês seguinte

  const linhas: SaidaCaixaLinha[] = []

  // 1) Saques de produtor (espécie/Pix) — dinheiro sai da conta do produtor
  // pra mão/conta dele. Ver registrarConversaoESaque, registrarSaqueFinanceiro
  // e registrarSaquePorValor em caixa.actions.ts.
  const { data: saques, error: eSaques } = await supabase
    .from('movimentacoes_conta')
    .select(`
      id, valor_financeiro, forma_pagamento, observacoes, created_at,
      contas_produtor!inner(produtor_id, produtores(nome, cpf))
    `)
    .eq('organizacao_id', orgId)
    .in('tipo', ['saque_especie', 'saque_pix'])
    .gte('created_at', inicioIso)
    .lt('created_at', fimIso)
  if (eSaques) throw new Error(eSaques.message)
  for (const m of (saques ?? []) as any[]) {
    const nome = m.contas_produtor?.produtores?.nome ?? '—'
    linhas.push({
      id: m.id,
      data: m.created_at,
      tipo: m.forma_pagamento === 'pix' ? 'saque_pix' : 'saque_especie',
      descricao: nome,
      produtor_nome: nome,
      forma_pagamento: (m.forma_pagamento ?? 'especie') as 'especie' | 'pix',
      valor: Math.abs(Number(m.valor_financeiro ?? 0)),
      observacoes: m.observacoes ?? null,
    })
  }

  // 2) Saídas avulsas — despesa operacional paga em espécie direto do caixa
  // (registrarSaidaAvulsa, migration 057). Sempre espécie — mesmo critério já
  // documentado em fecharCaixa() (lancamentos não tem coluna forma_pagamento).
  const { data: avulsas, error: eAvulsas } = await supabase
    .from('lancamentos')
    .select('id, descricao, valor, data_pagamento, observacoes, sessao_caixa_id')
    .eq('organizacao_id', orgId)
    .not('sessao_caixa_id', 'is', null)
    .gte('data_pagamento', inicioData)
    .lt('data_pagamento', fimData)
  if (eAvulsas) throw new Error(eAvulsas.message)
  for (const l of (avulsas ?? []) as any[]) {
    linhas.push({
      id: l.id,
      data: l.data_pagamento,
      tipo: 'saida_avulsa',
      descricao: l.descricao ?? 'Saída avulsa',
      produtor_nome: null,
      forma_pagamento: 'especie',
      valor: Math.abs(Number(l.valor ?? 0)),
      observacoes: l.observacoes ?? null,
    })
  }

  // 3) Sangrias — inclui transferências pra Loja/outro atendente da própria
  // Comercialização (origem_transferencia, migration 057+). Sempre espécie:
  // dinheiro físico saindo do caixa (aportes_sangrias.forma_pagamento,
  // migration 063, só existe pra distinguir ENTRADA de cota; sangria manual é
  // sempre espécie).
  const { data: sangrias, error: eSangrias } = await (supabase as any)
    .from('aportes_sangrias')
    .select('id, valor, observacoes, created_at, origem_transferencia')
    .eq('organizacao_id', orgId)
    .eq('tipo', 'sangria')
    .gte('created_at', inicioIso)
    .lt('created_at', fimIso)
  if (eSangrias) throw new Error(eSangrias.message)
  for (const s of (sangrias ?? []) as any[]) {
    const sufixoTransferencia =
      s.origem_transferencia === 'loja' ? ' — transferência p/ Loja' :
      s.origem_transferencia === 'comercializacao' ? ' — transferência interna' : ''
    linhas.push({
      id: s.id,
      data: s.created_at,
      tipo: 'sangria',
      descricao: (s.observacoes ? s.observacoes : 'Sangria') + sufixoTransferencia,
      produtor_nome: null,
      forma_pagamento: 'especie',
      valor: Math.abs(Number(s.valor ?? 0)),
      observacoes: s.observacoes ?? null,
    })
  }

  // 4) Ajustes financeiros de débito — cobertura futura (ver comentário no
  // topo de saidas-caixa-utils.ts). Hoje sempre retorna vazio.
  const { data: ajustes, error: eAjustes } = await supabase
    .from('movimentacoes_conta')
    .select(`
      id, valor_financeiro, forma_pagamento, observacoes, created_at,
      contas_produtor(produtor_id, produtores(nome, cpf))
    `)
    .eq('organizacao_id', orgId)
    .eq('tipo', 'ajuste_financeiro')
    .lt('valor_financeiro', 0)
    .gte('created_at', inicioIso)
    .lt('created_at', fimIso)
  if (eAjustes) throw new Error(eAjustes.message)
  for (const a of (ajustes ?? []) as any[]) {
    const nome = a.contas_produtor?.produtores?.nome ?? null
    linhas.push({
      id: a.id,
      data: a.created_at,
      tipo: 'ajuste_financeiro_debito',
      descricao: nome ? `Ajuste financeiro — ${nome}` : 'Ajuste financeiro',
      produtor_nome: nome,
      forma_pagamento: (a.forma_pagamento ?? 'especie') as 'especie' | 'pix',
      valor: Math.abs(Number(a.valor_financeiro ?? 0)),
      observacoes: a.observacoes ?? null,
    })
  }

  linhas.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())

  const { data: org } = await supabase
    .from('organizacoes')
    .select('nome, cnpj')
    .eq('id', orgId)
    .maybeSingle()

  return {
    linhas,
    orgNome: org?.nome ?? '',
    orgCnpj: org?.cnpj ?? '',
  }
}

// Resumo pro KPI do dashboard — SEMÂNTICA DIFERENTE do relatório de saídas
// acima: conta só saques de produtor (espécie/Pix), não sangria/avulsa/
// ajuste. É "Pagamentos a produtores", não "todas as saídas de caixa" —
// mantido de propósito, não mudar pra bater com as outras 3 fontes.
export async function getResumoPagamentosMes(organizacaoId: string, mes: number, ano: number) {
  const supabase = createAdminClient()
  const { inicioIso, fimIso } = calcularIntervaloMes(mes, ano)

  const { data: movs, error } = await supabase
    .from('movimentacoes_conta')
    .select('valor_financeiro, forma_pagamento')
    .eq('organizacao_id', organizacaoId)
    .in('tipo', ['saque_especie', 'saque_pix'])
    .gte('created_at', inicioIso)
    .lt('created_at', fimIso)
  if (error) throw new Error(error.message)

  const linhas: SaidaCaixaLinha[] = (movs ?? []).map((m: any) => ({
    id: '',
    data: '',
    tipo: (m.forma_pagamento === 'pix' ? 'saque_pix' : 'saque_especie') as SaidaCaixaLinha['tipo'],
    descricao: '',
    produtor_nome: null,
    forma_pagamento: (m.forma_pagamento ?? 'especie') as 'especie' | 'pix',
    valor: Math.abs(Number(m.valor_financeiro ?? 0)),
    observacoes: null,
  }))

  return agregarSaidas(linhas)
}
