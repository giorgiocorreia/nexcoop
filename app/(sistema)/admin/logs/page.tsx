import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import AdminLogsClient from './AdminLogsClient'

export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ modulo?: string; acao?: string; inicio?: string; fim?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase.from('usuarios').select('role').eq('id', user.id).single()
  if (usuario?.role !== 'super_admin') redirect('/dashboard')

  const params = await searchParams
  const admin = createAdminClient()

  let query = admin
    .from('audit_logs')
    .select('*, org:org_id(nome)')
    .order('created_at', { ascending: false })
    .limit(200)

  if (params.modulo) query = query.eq('modulo', params.modulo)
  if (params.acao)   query = query.eq('acao', params.acao)
  if (params.inicio) query = query.gte('created_at', params.inicio)
  if (params.fim)    query = query.lte('created_at', params.fim + 'T23:59:59')

  const { data: logs } = await query

  return <AdminLogsClient logs={logs ?? []} params={params} />
}