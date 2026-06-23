'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ── Verificar e marcar parcelas vencidas ──────────────────────────────────────
export async function verificarInadimplencia(orgId: string) {
  const supabase = createAdminClient()
  const hoje = new Date().toISOString().split('T')[0]

  await supabase
    .from('cota_pagamentos')
    .update({ status: 'vencido' })
    .eq('organizacao_id', orgId)
    .eq('status', 'pendente')
    .lt('data_vencimento', hoje)

  const { data: vencidos } = await supabase
    .from('cota_pagamentos')
    .select('cooperado_id')
    .eq('organizacao_id', orgId)
    .eq('status', 'vencido')

  const idsVencidos = [...new Set((vencidos ?? []).map(v => v.cooperado_id))]

  if (idsVencidos.length > 0) {
    await supabase
      .from('cooperados')
      .update({ status: 'inadimplente' })
      .in('id', idsVencidos)
      .in('status', ['ativo', 'probatorio'])
  }
}

// ── Buscar pagamentos de uma cota ─────────────────────────────────────────────
export async function buscarPagamentos(cotaId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cota_pagamentos')
    .select('*')
    .eq('cota_id', cotaId)
    .order('numero_parcela', { ascending: true })
  if (error) throw new Error(error.message)
  return data ?? []
}

// ── Resumo financeiro de cotas para o dashboard ───────────────────────────────
export async function buscarResumoCotasDashboard(orgId: string) {
  const supabase = createAdminClient()

  const [{ data: pendentes }, { data: inadimplentes }] = await Promise.all([
    supabase
      .from('cota_pagamentos')
      .select('valor_pago, data_vencimento, cooperado_id')
      .eq('organizacao_id', orgId)
      .in('status', ['pendente', 'vencido']),
    supabase
      .from('cooperados')
      .select('id, nome_completo, status')
      .eq('organizacao_id', orgId)
      .eq('status', 'inadimplente'),
  ])

  const hoje = new Date().toISOString().split('T')[0]
  const totalAReceber = (pendentes ?? []).reduce((s, p) => s + Number(p.valor_pago), 0)
  const totalVencido  = (pendentes ?? [])
    .filter(p => p.data_vencimento && p.data_vencimento < hoje)
    .reduce((s, p) => s + Number(p.valor_pago), 0)

  return {
    totalAReceber,
    totalVencido,
    totalInadimplentes: (inadimplentes ?? []).length,
    inadimplentes: (inadimplentes ?? []) as Array<{ id: string; nome_completo: string; status: string }>,
  }
}

// ── Registrar pagamento(s) ────────────────────────────────────────────────────
export async function registrarPagamentos(
  cotaId: string,
  cooperadoId: string,
  orgId: string,
  registradoPor: string,
  parcelas: Array<{
    valor_pago:      number
    forma_pagamento: 'dinheiro' | 'pix' | 'cartao' | 'promessa'
    data_pagamento:  string | null
    data_vencimento: string | null
    numero_parcela:  number
    total_parcelas:  number
    observacoes?:    string
  }>
) {
  const supabase = createAdminClient()

  const { data: cota } = await supabase
    .from('cotas_cooperado')
    .select('quantidade, valor_cota')
    .eq('id', cotaId)
    .single()

  const valorTotalCota = cota
    ? Number(cota.quantidade) * Number(cota.valor_cota)
    : 0

  const rows = parcelas.map(p => ({
    cota_id:          cotaId,
    cooperado_id:     cooperadoId,
    organizacao_id:   orgId,
    valor_total_cota: valorTotalCota,
    valor_pago:       p.valor_pago,
    forma_pagamento:  p.forma_pagamento,
    data_pagamento:   p.forma_pagamento !== 'promessa' ? p.data_pagamento : null,
    data_vencimento:  p.forma_pagamento === 'promessa' ? p.data_vencimento : null,
    status:           (p.forma_pagamento === 'promessa' ? 'pendente' : 'pago') as 'pago' | 'pendente',
    numero_parcela:   p.numero_parcela,
    total_parcelas:   p.total_parcelas,
    registrado_por:   registradoPor,
    observacoes:      p.observacoes ?? null,
  }))

  const { data: inseridos, error } = await supabase
    .from('cota_pagamentos')
    .insert(rows)
    .select()

  if (error) throw new Error(error.message)

  try {
    const { criarLancamento } = await import('@/lib/financeiro/actions')
    const parcelasPagas = (inseridos ?? []).filter((p: any) => p.forma_pagamento !== 'promessa' && Number(p.valor_pago) > 0)
    for (const parcela of parcelasPagas) {
      await criarLancamento({
        organizacao_id: orgId,
        tipo: 'receita' as any,
        status: 'pago' as any,
        descricao: `Integralização de cota — Parcela ${(parcela as any).numero_parcela ?? ''}`,
        valor: Number((parcela as any).valor_pago),
        data_competencia: new Date().toISOString().split('T')[0],
        data_pagamento: (parcela as any).data_pagamento ?? new Date().toISOString().split('T')[0],
        cooperado_id: cooperadoId,
        numero_documento: ((parcela as any).id as string).slice(0, 8),
        observacoes: `Cota cooperativa — parcela`,
        usuario_id: registradoPor,
      })
    }
  } catch (e) {
    console.error('[contabil] Erro ao criar lançamento cota:', e)
  }

  const { data: todasParcelas } = await supabase
    .from('cota_pagamentos')
    .select('status, valor_pago')
    .eq('cota_id', cotaId)

  const totalPago = (todasParcelas ?? [])
    .filter(p => p.status === 'pago')
    .reduce((s, p) => s + Number(p.valor_pago), 0)

  const quitou = totalPago >= valorTotalCota
  const temPendente = (todasParcelas ?? []).some(p => p.status === 'pendente')

  const { data: coopAtual } = await supabase
    .from('cooperados')
    .select('status')
    .eq('id', cooperadoId)
    .single()

  const statusPermitemProbatorio = ['proposta', 'ativo']
  if (coopAtual?.status && statusPermitemProbatorio.includes(coopAtual.status) && !quitou) {
    await supabase
      .from('cooperados')
      .update({ status: 'probatorio' })
      .eq('id', cooperadoId)
  }

  if (quitou && !temPendente) {
    await supabase
      .from('cotas_cooperado')
      .update({ status: 'integralizada' })
      .eq('id', cotaId)
  } else {
    await supabase
      .from('cotas_cooperado')
      .update({ status: 'parcial' })
      .eq('id', cotaId)
  }

  revalidatePath(`/cooperados/${cooperadoId}`)

  return { pagamentos: inseridos ?? [], quitou, totalPago, valorTotalCota }
}

// ── Quitar parcela pendente ───────────────────────────────────────────────────
export async function quitarParcela(
  pagamentoId: string,
  cooperadoId: string,
  cotaId: string,
  formaPagamento: 'dinheiro' | 'pix' | 'cartao',
  dataPagamento: string
) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('cota_pagamentos')
    .update({
      status:          'pago',
      forma_pagamento: formaPagamento,
      data_pagamento:  dataPagamento,
    })
    .eq('id', pagamentoId)

  if (error) throw new Error(error.message)

  const { data: cota } = await supabase
    .from('cotas_cooperado')
    .select('quantidade, valor_cota')
    .eq('id', cotaId)
    .single()

  const valorTotalCota = cota
    ? Number(cota.quantidade) * Number(cota.valor_cota)
    : 0

  const { data: todasParcelas } = await supabase
    .from('cota_pagamentos')
    .select('status, valor_pago')
    .eq('cota_id', cotaId)

  const totalPago = (todasParcelas ?? [])
    .filter(p => p.status === 'pago')
    .reduce((s, p) => s + Number(p.valor_pago), 0)

  const quitou = totalPago >= valorTotalCota
  const temPendente = (todasParcelas ?? []).some(
    p => p.status === 'pendente' || p.status === 'vencido'
  )

  if (quitou && !temPendente) {
    await supabase
      .from('cotas_cooperado')
      .update({ status: 'integralizada' })
      .eq('id', cotaId)
  }

  revalidatePath(`/cooperados/${cooperadoId}`)

  return { quitou, totalPago, valorTotalCota }
}
