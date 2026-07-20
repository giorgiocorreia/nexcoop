// Tipos puros ligados à leitura de comprovante PIX por IA.
// Sem 'use server' — é só shape de dado, sem I/O (regra 5 do CLAUDE.md).

/**
 * Campos extraídos de um comprovante PIX pela IA (claude-haiku-4-5).
 * Todos nullable: a IA pode não conseguir ler algum campo, ou o arquivo
 * pode nem ser um comprovante PIX (eh_pix: false).
 */
export interface ComprovantePixExtraido {
  eh_pix: boolean
  valor: number | null
  data_pagamento: string | null        // YYYY-MM-DD
  hora: string | null
  pagador_nome: string | null
  pagador_documento: string | null
  recebedor_nome: string | null
  recebedor_documento: string | null   // só dígitos
  id_transacao: string | null          // EndToEndId — chave de dedup
  instituicao_pagador: string | null
}
