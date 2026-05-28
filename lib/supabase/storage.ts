import { createClient } from './client'

export const BUCKETS = {
  documentos: 'documentos',
  avatares: 'avatares',
} as const

/** Retorna URL pública de um arquivo (buckets públicos). */
export function getPublicUrl(bucket: keyof typeof BUCKETS, path: string): string {
  const supabase = createClient()
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

/** Faz upload de um arquivo e retorna a URL pública. */
export async function uploadFile(
  bucket: keyof typeof BUCKETS,
  path: string,
  file: File,
): Promise<{ url: string; error: null } | { url: null; error: string }> {
  const supabase = createClient()

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType: file.type, upsert: true })

  if (error) return { url: null, error: error.message }

  return { url: getPublicUrl(bucket, path), error: null }
}

/** Remove um arquivo do storage. */
export async function removeFile(
  bucket: keyof typeof BUCKETS,
  path: string,
): Promise<string | null> {
  const supabase = createClient()
  const { error } = await supabase.storage.from(bucket).remove([path])
  return error?.message ?? null
}
