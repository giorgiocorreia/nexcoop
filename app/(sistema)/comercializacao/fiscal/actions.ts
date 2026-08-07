'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getOrganizacaoId } from '@/lib/auth'
import { focusDelete } from '@/lib/focusnfe/client'
import { revalidatePath } from 'next/cache'

export async function listarNfeSaida() {
  const orgId = await getOrganizacaoId()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('vendas_externas')
    .select(`
      id, quantidade_kg, preco_kg, valor_bruto,
      chave_nfe, numero_nfe, serie_nfe, status_nfe,
      xml_nfe, data_emissao_nfe, lote_id,
      compradores(id, nome, cnpj, email),
      lotes(codigo, produto_descricao, safras(ano))
    `)
    .eq('organizacao_id', orgId)
    .not('status_nfe', 'is', null)
    .order('data_emissao_nfe', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function kpisNfeSaida() {
  const orgId = await getOrganizacaoId()
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('vendas_externas')
    .select('status_nfe, valor_bruto')
    .eq('organizacao_id', orgId)
    .not('status_nfe', 'is', null)

  const rows = data ?? []
  const autorizadas = rows.filter(r => r.status_nfe === 'autorizada').length
  const canceladas  = rows.filter(r => r.status_nfe === 'cancelada').length
  const processando = rows.filter(r => (r.status_nfe as string) === 'processando').length
  const valorTotal  = rows
    .filter(r => r.status_nfe === 'autorizada')
    .reduce((sum, r) => sum + Number(r.valor_bruto ?? 0), 0)

  return { total: rows.length, autorizadas, canceladas, processando, valorTotal }
}

export async function cancelarNfe(chave: string, justificativa: string) {
  if (justificativa.length < 15) {
    return { sucesso: false, erro: 'Justificativa mínima de 15 caracteres' }
  }

  const orgId = await getOrganizacaoId()
  const supabase = createAdminClient()

  const { data: venda } = await supabase
    .from('vendas_externas')
    .select('id, status_nfe, data_emissao_nfe')
    .eq('chave_nfe', chave)
    .eq('organizacao_id', orgId)
    .single()

  if (!venda) return { sucesso: false, erro: 'NF-e não encontrada' }
  if (venda.status_nfe === 'cancelada') return { sucesso: false, erro: 'NF-e já cancelada' }

  if (venda.data_emissao_nfe) {
    const diff = Date.now() - new Date(venda.data_emissao_nfe).getTime()
    if (diff > 24 * 60 * 60 * 1000) {
      return { sucesso: false, erro: 'Prazo de cancelamento expirado (máx. 24h após emissão)' }
    }
  }

  const referencia = `SAIDA-${orgId.slice(0, 8)}-${venda.id.slice(0, 8)}`

  try {
    await focusDelete(`/v2/nfe/${referencia}`, { justificativa }, 'comercializacao')
    await supabase
      .from('vendas_externas')
      .update({ status_nfe: 'cancelada' } as any)
      .eq('chave_nfe', chave)

    revalidatePath('/comercializacao/fiscal')
    return { sucesso: true }
  } catch (e: any) {
    return { sucesso: false, erro: e.message }
  }
}

export type EventoNfe = {
  id: string
  tipo: string
  sequencia: number | null
  texto: string
  status: string
  xml_url: string | null
  pdf_url: string | null
  mensagem_sefaz: string | null
  criado_em: string
}

/** Histórico de eventos (CC-e) de uma NF-e de saída. */
export async function listarEventosNfeAction(vendaId: string): Promise<EventoNfe[]> {
  const orgId = await getOrganizacaoId()
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('nfe_eventos')
    .select('id, tipo, sequencia, texto, status, xml_url, pdf_url, mensagem_sefaz, criado_em')
    .eq('organizacao_id', orgId)
    .eq('venda_id', vendaId)
    .order('criado_em', { ascending: false })

  return (data ?? []) as EventoNfe[]
}

export type ResultadoCartaCorrecao = {
  sucesso: boolean
  erro?: string
  correcao?: string
  sequencia?: number
  xml_url?: string
  pdf_url?: string
  mensagem_sefaz?: string
  /** id em nfe_eventos — alimenta o envio por e-mail no painel de confirmação */
  eventoId?: string
}

/**
 * Emite Carta de Correção Eletrônica para uma NF-e de saída autorizada.
 *
 * A CC-e não corrige valores, alíquota, CST nem destinatário (Ajuste SINIEF
 * 07/05) — a validação disso é do usuário, aqui só garantimos que a nota está
 * autorizada e que o texto atende ao formato exigido pela SEFAZ.
 */
export async function emitirCartaCorrecaoAction(
  vendaId: string,
  correcao: string,
): Promise<ResultadoCartaCorrecao> {
  const orgId = await getOrganizacaoId()
  const supabase = createAdminClient()
  const { createClient } = await import('@/lib/supabase/server')
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()

  const { validarCorrecao, normalizarCorrecao, emitirCartaCorrecao } =
    await import('@/lib/focusnfe/carta-correcao')

  const erroTexto = validarCorrecao(correcao)
  if (erroTexto) return { sucesso: false, erro: erroTexto }

  const { data: venda } = await supabase
    .from('vendas_externas')
    .select('id, status_nfe, chave_nfe, numero_nfe, serie_nfe')
    .eq('id', vendaId)
    .eq('organizacao_id', orgId)
    .single()

  if (!venda) return { sucesso: false, erro: 'NF-e não encontrada' }
  if (venda.status_nfe !== 'autorizada') {
    return { sucesso: false, erro: 'Só é possível emitir CC-e de NF-e autorizada.' }
  }

  const { referenciaNfeSaida } = await import('@/lib/focusnfe/emitir-nfe-saida')
  const referencia = referenciaNfeSaida(orgId, venda.id)

  const resultado = await emitirCartaCorrecao({ referencia, correcao })

  // Registra a tentativa mesmo quando falha — o histórico do que foi enviado
  // à SEFAZ é justamente o que a tabela existe para guardar.
  const { data: eventoGravado } = await supabase.from('nfe_eventos').insert({
    organizacao_id: orgId,
    venda_id: venda.id,
    tipo: 'carta_correcao',
    referencia,
    chave_nfe: venda.chave_nfe,
    sequencia: resultado.sequencia ?? null,
    texto: resultado.correcao ?? normalizarCorrecao(correcao),
    status: resultado.sucesso ? 'registrado' : 'erro',
    xml_url: resultado.xml_url ?? null,
    pdf_url: resultado.pdf_url ?? null,
    mensagem_sefaz: resultado.mensagem_sefaz ?? resultado.erro ?? null,
    criado_por: user?.id ?? null,
  } as any).select('id').single()

  revalidatePath('/comercializacao/fiscal')
  // eventoId alimenta o envio por e-mail no painel de confirmação.
  return { ...resultado, eventoId: eventoGravado?.id as string | undefined }
}

export async function buscarDocsLoteAction(loteId: string) {
  const supabase = createAdminClient()
  const orgId = await getOrganizacaoId()

  const { data: movs } = await supabase
    .from('movimentacoes_conta')
    .select('id')
    .eq('lote_id', loteId)

  const movIds = movs?.map(m => m.id) ?? []

  const { data: notasEntrada } = movIds.length > 0 ? await supabase
    .from('notas_entrega')
    .select('id, chave_nfe, numero_nfe, xml_url, quantidade_kg, produtores(nome)')
    .eq('organizacao_id', orgId)
    .in('movimentacao_id', movIds)
    .eq('status', 'autorizada') : { data: [] }

  return {
    notasEntrada: (notasEntrada ?? []).map((n: any) => ({
      numero_nfe: n.numero_nfe,
      chave_nfe: n.chave_nfe,
      xml_url: n.xml_url,
      quantidade_kg: n.quantidade_kg,
      produtor_nome: Array.isArray(n.produtores) ? n.produtores[0]?.nome : n.produtores?.nome,
    })),
    notaSaida: null,
  }
}

export async function gerarZipLoteAction(loteId: string) {
  const { gerarZipLote } = await import('@/lib/comercializacao/zip-lote')
  return gerarZipLote(loteId)
}

export async function enviarZipEmailAction(loteId: string, email: string) {
  const { gerarZipEEnviarEmail } = await import('@/lib/comercializacao/zip-lote')
  return gerarZipEEnviarEmail(loteId, email)
}

/** Reconsulta uma NF-e de saída na Focus e atualiza o status local. */
export async function sincronizarNfeSaidaAction(vendaId: string) {
  const orgId = await getOrganizacaoId()
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { sincronizarNfeSaida } = await import('@/lib/focusnfe/emitir-nfe-saida')
  const resultado = await sincronizarNfeSaida({
    vendaId,
    organizacao_id: orgId,
    usuario_id: user?.id ?? orgId,
    usuario_email: user?.email ?? undefined,
  })
  revalidatePath('/comercializacao/fiscal')
  revalidatePath('/comercializacao/lotes')
  revalidatePath('/contabil/nfe')
  return resultado
}

/** Reconsulta todas as NF-e de saída com status processando da org. */
export async function sincronizarNfesSaidaProcessandoAction() {
  const orgId = await getOrganizacaoId()
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { sincronizarNfesSaidaProcessando } = await import('@/lib/focusnfe/emitir-nfe-saida')
  const resumo = await sincronizarNfesSaidaProcessando({
    organizacao_id: orgId,
    usuario_id: user?.id ?? orgId,
    usuario_email: user?.email ?? undefined,
  })
  revalidatePath('/comercializacao/fiscal')
  revalidatePath('/comercializacao/lotes')
  revalidatePath('/contabil/nfe')
  return resumo
}
