import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DiarioClient from './DiarioClient'

export const metadata = { title: 'Livro Diário — NexCoop' }

export default async function DiarioPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('organizacao_id')
    .eq('id', user.id)
    .single()

  const orgId = usuario?.organizacao_id ?? ''

  return <DiarioClient orgId={orgId} />
}
