// Utilitários puros do upload de foto do cooperado (sem I/O) — regra 5 do
// CLAUDE.md: validação/derivação não mora em arquivo "use server".
// As actions ficam em lib/cooperados/foto-actions.ts.

// Mesmos tipos e limite aceitos pelo bucket 'avatares' (migration 005) —
// validado no server, nunca confiando no `accept` do <input> do cliente.
export const MIME_ACEITOS = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
export const TAMANHO_MAX_BYTES = 5 * 1024 * 1024 // 5 MB, mesmo limite do bucket

export const EXTENSAO_POR_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

// Devolve a mensagem de erro, ou null se o arquivo é aceitável.
export function validarArquivoFoto(tipo: string, tamanho: number): string | null {
  if (!MIME_ACEITOS.includes(tipo)) {
    return 'Formato de imagem não suportado. Envie PNG, JPEG, WEBP ou GIF.'
  }
  if (tamanho > TAMANHO_MAX_BYTES) {
    return 'Arquivo muito grande. O limite é 5 MB.'
  }
  return null
}

// Path do arquivo no bucket. O primeiro segmento PRECISA ser o
// organizacao_id — a policy de storage da migration 005 checa
// (storage.foldername(name))[1] contra a org do usuário.
export function montarPathFotoCooperado(
  organizacaoId: string,
  cooperadoId: string,
  mime: string
): string {
  return `${organizacaoId}/cooperados/${cooperadoId}.${EXTENSAO_POR_MIME[mime]}`
}
