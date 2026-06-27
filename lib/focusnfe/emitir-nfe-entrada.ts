// lib/focusnfe/emitir-nfe-entrada.ts
// Emite NF-e de entrada (compra de cacau de produtor rural)
// CFOP 1159 = cooperado | CFOP 1102 = não cooperado
// NCM 18010000 | Série 002 | CST ICMS 041 | PIS/COFINS CST 72 | FUNRURAL 1,63%

import { createAdminClient } from '@/lib/supabase/admin'
import { focusPost, focusGet, FOCUS_BASE_URL } from './client'

// CNPJ da COOPAIBI (emitente) — vem da org, mas fixamos como fallback
const CNPJ_COOPAIBI = '54305114000179'
const SERIE = '002'
const NCM = '18010000'
const UNIDADE_COMERCIAL = 'KG'

// Monta URL completa para XML/DANFE retornados como path relativo pela Focus
function urlCompleta(path?: string): string | undefined {
  if (!path) return undefined
  if (path.startsWith('http')) return path
  return `${FOCUS_BASE_URL}${path}`
}

// Aguarda em ms
function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

interface EmitirNfeEntradaParams {
  movimentacao_id: string
  organizacao_id: string
  preco_unitario_override?: number
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
          cooperado_id, ie_produtor_rural, tipo_posse
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
  const isCooperado = !!produtor.cooperado_id || produtor.tipo === 'cooperado'
  const cfop = isCooperado ? '1159' : '1102'

  // 3. Determinar preço unitário
  let preco_unitario: number

  if (params.preco_unitario_override && params.preco_unitario_override > 0) {
    preco_unitario = params.preco_unitario_override
  } else {
    const dataMovimentacao = new Date(mov.created_at).toISOString().split('T')[0]
    const { data: cotacao } = await supabase
      .from('cotacoes')
      .select('preco_cooperado, preco_externo')
      .eq('organizacao_id', params.organizacao_id)
      .eq('produto_id', mov.produto_id as any)
      .lte('vigente_a_partir_de', new Date().toISOString())
      .order('vigente_a_partir_de', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!cotacao) {
      return { sucesso: false, erro: 'Cotação não encontrada para a data da entrega' }
    }

    preco_unitario = isCooperado
      ? Number(cotacao.preco_cooperado)
      : Number(cotacao.preco_externo)

    if (!preco_unitario || preco_unitario <= 0) {
      return { sucesso: false, erro: 'Preço unitário inválido na cotação' }
    }
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

  // 6b. Gerar numero_sequencial via RPC (evita colisão com unique constraint)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: numeroData, error: numErr } = await (supabase as any)
    .rpc('proximo_numero_nota', { p_org_id: params.organizacao_id })

  if (numErr) {
    return { sucesso: false, erro: 'Erro ao gerar número sequencial: ' + numErr.message }
  }
  const numero_sequencial = numeroData as number

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
      numero_sequencial,
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

  // Data/hora de emissão no horário de Brasília (UTC-3), formato ISO 8601 com offset
  const agora = new Date()
  const agoraBrasilia = new Date(agora.getTime() - 3 * 60 * 60 * 1000)
  const dataEmissao = agoraBrasilia.toISOString().replace('Z', '-03:00')

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
    modalidade_frete: '9', // 9 = sem frete

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
        codigo_ncm: NCM,
        unidade_comercial: UNIDADE_COMERCIAL,
        unidade_tributavel: UNIDADE_COMERCIAL,
        quantidade_comercial: quantidade_kg.toFixed(3),
        quantidade_tributavel: quantidade_kg.toFixed(3),
        valor_unitario_comercial: preco_unitario.toFixed(4),
        valor_unitario_tributavel: preco_unitario.toFixed(4),
        valor_bruto: valor_total.toFixed(2),
        inclui_no_total: '1',

        // ICMS - CST 41 (Não tributada), origem 0 (nacional)
        icms_origem: '0',
        icms_situacao_tributaria: '41',

        // PIS - CST 72 (Aquisição para Revenda com Suspensão)
        pis_situacao_tributaria: '72',

        // COFINS - CST 72
        cofins_situacao_tributaria: '72',

        // FUNRURAL retido na fonte (1,63%) — informativo
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
    // A Focus retorna "already_processed" quando a referência já foi autorizada anteriormente.
    // Nesse caso, consultamos o status real em vez de salvar como erro.
    if (err.message?.includes('already_processed')) {
      try {
        const consultaResp = await consultarNfeEntrada(referencia)
        if (consultaResp.status === 'autorizado') {
          await supabase
            .from('notas_entrega')
            .update({
              status: 'autorizada' as any,
              chave_nfe: consultaResp.chave_nfe,
              numero_nfe: consultaResp.numero,
              xml_url: urlCompleta(consultaResp.caminho_xml_nota_fiscal),
              danfe_url: urlCompleta(consultaResp.caminho_danfe),
              emitido_em: new Date().toISOString(),
            })
            .eq('id', notaRecord.id)

          return {
            sucesso: true,
            nota_id: notaRecord.id,
            chave_nfe: consultaResp.chave_nfe,
            danfe_url: urlCompleta(consultaResp.caminho_danfe),
          }
        }
      } catch {
        // Se a consulta também falhar, cai no tratamento padrão abaixo
      }
    }

    await supabase
      .from('notas_entrega')
      .update({ status: 'erro' as any, motivo_rejeicao: err.message })
      .eq('id', notaRecord.id)
    return { sucesso: false, erro: err.message }
  }

  // 10. Processar resposta
  let statusFocus = focusResposta.status
  let respostaFinal = focusResposta

  // Se ainda processando, faz polling (até 3 tentativas, 3s entre cada)
  if (statusFocus === 'processando_autorizacao') {
    for (let tentativa = 0; tentativa < 3; tentativa++) {
      await sleep(3000)
      try {
        respostaFinal = await consultarNfeEntrada(referencia)
        statusFocus = respostaFinal.status
        if (statusFocus !== 'processando_autorizacao') break
      } catch {
        // mantém status processando se a consulta falhar
      }
    }
  }

  if (statusFocus === 'autorizado') {
    await supabase
      .from('notas_entrega')
      .update({
        status: 'autorizada' as any,
        chave_nfe: respostaFinal.chave_nfe,
        numero_nfe: respostaFinal.numero,
        xml_url: urlCompleta(respostaFinal.caminho_xml_nota_fiscal),
        danfe_url: urlCompleta(respostaFinal.caminho_danfe),
        emitido_em: new Date().toISOString(),
      })
      .eq('id', notaRecord.id)

    return {
      sucesso: true,
      nota_id: notaRecord.id,
      chave_nfe: respostaFinal.chave_nfe,
      danfe_url: urlCompleta(respostaFinal.caminho_danfe),
    }
  }

  if (statusFocus === 'processando_autorizacao' || statusFocus === 'autorizado_em_contingencia') {
    // Ainda processando após as tentativas — salva e retorna para consulta posterior
    await supabase
      .from('notas_entrega')
      .update({ status: 'processando' as any })
      .eq('id', notaRecord.id)

    return { sucesso: true, nota_id: notaRecord.id }
  }

  // Rejeitada ou erro
  const motivo = respostaFinal.erros?.map(e => `${e.codigo}: ${e.mensagem}`).join('; ')
    || respostaFinal.mensagem_sefaz
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
