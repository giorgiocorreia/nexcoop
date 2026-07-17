'use server'

// Saldo de espécie sob responsabilidade de um atendente, por módulo — funciona com a
// sessão/caixa aberta OU fechada. Recalcula do zero a partir das tabelas brutas (nunca lê
// sessoes_caixa.saldo_especie_calculado) porque esse campo só é atualizado por
// registrarAporteSangria enquanto a sessão está aberta — saques, conversões e saídas avulsas só
// são reconciliados dentro de fecharCaixa. Ver plano de tesouraria (continuidade de caixa).

import { createAdminClient } from '@/lib/supabase/admin'

export async function getSaldoResponsabilidadeComercializacao(
  organizacaoId: string,
  usuarioId: string
): Promise<{
  sessao_id: string | null
  status_sessao: 'aberta' | 'fechada' | null
  saldo_atual_especie: number
}> {
  const supabase = createAdminClient()

  const { data: sessao } = await supabase
    .from('sessoes_caixa')
    .select('id, status, saldo_inicial_especie')
    .eq('organizacao_id', organizacaoId)
    .eq('usuario_id', usuarioId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!sessao) {
    return { sessao_id: null, status_sessao: null, saldo_atual_especie: 0 }
  }

  const [{ data: aportesSangrias }, { data: movimentacoes }, { data: lancamentos }] = await Promise.all([
    supabase
      .from('aportes_sangrias')
      .select('tipo, valor')
      .eq('sessao_caixa_id', sessao.id),
    supabase
      .from('movimentacoes_conta')
      .select('valor_financeiro')
      .eq('sessao_caixa_id', sessao.id)
      .eq('forma_pagamento', 'especie'),
    supabase
      .from('lancamentos')
      .select('valor')
      .eq('sessao_caixa_id', sessao.id),
  ])

  const totalAportes = (aportesSangrias ?? [])
    .filter(a => a.tipo === 'aporte')
    .reduce((acc, a) => acc + Number(a.valor), 0)
  const totalSangrias = (aportesSangrias ?? [])
    .filter(a => a.tipo === 'sangria')
    .reduce((acc, a) => acc + Number(a.valor), 0)
  const totalMovimentacoesEspecie = (movimentacoes ?? [])
    .reduce((acc, m) => acc + Math.abs(Number(m.valor_financeiro ?? 0)), 0)
  const totalLancamentos = (lancamentos ?? [])
    .reduce((acc, l) => acc + Number(l.valor ?? 0), 0)

  const saldoAtual = Number(sessao.saldo_inicial_especie ?? 0)
    + totalAportes
    - totalSangrias
    - totalMovimentacoesEspecie
    - totalLancamentos

  return {
    sessao_id: sessao.id,
    status_sessao: sessao.status === 'aberta' ? 'aberta' : 'fechada',
    saldo_atual_especie: Number(saldoAtual.toFixed(2)),
  }
}

export async function getSaldoResponsabilidadeLoja(
  orgId: string,
  usuarioId: string
): Promise<{
  caixa_id: string | null
  status_caixa: 'aberto' | 'fechado' | null
  saldo_atual_especie: number
}> {
  const supabase = createAdminClient()

  const { data: caixa } = await supabase
    .from('loja_caixas')
    .select('id, status, valor_abertura')
    .eq('org_id', orgId)
    .eq('usuario_id', usuarioId)
    .order('aberto_em', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!caixa) {
    return { caixa_id: null, status_caixa: null, saldo_atual_especie: 0 }
  }

  const [{ data: vendas }, { data: sangrias }] = await Promise.all([
    (supabase as any)
      .from('loja_vendas')
      .select('pago_especie, status')
      .eq('caixa_id', caixa.id)
      .neq('status', 'cancelada'),
    (supabase as any)
      .from('loja_sangrias')
      .select('tipo, valor')
      .eq('caixa_id', caixa.id),
  ])

  const totalVendasEspecie = ((vendas ?? []) as { pago_especie: number | null }[])
    .reduce((acc, v) => acc + Number(v.pago_especie ?? 0), 0)
  const totalAportes = ((sangrias ?? []) as { tipo: string; valor: number }[])
    .filter(s => s.tipo === 'aporte')
    .reduce((acc, s) => acc + Number(s.valor), 0)
  const totalSangrias = ((sangrias ?? []) as { tipo: string; valor: number }[])
    .filter(s => s.tipo === 'sangria')
    .reduce((acc, s) => acc + Number(s.valor), 0)

  const saldoAtual = Number(caixa.valor_abertura ?? 0)
    + totalVendasEspecie
    + totalAportes
    - totalSangrias

  return {
    caixa_id: caixa.id,
    status_caixa: caixa.status === 'aberto' ? 'aberto' : 'fechado',
    saldo_atual_especie: Number(saldoAtual.toFixed(2)),
  }
}

export interface CustodiaUsuario {
  usuario_id: string
  nome: string
  comercializacao: Awaited<ReturnType<typeof getSaldoResponsabilidadeComercializacao>>
  loja: Awaited<ReturnType<typeof getSaldoResponsabilidadeLoja>>
  total: number
}

// Lista, para cada usuário da org que já teve caixa em algum dos dois módulos, quanto
// tem sob custódia agora — usado no card "Custódia de caixa" do dashboard (só admin).
export async function getResumoCustodiaOrg(organizacaoId: string): Promise<CustodiaUsuario[]> {
  const supabase = createAdminClient()

  const { data: usuarios } = await supabase
    .from('usuarios')
    .select('id, nome_completo')
    .eq('organizacao_id', organizacaoId)
    .eq('ativo', true)

  const resultados = await Promise.all(
    (usuarios ?? []).map(async u => {
      const [comercializacao, loja] = await Promise.all([
        getSaldoResponsabilidadeComercializacao(organizacaoId, u.id),
        getSaldoResponsabilidadeLoja(organizacaoId, u.id),
      ])
      return {
        usuario_id: u.id,
        nome: u.nome_completo,
        comercializacao,
        loja,
        total: Number((comercializacao.saldo_atual_especie + loja.saldo_atual_especie).toFixed(2)),
      }
    })
  )

  return resultados.filter(r => r.comercializacao.status_sessao !== null || r.loja.status_caixa !== null)
}
