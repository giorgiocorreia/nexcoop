'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getUsuarioLogado } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { mesesRange, vencimentoDoMes } from './gerar-utils'
import type { Mensalidade } from '@/types/database'
import type { ComprovantePixExtraido } from './comprovante-types'

function formatarMesRef(data: string) {
  return new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

/**
 * Gera mensalidades pendentes de UM membro para um período (mês inicial + qtd de meses).
 * Usada no cadastro do associado ("gerar parcelas restantes do ano"). Pula os meses
 * em que o membro já tem mensalidade — nunca duplica. Valor = quota-parte do membro
 * (se > 0) ou o valor padrão informado. createAdminClient (write org-level, regra 2).
 */
export async function gerarMensalidadesCooperado(
  cooperadoId: string,
  opts: { mesInicial: string; qtdMeses: number; diaVencimento: number; valorPadrao: number }
): Promise<{ criadas: number } | { error: string }> {
  const usuario = await getUsuarioLogado()
  const orgId = usuario.organizacao_id
  if (!orgId) return { error: 'Organização não encontrada.' }

  const supabase = createAdminClient()

  // Confirma que o membro é da própria org e pega a quota-parte.
  const { data: coop } = await supabase
    .from('cooperados')
    .select('id, quota_parte')
    .eq('id', cooperadoId)
    .eq('organizacao_id', orgId)
    .single<{ id: string; quota_parte: number | null }>()

  if (!coop) return { error: 'Membro não encontrado.' }

  const valor = coop.quota_parte && Number(coop.quota_parte) > 0
    ? Number(coop.quota_parte)
    : opts.valorPadrao
  if (!(valor > 0)) return { error: 'Informe um valor de mensalidade maior que zero.' }

  const refs = mesesRange(opts.mesInicial, opts.qtdMeses).map(m => `${m}-01`)

  // Meses em que o membro já tem mensalidade — para não duplicar.
  const { data: existentes } = await supabase
    .from('mensalidades')
    .select('mes_referencia')
    .eq('cooperado_id', cooperadoId)
    .in('mes_referencia', refs)

  const jaTem = new Set((existentes ?? []).map(e => e.mes_referencia as string))
  const faltantes = refs.filter(r => !jaTem.has(r))
  if (faltantes.length === 0) return { criadas: 0 }

  const payload = faltantes.map(r => ({
    organizacao_id:  orgId,
    cooperado_id:    cooperadoId,
    mes_referencia:  r,
    valor,
    status:          'pendente' as const,
    data_vencimento: vencimentoDoMes(r.slice(0, 7), opts.diaVencimento),
    usuario_id:      usuario.id,
  }))

  const { error } = await supabase.from('mensalidades').insert(payload)
  if (error) return { error: error.message }

  revalidatePath('/mensalidades')
  return { criadas: faltantes.length }
}

export async function registrarPagamentoMensalidade(
  mensalidadeId: string,
  dataPagamento: string,
  observacoes?: string | null
): Promise<{ mensalidade: Mensalidade } | { error: string }> {
  const usuario = await getUsuarioLogado()
  const orgId = usuario.organizacao_id
  if (!orgId) return { error: 'Organização não encontrada.' }

  const supabase = createAdminClient()

  const { data: antes, error: errAntes } = await supabase
    .from('mensalidades')
    .select('*')
    .eq('id', mensalidadeId)
    .eq('organizacao_id', orgId)
    .single<Mensalidade>()

  if (errAntes || !antes) return { error: 'Mensalidade não encontrada.' }
  if (antes.status === 'pago') return { error: 'Esta mensalidade já está paga.' }

  const { data, error } = await supabase
    .from('mensalidades')
    .update({
      status: 'pago',
      data_pagamento: dataPagamento,
      observacoes: observacoes?.trim() || null,
      atualizado_em: new Date().toISOString(),
      usuario_id: usuario.id,
    })
    .eq('id', mensalidadeId)
    .select()
    .single<Mensalidade>()

  if (error) return { error: error.message }

  try {
    const { criarLancamento } = await import('@/lib/financeiro/actions')
    await criarLancamento({
      organizacao_id: orgId,
      tipo: 'receita',
      status: 'pago',
      descricao: `Mensalidade — ${formatarMesRef(antes.mes_referencia)}`,
      valor: Number(antes.valor),
      data_competencia: antes.mes_referencia.split('T')[0].slice(0, 10),
      data_pagamento: dataPagamento,
      cooperado_id: antes.cooperado_id,
      numero_documento: mensalidadeId.slice(0, 8),
      observacoes: observacoes?.trim() || `Referência mensalidade ${formatarMesRef(antes.mes_referencia)}`,
      usuario_id: usuario.id,
      usuario_email: usuario.email ?? undefined,
    })
  } catch (e) {
    console.error('[financeiro] Erro ao criar lançamento mensalidade:', e)
  }

  revalidatePath('/mensalidades')
  revalidatePath(`/mensalidades/${mensalidadeId}`)
  revalidatePath('/financeiro')

  return { mensalidade: data }
}

// ── Baixa por comprovante PIX ────────────────────────────────────────────────
// Fluxo separado de registrarPagamentoMensalidade (que continua existindo e
// sendo usado pela lista de mensalidades) — este é o caminho com comprovante
// + leitura por IA + dedup, usado em MensalidadesAssociadoSection.

export interface DuplicidadeComprovante {
  cooperadoNome: string
  mesReferencia: string
}

/**
 * Verifica se um comprovante (por id da transação PIX ou hash do arquivo) já
 * foi usado em outra mensalidade da org. Chamada no client logo depois da
 * leitura por IA, ANTES de confirmar — a fonte da verdade de bloqueio real é
 * darBaixaMensalidadeComprovante (revalida no servidor, corrida inclusive).
 */
export async function verificarComprovante(
  idTransacao: string | null,
  hash: string | null
): Promise<{ duplicado: DuplicidadeComprovante | null } | { error: string }> {
  if (!idTransacao && !hash) return { duplicado: null }

  const usuario = await getUsuarioLogado()
  const orgId = usuario.organizacao_id
  if (!orgId) return { error: 'Organização não encontrada.' }

  const supabase = createAdminClient()

  let query = supabase
    .from('mensalidades')
    .select('mes_referencia, cooperado_id')
    .eq('organizacao_id', orgId)

  if (idTransacao && hash) {
    query = query.or(`comprovante_id_transacao.eq.${idTransacao},comprovante_hash.eq.${hash}`)
  } else if (idTransacao) {
    query = query.eq('comprovante_id_transacao', idTransacao)
  } else if (hash) {
    query = query.eq('comprovante_hash', hash)
  }

  const { data: existente } = await query.limit(1).maybeSingle<{ mes_referencia: string; cooperado_id: string }>()
  if (!existente) return { duplicado: null }

  const { data: cooperado } = await supabase
    .from('cooperados')
    .select('nome_completo')
    .eq('id', existente.cooperado_id)
    .single<{ nome_completo: string }>()

  return {
    duplicado: {
      cooperadoNome: cooperado?.nome_completo ?? 'associado desconhecido',
      mesReferencia: formatarMesRef(existente.mes_referencia),
    },
  }
}

export interface DadosBaixaComprovante {
  mensalidadeId: string
  dataPagamento: string
  formaPagamento: string
  comprovanteUrl: string | null
  idTransacao: string | null
  hash: string | null
  pagador: string | null
  valorComprovante: number | null
  dataComprovante: string | null
  dadosComprovante: ComprovantePixExtraido | null
}

/**
 * Dá baixa numa mensalidade com comprovante (PIX). BLOQUEIA se o comprovante
 * (id_transacao ou hash) já tiver sido usado em outra mensalidade da org —
 * revalida no servidor (fonte da verdade) mesmo que a UI já tenha checado
 * antes via verificarComprovante, para cobrir corrida entre duas confirmações
 * simultâneas.
 */
export async function darBaixaMensalidadeComprovante(
  params: DadosBaixaComprovante
): Promise<{ mensalidade: Mensalidade } | { error: string }> {
  const usuario = await getUsuarioLogado()
  const orgId = usuario.organizacao_id
  if (!orgId) return { error: 'Organização não encontrada.' }

  const supabase = createAdminClient()

  const { data: antes, error: errAntes } = await supabase
    .from('mensalidades')
    .select('*')
    .eq('id', params.mensalidadeId)
    .eq('organizacao_id', orgId)
    .single<Mensalidade>()

  if (errAntes || !antes) return { error: 'Mensalidade não encontrada.' }
  if (antes.status === 'pago') return { error: 'Esta mensalidade já está paga.' }

  // Revalidação de dedup no servidor — fonte da verdade (regra travada: duplicidade BLOQUEIA).
  const dedup = await verificarComprovante(params.idTransacao, params.hash)
  if ('error' in dedup) return dedup
  if (dedup.duplicado) {
    return { error: `Comprovante já usado para ${dedup.duplicado.cooperadoNome} (${dedup.duplicado.mesReferencia}).` }
  }

  const { data, error } = await supabase
    .from('mensalidades')
    .update({
      status: 'pago',
      data_pagamento: params.dataPagamento,
      forma_pagamento: params.formaPagamento,
      comprovante_url: params.comprovanteUrl,
      comprovante_id_transacao: params.idTransacao,
      comprovante_hash: params.hash,
      comprovante_pagador: params.pagador,
      comprovante_valor: params.valorComprovante,
      comprovante_data: params.dataComprovante,
      comprovante_dados: params.dadosComprovante as unknown as never,
      atualizado_em: new Date().toISOString(),
      usuario_id: usuario.id,
    })
    .eq('id', params.mensalidadeId)
    .select()
    .single<Mensalidade>()

  if (error) {
    // 23505 = violação de índice único (uq_mensalidade_comprovante_e2e / _hash) —
    // corrida entre duas confirmações simultâneas com o mesmo comprovante.
    if ((error as { code?: string }).code === '23505') {
      const dedupCorrida = await verificarComprovante(params.idTransacao, params.hash)
      if ('duplicado' in dedupCorrida && dedupCorrida.duplicado) {
        return { error: `Comprovante já usado para ${dedupCorrida.duplicado.cooperadoNome} (${dedupCorrida.duplicado.mesReferencia}).` }
      }
      return { error: 'Este comprovante já foi usado em outra mensalidade.' }
    }
    return { error: error.message }
  }

  try {
    const { criarLancamento } = await import('@/lib/financeiro/actions')
    const descricaoPagador = params.pagador ? ` — PIX de ${params.pagador}` : ' — PIX'
    await criarLancamento({
      organizacao_id: orgId,
      tipo: 'receita',
      status: 'pago',
      descricao: `Mensalidade — ${formatarMesRef(antes.mes_referencia)}${descricaoPagador}`,
      valor: Number(antes.valor),
      data_competencia: antes.mes_referencia.split('T')[0].slice(0, 10),
      data_pagamento: params.dataPagamento,
      cooperado_id: antes.cooperado_id,
      numero_documento: params.mensalidadeId.slice(0, 8),
      observacoes: `Referência mensalidade ${formatarMesRef(antes.mes_referencia)} — comprovante PIX`,
      usuario_id: usuario.id,
      usuario_email: usuario.email ?? undefined,
    })
  } catch (e) {
    console.error('[financeiro] Erro ao criar lançamento mensalidade (comprovante):', e)
  }

  revalidatePath('/mensalidades')
  revalidatePath(`/mensalidades/${params.mensalidadeId}`)
  revalidatePath('/financeiro')
  revalidatePath('/cooperados')
  revalidatePath(`/cooperados/${antes.cooperado_id}`)

  return { mensalidade: data }
}