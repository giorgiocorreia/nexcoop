// Utilitários puros do upload de foto do cooperado (sem I/O) — regra 5 do
// CLAUDE.md: validação/derivação não mora em arquivo "use server".
// As actions ficam em lib/cooperados/foto-actions.ts.

// Mesmos tipos e limite aceitos pelo bucket 'avatares' (migration 005) —
// validado no server, nunca confiando no `accept` do <input> do cliente.
//
// Fase 3 (carteirinha em PDF, 24/07/2026): WEBP e GIF foram REMOVIDOS daqui
// de propósito — pdf-lib só embute PNG e JPEG (embedPng/embedJpg). Se a
// foto do cooperado fosse WEBP, a geração do PDF individual ou do lote
// quebraria (ou cairia sempre no placeholder). Restringir na origem do
// upload evita o problema na raiz em vez de só tratar defensivamente lá na frente.
export const MIME_ACEITOS = ['image/png', 'image/jpeg']
export const TAMANHO_MAX_BYTES = 5 * 1024 * 1024 // 5 MB, mesmo limite do bucket

export const EXTENSAO_POR_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
}

// Devolve a mensagem de erro, ou null se o arquivo é aceitável.
export function validarArquivoFoto(tipo: string, tamanho: number): string | null {
  if (!MIME_ACEITOS.includes(tipo)) {
    return 'Formato de imagem não suportado. Envie PNG ou JPEG (a foto é usada na carteirinha em PDF, que não aceita WEBP/GIF).'
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
