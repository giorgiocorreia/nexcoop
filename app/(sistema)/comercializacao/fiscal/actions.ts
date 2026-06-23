'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getUsuarioLogado, getOrganizacaoId } from '@/lib/auth'
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
      compradores(id, nome, cnpj),
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

  const usuario = await getUsuarioLogado()
  const orgId = usuario.organizacao_id as string
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
    await focusDelete(`/v2/nfe/${referencia}`, { justificativa })
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
