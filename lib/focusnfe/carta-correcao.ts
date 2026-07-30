// lib/focusnfe/carta-correcao.ts
// Carta de Correção Eletrônica (CC-e) de NF-e — evento 110110
// Docs: https://focusnfe.com.br/doc/ (POST /v2/nfe/{referencia}/carta_correcao)
//
// LIMITE LEGAL (Ajuste SINIEF 07/05, art. 7º §1º-A): a CC-e NÃO corrige valores,
// base de cálculo, alíquota, CST, dados do destinatário nem data de emissão.
// Serve para natureza da operação, dados de transporte, informações
// complementares e afins. Erro de tributação exige cancelamento (≤24h) ou
// nota de ajuste — não carta.
//
// A mesma NF-e aceita até 20 cartas, e cada uma SUBSTITUI as anteriores: a
// carta válida é sempre a última. Por isso a correção nova precisa repetir
// tudo que ainda vale das anteriores.

import { focusPost, urlCompleta } from './client'

export const CCE_MIN_CARACTERES = 15
export const CCE_MAX_CARACTERES = 1000

// Caracteres de controle (inclusive quebra de linha e tab) — proibidos em
// xCorrecao. Construído a partir de string para o arquivo não carregar bytes
// de controle literais.
const CARACTERES_CONTROLE = new RegExp('[\\u0000-\\u001F\\u007F]', 'g')

/**
 * Normaliza o texto da correção para o que a SEFAZ aceita no campo xCorrecao:
 * sem caracteres de controle e sem espaços repetidos. Rejeição comum vem de
 * texto colado de editor, com quebra de linha e espaço duplo.
 */
export function normalizarCorrecao(texto: string): string {
  return texto
    .replace(CARACTERES_CONTROLE, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function validarCorrecao(texto: string): string | null {
  const t = normalizarCorrecao(texto)
  if (t.length < CCE_MIN_CARACTERES) {
    return `A correção precisa de no mínimo ${CCE_MIN_CARACTERES} caracteres (tem ${t.length}).`
  }
  if (t.length > CCE_MAX_CARACTERES) {
    return `A correção passa do limite de ${CCE_MAX_CARACTERES} caracteres (tem ${t.length}).`
  }
  return null
}

export type CartaCorrecaoResultado = {
  sucesso: boolean
  erro?: string
  correcao?: string
  sequencia?: number
  xml_url?: string
  pdf_url?: string
  mensagem_sefaz?: string
}

/**
 * Emite a CC-e na Focus para a NF-e identificada pela referência de emissão.
 * A Focus controla o nSeqEvento — não mandamos sequência.
 */
export async function emitirCartaCorrecao(params: {
  referencia: string
  correcao: string
}): Promise<CartaCorrecaoResultado> {
  const correcao = normalizarCorrecao(params.correcao)
  const erroValidacao = validarCorrecao(correcao)
  if (erroValidacao) return { sucesso: false, erro: erroValidacao }

  let resposta: any
  try {
    resposta = await focusPost(
      `/v2/nfe/${params.referencia}/carta_correcao`,
      { correcao },
      'comercializacao',
    )
  } catch (e: any) {
    return { sucesso: false, erro: e?.message ?? 'Falha ao comunicar com a SEFAZ.', correcao }
  }

  const status = String(resposta?.status ?? '')
  const mensagem = resposta?.mensagem_sefaz ?? resposta?.mensagem ?? undefined

  // Verificado em homologação: a Focus devolve status 'autorizado' com
  // status_sefaz 135 quando o evento é aceito.
  if (status && status !== 'registrado' && status !== 'autorizado') {
    // Rejeição 494 nos primeiros minutos depois da autorização é só a nota
    // ainda não ter propagado no ambiente de eventos da SEFAZ — não é erro do
    // texto nem da nota, e resolve sozinho esperando.
    const aindaPropagando =
      String(resposta?.status_sefaz ?? '') === '494' || /inexistente/i.test(String(mensagem ?? ''))

    return {
      sucesso: false,
      correcao,
      erro: aindaPropagando
        ? 'A SEFAZ ainda não reconhece esta NF-e para eventos. Isso acontece nos primeiros minutos após a autorização — aguarde e tente de novo.'
        : mensagem ?? `SEFAZ não registrou a carta (status: ${status}).`,
      mensagem_sefaz: mensagem,
    }
  }

  const sequenciaBruta = resposta?.numero_carta_correcao ?? resposta?.numero_sequencial_evento
  const sequencia = Number(sequenciaBruta)

  return {
    sucesso: true,
    correcao,
    sequencia: Number.isFinite(sequencia) && sequencia > 0 ? sequencia : undefined,
    xml_url: urlCompleta(resposta?.caminho_xml_carta_correcao, 'comercializacao'),
    pdf_url: urlCompleta(resposta?.caminho_pdf_carta_correcao, 'comercializacao'),
    mensagem_sefaz: mensagem,
  }
}
