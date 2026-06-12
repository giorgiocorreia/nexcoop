// lib/focusnfe/emitir-nfe-entrada.ts
// Emite NF-e de entrada (compra de cacau de produtor rural)
// CFOP 1159 = cooperado | CFOP 1102 = não cooperado
// NCM 18010000 | Série 002 | CST ICMS 041 | PIS/COFINS CST 72 | FUNRURAL 1,63%

import { createAdminClient } from '@/lib/supabase/admin'
import { focusPost, focusGet } from './client'

// CNPJ da COOPAIBI (emitente) — vem da org, mas fixamos como fallback
const CNPJ_COOPAIBI = '54305114000179'
const SERIE = '002'
const NCM = '18010000'
const UNIDADE_COMERCIAL = 'KG'

interface EmitirNfeEntradaParams {
  movimentacao_id: string
  organizacao_id: string
}

interface FocusNfeResponse {
  status: string
  ref: string
  chave_nfe?: string
  numero?: string
  serie?: string
  caminho_xml_nota_fiscal?: string
  caminho_danfe?: string
  mensagem_sefaz?: string
  erros?: Array<{ codigo: string; mensagem: string }>
}

export async function emitirNfeEntrada(params: EmitirNfeEntradaParams): Promise<{
  sucesso: boolean
  nota_id?: string
  chave_nfe?: string
  danfe_url?: string
  erro?: string
}> {
  const supabase = createAdminClient()

  // 1. Buscar movimentação com dados do produtor e produto
  const { data: mov, error: movErr } = await supabase
    .from('movimentacoes_conta')
    .select(`
      id,
      quantidade_produto,
      created_at,
      produto_id,
      produtos!produto_id(nome, unidade),
      contas_produtor!conta_id(
        produtor_id,
        produtores!produtor_id(
          id, nome, cpf, municipio, endereco, tipo,
          ie_produtor_rural, tipo_posse
        )
      )
    `)
    .eq('id', params.movimentacao_id)
    .single()

  if (movErr || !mov) {
    return { sucesso: false, erro: 'Movimentação não encontrada' }
  }

  const contaProdutor = (mov as any).contas_produtor
  const produtorRaw = Array.isArray(contaProdutor)
    ? contaProdutor[0]?.produtores
    : contaProdutor?.produtores
  const produtor = Array.isArray(produtorRaw) ? produtorRaw[0] : produtorRaw

  if (!produtor) return { sucesso: false, erro: 'Produtor não encontrado na movimentação' }
  if (!produtor.cpf) return { sucesso: false, erro: 'CPF do produtor não cadastrado. Atualize o cadastro.' }

  // 2. Determinar CFOP e preço conforme tipo do produtor
  const isCooperado = produtor.tipo === 'cooperado'
  const cfop = isCooperado ? '1159' : '1102'

  // 3. Buscar cotação vigente na data da movimentação
  const dataMovimentacao = new Date(mov.created_at).toISOString().split('T')[0]
  const { data: cotacao } = await supabase
    .from('cotacoes')
    .select('preco_cooperado, preco_externo')
    .eq('organizacao_id', params.organizacao_id)
    .eq('produto_id', mov.produto_id as string)
    .lte('data', dataMovimentacao)
    .order('data', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!cotacao) {
    return { sucesso: false, erro: 'Cotação não encontrada para a data da entrega' }
  }

  const preco_unitario = isCooperado
    ? Number(cotacao.preco_cooperado)
    : Number(cotacao.preco_externo)

  if (!preco_unitario || preco_unitario <= 0) {
    return { sucesso: false, erro: 'Preço unitário inválido na cotação' }
  }

  const quantidade_kg = Number(mov.quantidade_produto)
  const valor_total = Number((quantidade_kg * preco_unitario).toFixed(2))

  // 4. Buscar dados da organização emitente
  const { data: org } = await supabase
    .from('organizacoes')
    .select('nome, cnpj')
    .eq('id', params.organizacao_id)
    .single()

  if (!org?.cnpj) return { sucesso: false, erro: 'CNPJ da organização não configurado' }

  // 5. Buscar nota existente para idempotência
  const { data: notaExistente } = await supabase
    .from('notas_entrega')
    .select('id, referencia, status, chave_nfe, danfe_url')
    .eq('movimentacao_id', params.movimentacao_id)
    .eq('status', 'autorizada' as any)
    .maybeSingle()

  if (notaExistente?.chave_nfe) {
    return {
      sucesso: true,
      nota_id: notaExistente.id,
      chave_nfe: notaExistente.chave_nfe as string | undefined,
      danfe_url: (notaExistente.danfe_url as string | null) ?? undefined,
    }
  }

  // 6. Gerar referência única
  const referencia = `ENT-${params.organizacao_id.slice(0, 8)}-${params.movimentacao_id.slice(0, 8)}`

  // 7. Criar/atualizar registro na notas_entrega com status processando
  const { data: notaRecord, error: insertErr } = await supabase
    .from('notas_entrega')
    .upsert({
      organizacao_id: params.organizacao_id,
      movimentacao_id: params.movimentacao_id,
      produtor_id: produtor.id,
      quantidade_kg,
      valor_unitario: preco_unitario,
      valor_total,
      cfop,
      serie: SERIE,
      referencia,
      status: 'processando' as any,
      numero_sequencial: 0, // será atualizado após autorização
    }, { onConflict: 'movimentacao_id' })
    .select('id')
    .single()

  if (insertErr || !notaRecord) {
    return { sucesso: false, erro: 'Erro ao criar registro da nota: ' + insertErr?.message }
  }

  // 8. Montar payload Focus NFe
  const cpfLimpo = produtor.cpf.replace(/\D/g, '')
  const cnpjEmitente = (org.cnpj || CNPJ_COOPAIBI).replace(/\D/g, '')

  // FUNRURAL 1,63% sobre valor bruto (retido na fonte)
  const valor_funrural = Number((valor_total * 0.0163).toFixed(2))

  // Data/hora de emissão no formato ISO 8601 com timezone (-03:00)
  const dataEmissao = new Date().toISOString().replace('Z', '-03:00')

  const payload = {
    natureza_operacao: isCooperado
      ? 'Compra de producao do estabelecimento rural - cooperado'
      : 'Compra de producao do estabelecimento rural',
    data_emissao: dataEmissao,
    forma_pagamento: '0', // 0 = à vista
    serie: SERIE,
    tipo_documento: '0', // 0 = entrada
    local_destino: '1', // 1 = operação interna
    finalidade_emissao: '1', // 1 = NF-e normal
    consumidor_final: '0',
    presenca_comprador: '2', // 2 = operação não presencial

    // Emitente (COOPAIBI)
    cnpj_emitente: cnpjEmitente,

    // Destinatário = produtor rural (pessoa física)
    nome_destinatario: produtor.nome,
    cpf_destinatario: cpfLimpo,
    inscricao_estadual_destinatario: produtor.ie_produtor_rural || '',
    indicador_inscricao_estadual_destinatario: produtor.ie_produtor_rural ? '1' : '9',
    email_destinatario: '',
    telefone_destinatario: '',
    logradouro_destinatario: produtor.endereco || 'Zona Rural',
    numero_destinatario: 'S/N',
    bairro_destinatario: 'Zona Rural',
    municipio_destinatario: produtor.municipio || 'Ibirataia',
    uf_destinatario: 'BA',
    cep_destinatario: '45430000',
    pais_destinatario: 'Brasil',
    codigo_pais_destinatario: '1058',

    // Item
    items: [
      {
        numero_item: '1',
        codigo_produto: 'CACAU-AMEND',
        descricao: 'Cacau em Amendoa',
        cfop,
        ncm: NCM,
        unidade_comercial: UNIDADE_COMERCIAL,
        unidade_tributavel: UNIDADE_COMERCIAL,
        quantidade_comercial: quantidade_kg.toFixed(3),
        quantidade_tributavel: quantidade_kg.toFixed(3),
        valor_unitario_comercial: preco_unitario.toFixed(4),
        valor_unitario_tributavel: preco_unitario.toFixed(4),
        valor_bruto: valor_total.toFixed(2),
        inclui_no_total: '1',

        // ICMS CST 041 - Não tributado (imune/isento para produtor rural)
        icms_modalidade: '40',
        icms_cst: '041',
        icms_origem: '0',

        // PIS CST 72 - Operações de Aquisição para Revenda com Suspensão
        pis_modalidade: 'NT',
        pis_cst: '72',

        // COFINS CST 72
        cofins_modalidade: 'NT',
        cofins_cst: '72',

        // FUNRURAL retido na fonte (1,63%)
        valor_senar: valor_funrural.toFixed(2),
      }
    ],

    // Totais
    icms_base_calculo: '0.00',
    icms_valor_total: '0.00',
    pis_valor_total: '0.00',
    cofins_valor_total: '0.00',
    valor_produtos: valor_total.toFixed(2),
    valor_total_nota: valor_total.toFixed(2),

    // Informações adicionais
    informacoes_adicionais_contribuinte: `FUNRURAL retido: R$ ${valor_funrural.toFixed(2)} (1,63%). Referencia: ${referencia}`,
  }

  // 9. Enviar para Focus NFe
  let focusResposta: FocusNfeResponse
  try {
    focusResposta = await focusPost<FocusNfeResponse>(
      `/v2/nfe?ref=${referencia}`,
      payload
    )
  } catch (err: any) {
    await supabase
      .from('notas_entrega')
      .update({ status: 'erro' as any, motivo_rejeicao: err.message })
      .eq('id', notaRecord.id)
    return { sucesso: false, erro: err.message }
  }

  // 10. Processar resposta
  const statusFocus = focusResposta.status

  if (statusFocus === 'autorizado') {
    await supabase
      .from('notas_entrega')
      .update({
        status: 'autorizada' as any,
        chave_nfe: focusResposta.chave_nfe,
        numero_nfe: focusResposta.numero,
        xml_url: focusResposta.caminho_xml_nota_fiscal,
        danfe_url: focusResposta.caminho_danfe,
        emitido_em: new Date().toISOString(),
      })
      .eq('id', notaRecord.id)

    return {
      sucesso: true,
      nota_id: notaRecord.id,
      chave_nfe: focusResposta.chave_nfe,
      danfe_url: focusResposta.caminho_danfe,
    }
  }

  if (statusFocus === 'processando_autorizacao' || statusFocus === 'autorizado_em_contingencia') {
    // NF-e em processamento — salva e retorna para polling posterior
    await supabase
      .from('notas_entrega')
      .update({ status: 'processando' as any })
      .eq('id', notaRecord.id)

    return { sucesso: true, nota_id: notaRecord.id }
  }

  // Rejeitada ou erro
  const motivo = focusResposta.erros?.map(e => `${e.codigo}: ${e.mensagem}`).join('; ')
    || focusResposta.mensagem_sefaz
    || 'Rejeitada pela SEFAZ'

  await supabase
    .from('notas_entrega')
    .update({ status: 'rejeitada' as any, motivo_rejeicao: motivo })
    .eq('id', notaRecord.id)

  return { sucesso: false, nota_id: notaRecord.id, erro: motivo }
}

// Consulta status de uma NF-e na Focus (para polling)
export async function consultarNfeEntrada(referencia: string): Promise<FocusNfeResponse> {
  return focusGet<FocusNfeResponse>(`/v2/nfe/${referencia}`)
}
