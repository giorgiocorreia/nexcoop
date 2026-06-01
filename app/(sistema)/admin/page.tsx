import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminDashboard from './AdminDashboard'

export const metadata = { title: 'Admin — NexCoop' }

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: organizacoes },
    { count: totalUsuarios },
    { count: totalCooperados },
    { data: cooperadosPorOrg },
  ] = await Promise.all([
    supabase.from('organizacoes').select('*').order('criado_em', { ascending: false }),
    supabase.from('usuarios').select('*', { count: 'exact', head: true }),
    supabase.from('cooperados').select('*', { count: 'exact', head: true }),
    supabase.from('cooperados').select('organizacao_id'),
  ])

  return (
    <AdminDashboard
      organizacoes={organizacoes ?? []}
      totalUsuarios={totalUsuarios ?? 0}
      totalCooperados={totalCooperados ?? 0}
      cooperadosPorOrg={cooperadosPorOrg ?? []}
    />
  )
}
