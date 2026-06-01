import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PlanoExternoClient from './PlanoExternoClient'

export const metadata = { title: 'Plano de Contas do Escritório — NexCoop' }

export default async function PlanoContasExternoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return <PlanoExternoClient userId={user.id} />
}
