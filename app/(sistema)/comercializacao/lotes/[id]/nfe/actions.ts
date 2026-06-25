'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getUsuarioLogado } from '@/lib/auth'
import { focusPost, focusGet, FOCUS_BASE_URL } from '@/lib/focusnfe/client'

function urlCompleta(path?: string): string | undefined {
  if (!path) return undefined
  if (path.startsWith('http')) return path
  return `${FOCUS_BASE_URL}${path}`
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function emitirNfeSaidaAction(vendaId: string): Promise<{
  sucesso: boolean
  chave_nfe?: string
  danfe_url?: string
  erro?: string
}> {
  const usuario = await getUsuarioLogado()
  const supabase = createAdminClient()

  // 1. Buscar venda com comprador e lote
  const { data: venda } = await supabase
    .from('vendas_externas')
    .select(`
      id, quantidade_kg, preco_kg, valor_bruto, lote_id,
      compradores(id, nome, cnpj, ie, logradouro, numero, bairro, cep, municipio, uf),
      lotes(codigo, produto_descricao, safras(ano), lote_itens(produto_id, peso_kg, produtos(nome, ncm, cfop_saida_interna, cfop_saida_interestadual, cst_icms, cst_pis, cst_cofins)))
    `)
    .eq('id', vendaId)
    .single()

  if (!venda) return { sucesso: false, erro: 'Venda não encontrada' }

  const comprador = (venda as any).compradores
  if (!comprador?.cnpj) return { sucesso: false, erro: 'CNPJ do comprador não cadastrado' }

  // 2. Buscar org emitente
  const { data: org } = await supabase
    .from('organizacoes')
    .select('nome, cnpj, loja_nfe_saida_serie')
    .eq('id', usuario.organizacao_id as string)
    .single()

  if (!org?.cnpj) return { sucesso: false, erro: 'CNPJ da organização não configurado' }

  // 3. Idempotência
  const { data: vendaAtual } = await supabase
    .from('vendas_externas')
    .select('chave_nfe, status_nfe')
    .eq('id', vendaId)
    .single()

  if (vendaAtual?.status_nfe === 'autorizada' && vendaAtual?.chave_nfe) {
    return { sucesso: true, chave_nfe: vendaAtual.chave_nfe }
  }

  const cnpjEmitente = org.cnpj.replace(/\D/g, '')
  const cnpjDestinatario = comprador.cnpj.replace(/\D/g, '')
  const serie = (org as any).loja_nfe_saida_serie ?? '001'
  const referencia = `SAIDA-${usuario.organizacao_id!.slice(0, 8)}-${vendaId.slice(0, 8)}`

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

  // 4. Enviar para Focus NFe
  let focusResposta: any
  try {
    focusResposta = await focusPost(`/v2/nfe?ref=${referencia}`, payload)
  } catch (err: any) {
    await supabase.from('vendas_externas').update({ status_nfe: 'erro' } as any).eq('id', vendaId)
    return { sucesso: false, erro: err.message }
  }

  let statusFocus = (focusResposta as any).status
  let respostaFinal = focusResposta

  if (statusFocus === 'processando_autorizacao') {
    for (let i = 0; i < 3; i++) {
      await sleep(3000)
      try {
        respostaFinal = await focusGet(`/v2/nfe/${referencia}`)
        statusFocus = (respostaFinal as any).status
        if (statusFocus !== 'processando_autorizacao') break
      } catch {}
    }
  }

  if (statusFocus === 'autorizado') {
    const danfe_url = urlCompleta((respostaFinal as any).caminho_danfe)
    await supabase
      .from('vendas_externas')
      .update({
        status_nfe: 'autorizada',
        chave_nfe: (respostaFinal as any).chave_nfe,
        numero_nfe: (respostaFinal as any).numero,
        serie_nfe: (respostaFinal as any).serie,
        data_emissao_nfe: new Date().toISOString(),
        xml_nfe: urlCompleta((respostaFinal as any).caminho_xml_nota_fiscal) ?? null,
      } as any)
      .eq('id', vendaId)

    try {
      const { criarLancamento } = await import('@/lib/financeiro/actions')
      const loteInfo = (venda as any).lotes
      const compradorInfo = (venda as any).compradores
      const descricao = `NF-e ${(respostaFinal as any).numero}/${(respostaFinal as any).serie} — ${compradorInfo?.nome ?? 'Comprador'} — Lote ${loteInfo?.codigo ?? ''}`

      const lancamento = await criarLancamento({
        organizacao_id: usuario.organizacao_id!,
        tipo: 'receita' as any,
        status: 'pago' as any,
        descricao,
        valor: valor_total,
        data_competencia: new Date().toISOString().split('T')[0],
        data_pagamento: new Date().toISOString().split('T')[0],
        numero_documento: `${(respostaFinal as any).numero}/${(respostaFinal as any).serie}`,
        observacoes: `NF-e chave: ${(respostaFinal as any).chave_nfe}`,
        usuario_id: usuario.id,
        usuario_email: usuario.email ?? undefined,
      })

      await supabase
        .from('vendas_externas')
        .update({ lancamento_id: lancamento.id } as any)
        .eq('id', vendaId)
    } catch (e) {
      console.error('[contabil] Erro ao criar lançamento NF-e saída:', e)
    }

    return { sucesso: true, chave_nfe: (respostaFinal as any).chave_nfe, danfe_url }
  }

  if (statusFocus === 'processando_autorizacao') {
    await supabase.from('vendas_externas').update({ status_nfe: 'processando' } as any).eq('id', vendaId)
    return { sucesso: true }
  }

  const motivo = (respostaFinal as any).erros?.map((e: any) => `${e.codigo}: ${e.mensagem}`).join('; ')
    || (respostaFinal as any).mensagem_sefaz
    || 'Rejeitada pela SEFAZ'

  await supabase.from('vendas_externas').update({ status_nfe: 'erro' } as any).eq('id', vendaId)
  return { sucesso: false, erro: motivo }
}

import { gerarZipEEnviarEmail } from '@/lib/comercializacao/zip-lote'

export async function gerarZipLoteAction(loteId: string) {
  return gerarZipEEnviarEmail(loteId)
}
