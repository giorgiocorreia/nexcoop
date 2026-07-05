import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ConfigLogsClient from './ConfigLogsClient'

export default async function ConfigLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ modulo?: string; inicio?: string; fim?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase.from('usuarios').select('role, funcoes, organizacao_id').eq('id', user.id).single()
  const isAdmin = usuario?.role === 'super_admin' || (usuario?.funcoes ?? []).includes('admin')
  if (!isAdmin) redirect('/dashboard')

  const params = await searchParams

  let query = supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  if (params.modulo) query = query.eq('modulo', params.modulo)
  if (params.inicio) query = query.gte('created_at', params.inicio)
  if (params.fim)    query = query.lte('created_at', params.fim + 'T23:59:59')

  const { data: logs } = await query

  return <ConfigLogsClient logs={logs ?? []} params={params} />
}