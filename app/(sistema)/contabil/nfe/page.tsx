import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NFeClient from './NFeClient'

export const metadata = { title: 'NF-e — NexCoop' }

export default async function NFePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('organizacao_id')
    .eq('id', user.id)
    .single()

  const orgId = usuario?.organizacao_id ?? ''

  return <NFeClient orgId={orgId} userId={user.id} />
}
