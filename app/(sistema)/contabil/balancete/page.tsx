import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BalanceteClient from './BalanceteClient'

export const metadata = { title: 'Balancete — NexCoop' }

export default async function BalancetePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('organizacao_id')
    .eq('id', user.id)
    .single()

  const orgId = usuario?.organizacao_id ?? ''

  return <BalanceteClient orgId={orgId} />
}
