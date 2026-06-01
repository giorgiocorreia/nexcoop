import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import EscrituracaoClient from './EscrituracaoClient'

export const metadata = { title: 'Escrituração — NexCoop' }

export default async function EscrituracaoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('organizacao_id')
    .eq('id', user.id)
    .single()

  const orgId = usuario?.organizacao_id ?? ''

  return <EscrituracaoClient orgId={orgId} userId={user.id} />
}
