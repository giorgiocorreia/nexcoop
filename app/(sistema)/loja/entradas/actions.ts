'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { focusGet } from '@/lib/focusnfe/client'

export async function listarEntradasNFe(orgId: string, filtros: {
  dataInicio?: string
  dataFim?: string
  fornecedor?: string
  status?: string
}) {
  const admin = createAdminClient()

  let query = admin
    .from('loja_compras')
    .select(`
      id,
      data_compra,
      numero_nf,
      total,
      status_nfe,
      chave_acesso_nfe,
      serie_nfe,
      data_emissao_nfe,
      emitente_nfe,
      cnpj_emitente,
      valor_nfe,
      observacoes,
      loja_fornecedores ( id, nome, cnpj )
    `)
    .eq('org_id', orgId)
    .order('data_compra', { ascending: false })

  if (filtros.dataInicio) query = query.gte('data_compra', filtros.dataInicio)
  if (filtros.dataFim)    query = query.lte('data_compra', filtros.dataFim)
  if (filtros.status && filtros.status !== 'todos') query = query.eq('status_nfe', filtros.status as 'com_chave' | 'sem_chave' | 'sem_nota')

  const { data, error } = await query
  if (error) throw new Error(error.message)

  let lista = data ?? []
  if (filtros.fornecedor) {
    const termo = filtros.fornecedor.toLowerCase()
    lista = lista.filter((c: any) => (c.loja_fornecedores?.nome ?? '').toLowerCase().includes(termo))
  }

  return lista
}

export async function consultarNFeNaSEFAZ(chaveAcesso: string): Promise<{
  ok: boolean
  dados?: {
    numero: string
    serie: string
    dataEmissao: string
    emitente: string
    cnpjEmitente: string
    valorTotal: number
    status: string
  }
  erro?: string
}> {
  try {
    const json = await focusGet<any>(`/v2/nfe/${chaveAcesso}`, 'loja')
    const nfe = json?.nfe_proc?.NFe?.infNFe

    if (!nfe) return { ok: false, erro: 'Estrutura de resposta inesperada da SEFAZ' }

    return {
      ok: true,
      dados: {
        numero:       nfe.ide?.nNF ?? '',
        serie:        nfe.ide?.serie ?? '',
        dataEmissao:  nfe.ide?.dhEmi?.slice(0, 10) ?? '',
        emitente:     nfe.emit?.xNome ?? '',
        cnpjEmitente: nfe.emit?.CNPJ ?? '',
        valorTotal:   parseFloat(nfe.total?.ICMSTot?.vNF ?? '0'),
        status:       json?.protNFe?.infProt?.xMotivo ?? 'Autorizado',
      },
    }
  } catch (e: any) {
    return { ok: false, erro: e.message ?? 'Erro inesperado' }
  }
}

export async function vincularNFe(compraId: string, orgId: string, dados: {
  chaveAcesso: string
  serie: string
  dataEmissao: string
  emitente: string
  cnpjEmitente: string
  valorNfe: number
  numeroNf: string
}): Promise<{ ok: boolean; erro?: string }> {
  const admin = createAdminClient()

  const { error } = await admin
    .from('loja_compras')
    .update({
      chave_acesso_nfe: dados.chaveAcesso,
      serie_nfe:        dados.serie,
      data_emissao_nfe: dados.dataEmissao,
      emitente_nfe:     dados.emitente,
      cnpj_emitente:    dados.cnpjEmitente,
      valor_nfe:        dados.valorNfe,
      numero_nf:        dados.numeroNf,
      status_nfe:       'com_chave',
    })
    .eq('id', compraId)
    .eq('org_id', orgId)

  if (error) return { ok: false, erro: error.message }
  return { ok: true }
}

export async function kpisEntradasNFe(orgId: string, dataInicio: string, dataFim: string) {
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('loja_compras')
    .select('status_nfe, total')
    .eq('org_id', orgId)
    .gte('data_compra', dataInicio)
    .lte('data_compra', dataFim)

  if (error) throw new Error(error.message)

  const total      = (data ?? []).length
  const comChave   = (data ?? []).filter(r => r.status_nfe === 'com_chave').length
  const semChave   = (data ?? []).filter(r => r.status_nfe === 'sem_chave').length
  const valorTotal = (data ?? []).reduce((acc, r) => acc + (Number(r.total) ?? 0), 0)

  return { total, comChave, semChave, valorTotal }
}
