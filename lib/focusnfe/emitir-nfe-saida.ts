// lib/focusnfe/emitir-nfe-saida.ts
// Emite NF-e de saída (venda de cacau para comprador externo)
// CFOP 5102 | NCM 18010000 | CST ICMS 041 | PIS/COFINS CST 72

import { createAdminClient } from '@/lib/supabase/admin'
import { focusPost, focusGet, urlCompleta, sleep } from './client'

const FOCUS_MOD = 'comercializacao' as const

interface EmitirNfeSaidaParams {
  vendaId: string
  organizacao_id: string
  usuario_id?: string
  usuario_email?: string
}

export type ConsultarNfeSaidaResult = {
  sucesso: boolean
  status?: string
  chave_nfe?: string
  danfe_url?: string
  numero_nfe?: string | number
  serie_nfe?: string | number
  erro?: string
}

export function referenciaNfeSaida(organizacaoId: string, vendaId: string) {
  return `SAIDA-${organizacaoId.slice(0, 8)}-${vendaId.slice(0, 8)}`
}

export async function consultarNfeSaidaFocus(referencia: string) {
  return focusGet<any>(`/v2/nfe/${referencia}`, FOCUS_MOD)
}

/** Aplica resposta autorizada da Focus em vendas_externas (+ lançamento contábil se faltar). */
async function aplicarAutorizacaoNfeSaida(opts: {
  vendaId: string
  organizacao_id: string
  resposta: any
  valor_total: number
  usuario_id?: string
  usuario_email?: string
  compradorNome?: string
  loteCodigo?: string
}): Promise<{ chave_nfe?: string; danfe_url?: string }> {
  const supabase = createAdminClient()
  const { vendaId, organizacao_id, resposta, valor_total, usuario_id, usuario_email } = opts

  const danfe_url = urlCompleta(resposta.caminho_danfe, FOCUS_MOD)
  const xml_nfe = urlCompleta(resposta.caminho_xml_nota_fiscal, FOCUS_MOD) ?? null

  await supabase
    .from('vendas_externas')
    .update({
      status_nfe: 'autorizada',
      chave_nfe: resposta.chave_nfe,
      numero_nfe: resposta.numero,
      serie_nfe: resposta.serie,
      data_emissao_nfe: new Date().toISOString(),
      xml_nfe,
    } as any)
    .eq('id', vendaId)

  // Lançamento contábil só se ainda não existir (reconsulta de nota já autorizada na Focus)
  const { data: vendaAtual } = await supabase
    .from('vendas_externas')
    .select('lancamento_id, status')
    .eq('id', vendaId)
    .single()

  if (!vendaAtual?.lancamento_id) {
    try {
      const { criarLancamento } = await import('@/lib/financeiro/actions')
      const descricao = `NF-e ${resposta.numero}/${resposta.serie} — ${opts.compradorNome ?? 'Comprador'} — Lote ${opts.loteCodigo ?? ''}`

      const lancamento = await criarLancamento({
        organizacao_id,
        tipo: 'receita' as any,
        status: 'pendente' as any,
        descricao,
        valor: valor_total,
        data_competencia: new Date().toISOString().split('T')[0],
        numero_documento: `${resposta.numero}/${resposta.serie}`,
        observacoes: `NF-e chave: ${resposta.chave_nfe}`,
        usuario_id: usuario_id as string,
        usuario_email,
      })

      await supabase
        .from('vendas_externas')
        .update({ lancamento_id: lancamento.id } as any)
        .eq('id', vendaId)
    } catch (e) {
      console.error('[contabil] Erro ao criar lançamento NF-e saída:', e)
    }
  }

  if (vendaAtual?.status === 'rascunho') {
    await supabase
      .from('vendas_externas')
      .update({ status: 'confirmada' } as any)
      .eq('id', vendaId)
      .eq('status', 'rascunho')
  }

  return { chave_nfe: resposta.chave_nfe, danfe_url }
}

/**
 * Reconsulta a Focus e atualiza vendas_externas se a NF-e já autorizou/rejeitou.
 * Usado quando o status local ficou em "processando" (SEFAZ demorou > janela de polling).
 */
export async function sincronizarNfeSaida(params: {
  vendaId: string
  organizacao_id: string
  usuario_id?: string
  usuario_email?: string
}): Promise<ConsultarNfeSaidaResult> {
  const { vendaId, organizacao_id, usuario_id, usuario_email } = params
  const supabase = createAdminClient()

  const { data: venda } = await supabase
    .from('vendas_externas')
    .select(`
      id, quantidade_kg, preco_kg, valor_bruto, status_nfe, chave_nfe, numero_nfe, serie_nfe, xml_nfe,
      compradores(nome),
      lotes(codigo)
    `)
    .eq('id', vendaId)
    .eq('organizacao_id', organizacao_id)
    .maybeSingle()

  if (!venda) return { sucesso: false, erro: 'Venda não encontrada' }

  if (venda.status_nfe === 'autorizada' && venda.chave_nfe) {
    return {
      sucesso: true,
      status: 'autorizada',
      chave_nfe: venda.chave_nfe,
      numero_nfe: venda.numero_nfe ?? undefined,
      serie_nfe: venda.serie_nfe ?? undefined,
      danfe_url: venda.xml_nfe
        ? venda.xml_nfe.replace('/XMLs/', '/DANFEs/').replace('-nfe.xml', '-nfe.pdf')
        : undefined,
    }
  }

  const referencia = referenciaNfeSaida(organizacao_id, vendaId)

  let resposta: any
  try {
    resposta = await consultarNfeSaidaFocus(referencia)
  } catch (err: any) {
    return { sucesso: false, erro: err.message ?? 'Erro ao consultar Focus NFe' }
  }

  const statusFocus = resposta.status as string

  if (statusFocus === 'autorizado' || statusFocus === 'autorizado_em_contingencia') {
    const valor_total = Number(
      (Number(venda.quantidade_kg) * Number(venda.preco_kg)).toFixed(2)
    )
    const compradorNome = (venda as any).compradores?.nome
    const loteCodigo = (venda as any).lotes?.codigo

    const applied = await aplicarAutorizacaoNfeSaida({
      vendaId,
      organizacao_id,
      resposta,
      valor_total,
      usuario_id,
      usuario_email,
      compradorNome,
      loteCodigo,
    })

    return {
      sucesso: true,
      status: 'autorizada',
      chave_nfe: applied.chave_nfe,
      danfe_url: applied.danfe_url,
      numero_nfe: resposta.numero,
      serie_nfe: resposta.serie,
    }
  }

  if (statusFocus === 'processando_autorizacao') {
    await supabase
      .from('vendas_externas')
      .update({ status_nfe: 'processando' } as any)
      .eq('id', vendaId)
    return { sucesso: true, status: 'processando' }
  }

  if (statusFocus === 'erro_autorizacao' || statusFocus === 'denegado' || statusFocus === 'cancelado') {
    const motivo = resposta.erros?.map((e: any) => `${e.codigo}: ${e.mensagem}`).join('; ')
      || resposta.mensagem_sefaz
      || 'Rejeitada pela SEFAZ'

    await supabase
      .from('vendas_externas')
      .update({ status_nfe: 'erro' } as any)
      .eq('id', vendaId)

    return { sucesso: false, status: 'erro', erro: motivo }
  }

  return {
    sucesso: false,
    status: statusFocus,
    erro: resposta.mensagem_sefaz || `Status Focus: ${statusFocus}`,
  }
}

/** Sincroniza todas as NF-e de saída da org com status processando. */
export async function sincronizarNfesSaidaProcessando(params: {
  organizacao_id: string
  usuario_id?: string
  usuario_email?: string
}): Promise<{
  total: number
  autorizadas: number
  aindaProcessando: number
  erros: number
  detalhes: Array<{ vendaId: string; resultado: ConsultarNfeSaidaResult }>
}> {
  const supabase = createAdminClient()

  const { data: pendentes } = await supabase
    .from('vendas_externas')
    .select('id')
    .eq('organizacao_id', params.organizacao_id)
    .eq('status_nfe', 'processando')

  const ids = (pendentes ?? []).map(p => p.id)
  const detalhes: Array<{ vendaId: string; resultado: ConsultarNfeSaidaResult }> = []
  let autorizadas = 0
  let aindaProcessando = 0
  let erros = 0

  for (const vendaId of ids) {
    const resultado = await sincronizarNfeSaida({
      vendaId,
      organizacao_id: params.organizacao_id,
      usuario_id: params.usuario_id,
      usuario_email: params.usuario_email,
    })
    detalhes.push({ vendaId, resultado })
    if (resultado.status === 'autorizada') autorizadas++
    else if (resultado.status === 'processando') aindaProcessando++
    else erros++
  }

  return {
    total: ids.length,
    autorizadas,
    aindaProcessando,
    erros,
    detalhes,
  }
}

export async function emitirNfeSaida(params: EmitirNfeSaidaParams): Promise<{
  sucesso: boolean
  chave_nfe?: string
  danfe_url?: string
  erro?: string
  processando?: boolean
}> {
  const { vendaId, organizacao_id, usuario_id, usuario_email } = params
  const supabase = createAdminClient()

  const { data: venda } = await supabase
    .from('vendas_externas')
    .select(`
      id, quantidade_kg, preco_kg, valor_bruto, lote_id, status_nfe, chave_nfe,
      compradores(id, nome, cnpj, ie, logradouro, numero, bairro, cep, municipio, uf),
      lotes(codigo, produto_descricao, safras(ano), lote_itens(produto_id, peso_kg, produtos(nome, ncm, cfop_saida_interna, cfop_saida_interestadual, cst_icms, cst_pis, cst_cofins)))
    `)
    .eq('id', vendaId)
    .single()

  if (!venda) return { sucesso: false, erro: 'Venda não encontrada' }

  // Se já está processando localmente, só reconsulta a Focus (não reenvia)
  if ((venda as any).status_nfe === 'processando') {
    const sync = await sincronizarNfeSaida({
      vendaId,
      organizacao_id,
      usuario_id,
      usuario_email,
    })
    if (sync.status === 'autorizada') {
      return { sucesso: true, chave_nfe: sync.chave_nfe, danfe_url: sync.danfe_url }
    }
    if (sync.status === 'processando') {
      return { sucesso: true, processando: true }
    }
    return { sucesso: false, erro: sync.erro ?? 'Falha na reconsulta da NF-e' }
  }

  const comprador = (venda as any).compradores
  if (!comprador?.cnpj) return { sucesso: false, erro: 'CNPJ do comprador não cadastrado' }

  const { data: org } = await supabase
    .from('organizacoes')
    .select('nome, cnpj, loja_nfe_saida_serie')
    .eq('id', organizacao_id)
    .single()

  if (!org?.cnpj) return { sucesso: false, erro: 'CNPJ da organização não configurado' }

  // Idempotência
  if ((venda as any).status_nfe === 'autorizada' && (venda as any).chave_nfe) {
    return { sucesso: true, chave_nfe: (venda as any).chave_nfe }
  }

  const cnpjEmitente = org.cnpj.replace(/\D/g, '')
  const cnpjDestinatario = comprador.cnpj.replace(/\D/g, '')
  const serie = (org as any).loja_nfe_saida_serie ?? '001'
  const referencia = referenciaNfeSaida(organizacao_id, vendaId)

  const quantidade_kg = Number(venda.quantidade_kg)
  const preco_kg = Number(venda.preco_kg)
  const valor_total = Number((quantidade_kg * preco_kg).toFixed(2))

  const agora = new Date()
  const agoraBrasilia = new Date(agora.getTime() - 3 * 60 * 60 * 1000)
  const dataEmissao = agoraBrasilia.toISOString().replace('Z', '-03:00')

  const payload = {
    natureza_operacao: 'Venda de producao do estabelecimento rural',
    data_emissao: dataEmissao,
    forma_pagamento: '0',
    serie,
    tipo_documento: '1',
    local_destino: '1',
    finalidade_emissao: '1',
    consumidor_final: '0',
    presenca_comprador: '0',
    modalidade_frete: '9',

    cnpj_emitente: cnpjEmitente,

    cnpj_destinatario: cnpjDestinatario,
    nome_destinatario: comprador.nome,
    inscricao_estadual_destinatario: comprador.ie ?? '',
    indicador_inscricao_estadual_destinatario: comprador.ie ? '1' : '9',
    logradouro_destinatario: comprador.logradouro ?? 'Nao informado',
    numero_destinatario: comprador.numero ?? 'S/N',
    bairro_destinatario: comprador.bairro ?? 'Nao informado',
    municipio_destinatario: comprador.municipio ?? 'Ibirataia',
    uf_destinatario: comprador.uf ?? 'BA',
    cep_destinatario: (comprador.cep ?? '45430000').replace(/\D/g, ''),
    pais_destinatario: 'Brasil',
    codigo_pais_destinatario: '1058',

    items: [
      {
        numero_item: '1',
        codigo_produto: 'CACAU-AMEND',
        descricao: 'Cacau em Amendoa',
        cfop: '5102',
        codigo_ncm: '18010000',
        unidade_comercial: 'KG',
        unidade_tributavel: 'KG',
        quantidade_comercial: quantidade_kg.toFixed(3),
        quantidade_tributavel: quantidade_kg.toFixed(3),
        valor_unitario_comercial: preco_kg.toFixed(4),
        valor_unitario_tributavel: preco_kg.toFixed(4),
        valor_bruto: valor_total.toFixed(2),
        inclui_no_total: '1',
        icms_origem: '0',
        icms_situacao_tributaria: '41',
        pis_situacao_tributaria: '72',
        cofins_situacao_tributaria: '72',
      }
    ],

    icms_base_calculo: '0.00',
    icms_valor_total: '0.00',
    pis_valor_total: '0.00',
    cofins_valor_total: '0.00',
    valor_produtos: valor_total.toFixed(2),
    valor_total_nota: valor_total.toFixed(2),

    informacoes_adicionais_contribuinte: `Venda de cacau em amendoa. Ref: ${referencia}`,
  }

  let focusResposta: any
  try {
    focusResposta = await focusPost(`/v2/nfe?ref=${referencia}`, payload, FOCUS_MOD)
  } catch (err: any) {
    // Pode ser reenvio da mesma ref já existente na Focus — tenta reconsultar
    const msg = String(err.message ?? '')
    if (msg.includes('ja_existe') || msg.includes('já existe') || msg.includes('nfe_autorizada') || msg.includes('em_processamento')) {
      const sync = await sincronizarNfeSaida({ vendaId, organizacao_id, usuario_id, usuario_email })
      if (sync.status === 'autorizada') {
        return { sucesso: true, chave_nfe: sync.chave_nfe, danfe_url: sync.danfe_url }
      }
      if (sync.status === 'processando') {
        return { sucesso: true, processando: true }
      }
    }
    await supabase.from('vendas_externas').update({ status_nfe: 'erro' } as any).eq('id', vendaId)
    return { sucesso: false, erro: err.message }
  }

  let statusFocus = focusResposta.status
  let respostaFinal = focusResposta

  // Polling ampliado: ~30s (10 × 3s) — SEFAZ às vezes passa de 9s
  if (statusFocus === 'processando_autorizacao') {
    for (let i = 0; i < 10; i++) {
      await sleep(3000)
      try {
        respostaFinal = await consultarNfeSaidaFocus(referencia)
        statusFocus = respostaFinal.status
        if (statusFocus !== 'processando_autorizacao') break
      } catch { /* mantém processando e tenta de novo */ }
    }
  }

  if (statusFocus === 'autorizado' || statusFocus === 'autorizado_em_contingencia') {
    const loteInfo = (venda as any).lotes
    const compradorInfo = (venda as any).compradores
    const applied = await aplicarAutorizacaoNfeSaida({
      vendaId,
      organizacao_id,
      resposta: respostaFinal,
      valor_total,
      usuario_id,
      usuario_email,
      compradorNome: compradorInfo?.nome,
      loteCodigo: loteInfo?.codigo,
    })
    return { sucesso: true, chave_nfe: applied.chave_nfe, danfe_url: applied.danfe_url }
  }

  if (statusFocus === 'processando_autorizacao') {
    await supabase.from('vendas_externas').update({ status_nfe: 'processando' } as any).eq('id', vendaId)
    // Sucesso parcial: nota foi aceita pela Focus, autorização pendente — reconsulta depois
    return { sucesso: true, processando: true }
  }

  const motivo = respostaFinal.erros?.map((e: any) => `${e.codigo}: ${e.mensagem}`).join('; ')
    || respostaFinal.mensagem_sefaz
    || 'Rejeitada pela SEFAZ'

  await supabase.from('vendas_externas').update({ status_nfe: 'erro' } as any).eq('id', vendaId)
  return { sucesso: false, erro: motivo }
}
