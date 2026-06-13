import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { buscarChangelog, buscarModulosDisponiveis } from '@/lib/changelog/actions'
import ChangelogClient from '@/components/admin/ChangelogClient'

export const metadata = { title: 'Histórico de mudanças — NexCoop' }

export default async function AdminChangelogPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('role')
    .eq('id', user.id)
    .single()
  if (usuario?.role !== 'super_admin') redirect('/dashboard')

  const [{ entries, total }, modulos] = await Promise.all([
    buscarChangelog({ pagina: 1, porPagina: 10 }),
    buscarModulosDisponiveis(),
  ])

  return (
    <ChangelogClient
      entriesIniciais={entries}
      totalInicial={total}
      modulosDisponiveis={modulos}
    />
  )
}
