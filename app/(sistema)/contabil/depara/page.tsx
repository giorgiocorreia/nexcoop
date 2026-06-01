import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DeParaClient from './DeParaClient'

export const metadata = { title: 'De/Para Contas — NexCoop' }

export default async function DeParaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('organizacao_id')
    .eq('id', user.id)
    .single()

  const orgId = usuario?.organizacao_id ?? ''

  return <DeParaClient orgId={orgId} userId={user.id} />
}
