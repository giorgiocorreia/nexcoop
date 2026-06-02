import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import EquipeClient from './EquipeClient'

export const metadata = { title: 'Equipe — NexCoop' }

export default async function EquipePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return <EquipeClient userId={user.id} />
}
