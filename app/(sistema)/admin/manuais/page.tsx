import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ManuaisClient from './ManuaisClient'

export const metadata = { title: 'Manuais — NexCoop Admin' }

export default async function ManuaisPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios').select('role').eq('id', user.id).single()
  if (usuario?.role !== 'super_admin') redirect('/dashboard')

  return <ManuaisClient />
}
