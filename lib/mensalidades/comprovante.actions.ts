'use server'

// Leitura de comprovante PIX por IA. Modelo claude-haiku-4-5-20251001 — o
// MESMO usado pelo agente Mariana (lib/captacao/actions.ts) — decisão do
// Giorgio por custo (a tarefa é simples extração de campos, não precisa de
// modelo maior nem de thinking).

import Anthropic from '@anthropic-ai/sdk'
import { getUsuarioLogado } from '@/lib/auth'
import type { ComprovantePixExtraido } from './comprovante-types'

const PROMPT = `Você recebeu a imagem (ou PDF) de um comprovante de pagamento PIX brasileiro.
Extraia os seguintes campos e responda SOMENTE com um JSON válido, sem markdown, sem texto fora do JSON:

{
  "eh_pix": true ou false (é mesmo um comprovante PIX?),
  "valor": numero (ex: 50.00) ou null,
  "data_pagamento": "YYYY-MM-DD" ou null,
  "hora": "HH:MM" ou null,
  "pagador_nome": "string" ou null,
  "pagador_documento": "string (CPF/CNPJ, como aparece no comprovante — pode estar mascarado)" ou null,
  "recebedor_nome": "string" ou null,
  "recebedor_documento": "string (só dígitos, sem pontuação)" ou null,
  "id_transacao": "string (Id da transação / EndToEndId, geralmente começa com E)" ou null,
  "instituicao_pagador": "string (banco/instituição do pagador)" ou null
}

Se o documento não for um comprovante PIX, responda {"eh_pix": false, "valor": null, "data_pagamento": null, "hora": null, "pagador_nome": null, "pagador_documento": null, "recebedor_nome": null, "recebedor_documento": null, "id_transacao": null, "instituicao_pagador": null}.`

// Espelha ComprovantePixExtraido — usado no output_config.format json_schema.
const SCHEMA_COMPROVANTE = {
  type: 'object',
  properties: {
    eh_pix:               { type: 'boolean' },
    valor:                { type: ['number', 'null'] },
    data_pagamento:       { type: ['string', 'null'] },
    hora:                 { type: ['string', 'null'] },
    pagador_nome:         { type: ['string', 'null'] },
    pagador_documento:    { type: ['string', 'null'] },
    recebedor_nome:       { type: ['string', 'null'] },
    recebedor_documento:  { type: ['string', 'null'] },
    id_transacao:         { type: ['string', 'null'] },
    instituicao_pagador:  { type: ['string', 'null'] },
  },
  required: [
    'eh_pix', 'valor', 'data_pagamento', 'hora', 'pagador_nome', 'pagador_documento',
    'recebedor_nome', 'recebedor_documento', 'id_transacao', 'instituicao_pagador',
  ],
  additionalProperties: false,
} as const

const VAZIO: ComprovantePixExtraido = {
  eh_pix: false,
  valor: null,
  data_pagamento: null,
  hora: null,
  pagador_nome: null,
  pagador_documento: null,
  recebedor_nome: null,
  recebedor_documento: null,
  id_transacao: null,
  instituicao_pagador: null,
}

function extrairJson(texto: string): ComprovantePixExtraido | null {
  const limpo = texto.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
  const match = limpo.match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    const parsed = JSON.parse(match[0])
    return { ...VAZIO, ...parsed }
  } catch {
    return null
  }
}

/**
 * Lê um comprovante PIX (imagem ou PDF, em base64) via IA e devolve os campos
 * extraídos. Human-in-the-loop: isso só PRÉ-PREENCHE o formulário — quem
 * confere e confirma a baixa é o operador (ver MensalidadesAssociadoSection).
 */
export async function lerComprovantePix(
  arquivoBase64: string,
  mediaType: string
): Promise<{ dados: ComprovantePixExtraido } | { error: string }> {
  // Exige usuário logado (não restringe por tipo de org aqui — a tela que
  // chama já é associação-only).
  await getUsuarioLogado()

  if (!arquivoBase64) return { error: 'Arquivo vazio.' }

  const anthropic = new Anthropic()

  const blocoArquivo = mediaType === 'application/pdf'
    ? { type: 'document' as const, source: { type: 'base64' as const, media_type: 'application/pdf' as const, data: arquivoBase64 } }
    : { type: 'image' as const, source: { type: 'base64' as const, media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp', data: arquivoBase64 } }

  // 1ª tentativa: output_config com json_schema (extração mais confiável).
  try {
    const resp = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      output_config: { format: { type: 'json_schema', schema: SCHEMA_COMPROVANTE } },
      messages: [{ role: 'user', content: [blocoArquivo, { type: 'text', text: PROMPT }] }],
    })

    const texto = resp.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('\n')

    const dados = extrairJson(texto)
    if (dados) return { dados }
    // output_config foi aceito mas não veio texto parseável — cai pro fallback abaixo.
  } catch (e) {
    // output_config/json_schema pode não ser aceito por essa versão do SDK/API
    // — segue pro fallback em modo texto puro.
    console.warn('[comprovante] output_config falhou, tentando modo texto:', e)
  }

  // Fallback: modo texto puro (sem output_config), pedindo JSON explicitamente no prompt.
  try {
    const resp = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: [blocoArquivo, { type: 'text', text: PROMPT }] }],
    })

    const texto = resp.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('\n')

    const dados = extrairJson(texto)
    if (!dados) return { error: 'Não foi possível ler o comprovante — tente novamente ou preencha manualmente.' }
    return { dados }
  } catch (e) {
    console.error('[comprovante] Erro ao ler comprovante PIX:', e)
    return { error: 'Erro ao chamar a IA para ler o comprovante.' }
  }
}
