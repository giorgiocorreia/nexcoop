// Utilitários puros para o fluxo de comprovante PIX — sem 'use server' e sem
// dependência de servidor (rodam no browser, ver MensalidadesAssociadoSection).
// Regra 5 do CLAUDE.md: função pura fora de arquivo 'use server'.

/**
 * Hash SHA-256 (hex) do conteúdo do arquivo. Usado como dedup fallback quando
 * o comprovante não tem (ou a IA não conseguiu ler) o id da transação (EndToEndId).
 */
export async function hashArquivo(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Remove tudo que não for dígito. Usado para comparar o CNPJ do recebedor
 * extraído do comprovante com o CNPJ cadastrado da organização (a formatação
 * pode variar: com/sem pontuação, mascarado, etc).
 */
export function soDigitos(s: string | null): string {
  if (!s) return ''
  return s.replace(/\D/g, '')
}

/**
 * Base64 do arquivo, sem o prefixo "data:...;base64," — formato esperado
 * pelos blocos de imagem/documento da API da Anthropic.
 */
export async function fileParaBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}
