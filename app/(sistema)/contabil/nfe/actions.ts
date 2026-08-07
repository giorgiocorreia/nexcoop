'use server'

/**
 * Actions exclusivas do módulo Contábil — NF-e.
 * Cópia independente de comercializacao/fiscal/actions (somente leitura + sync).
 * Alterar aqui NÃO afeta o painel operacional de comercialização.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { getOrganizacaoId } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

const STATUS_NFE_SAIDA_LISTA = [
  'autorizada',
  'processando',
  'cancelada',
  'rejeitada',
  'devolvida',
  'erro',
] as const

export async function listarNfeSaidaContabil() {
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
    .in('status_nfe', [...STATUS_NFE_SAIDA_LISTA])
    .order('data_emissao_nfe', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function kpisNfeSaidaContabil() {
  const orgId = await getOrganizacaoId()
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('vendas_externas')
    .select('status_nfe, valor_bruto')
    .eq('organizacao_id', orgId)
    .in('status_nfe', [...STATUS_NFE_SAIDA_LISTA])

  const rows = data ?? []
  const autorizadas = rows.filter(r => r.status_nfe === 'autorizada').length
  const canceladas = rows.filter(r => r.status_nfe === 'cancelada').length
  const processando = rows.filter(r => (r.status_nfe as string) === 'processando').length
  const valorTotal = rows
    .filter(r => r.status_nfe === 'autorizada')
    .reduce((sum, r) => sum + Number(r.valor_bruto ?? 0), 0)

  return { total: rows.length, autorizadas, canceladas, processando, valorTotal }
}

export async function listarEntradasContabil() {
  const orgId = await getOrganizacaoId()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('notas_entrega')
    .select(`
      id, numero_nfe, serie, chave_nfe, status, created_at,
      quantidade_kg, valor_total, cfop, xml_url, danfe_url,
      produtores (nome, cpf)
    `)
    .eq('organizacao_id', orgId)
    .in('status', ['autorizada', 'emitida', 'processando'])
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (data ?? []).filter((n: any) => {
    if (n.status === 'autorizada' || n.status === 'emitida') {
      return !!(n.chave_nfe || n.numero_nfe)
    }
    if (n.status === 'processando') return true
    return false
  })
}

export async function listarDevolucoesContabil(orgId: string) {
  const supabase = createAdminClient()
  const { data, error } = await (supabase as any)
    .from('vendas_externas_devolucoes')
    .select(`
      *,
      vendas_externas (
        id, quantidade_kg, valor_bruto, status,
        lotes (codigo),
        compradores (nome_razao_social)
      )
    `)
    .eq('organizacao_id', orgId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function sincronizarNfeSaidaContabil(vendaId: string) {
  const orgId = await getOrganizacaoId()
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { sincronizarNfeSaida } = await import('@/lib/focusnfe/emitir-nfe-saida')
  const resultado = await sincronizarNfeSaida({
    vendaId,
    organizacao_id: orgId,
    usuario_id: user?.id ?? orgId,
    usuario_email: user?.email ?? undefined,
  })
  revalidatePath('/contabil/nfe')
  return resultado
}

export async function sincronizarSaidasProcessandoContabil() {
  const orgId = await getOrganizacaoId()
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { sincronizarNfesSaidaProcessando } = await import('@/lib/focusnfe/emitir-nfe-saida')
  const resumo = await sincronizarNfesSaidaProcessando({
    organizacao_id: orgId,
    usuario_id: user?.id ?? orgId,
    usuario_email: user?.email ?? undefined,
  })
  revalidatePath('/contabil/nfe')
  return resumo
}

export async function sincronizarEntradasProcessandoContabil() {
  const orgId = await getOrganizacaoId()
  const { sincronizarNfesEntradaProcessando } = await import(
    '@/lib/focusnfe/emitir-nfe-entrada'
  )
  const resumo = await sincronizarNfesEntradaProcessando(orgId)
  revalidatePath('/contabil/nfe')
  return resumo
}
