import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import RazaoClient from './RazaoClient'

export const metadata = { title: 'Livro Razão — NexCoop' }

export default async function RazaoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('organizacao_id')
    .eq('id', user.id)
    .single()

  const orgId = usuario?.organizacao_id ?? ''

  return <RazaoClient orgId={orgId} />
}
