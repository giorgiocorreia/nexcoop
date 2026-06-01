import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ContadorClient from './ContadorClient'

export const metadata = { title: 'Contadores — NexCoop' }

export default async function ContadorConfigPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('organizacao_id')
    .eq('id', user.id)
    .single()

  const orgId = usuario?.organizacao_id ?? ''

  return <ContadorClient orgId={orgId} />
}
