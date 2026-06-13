'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import type { ChangelogEntry } from '@/types/database'

export async function buscarChangelog(params: {
  modulo?: string
  data?: string
  pagina?: number
  porPagina?: number
}): Promise<{ entries: ChangelogEntry[]; total: number }> {
  const { modulo, data, pagina = 1, porPagina = 10 } = params
  const supabase = createAdminClient()

  let query = supabase
    .from('changelog_entries')
    .select('*', { count: 'exact' })
    .order('data', { ascending: false })
    .order('created_at', { ascending: false })

  if (modulo) query = query.eq('modulo', modulo)
  if (data)   query = query.eq('data', data)

  const from = (pagina - 1) * porPagina
  const to   = from + porPagina - 1
  query = query.range(from, to)

  const { data: entries, error, count } = await query

  if (error) {
    console.error('Erro ao buscar changelog:', error)
    return { entries: [], total: 0 }
  }

  return { entries: (entries ?? []) as ChangelogEntry[], total: count ?? 0 }
}

export async function buscarModulosDisponiveis(): Promise<string[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('changelog_entries')
    .select('modulo')

  if (error || !data) return []

  return Array.from(new Set(data.map((d) => d.modulo))).sort()
}
