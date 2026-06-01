import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PlanoContasClient from './PlanoContasClient'

export const metadata = { title: 'Plano de Contas — NexCoop' }

export default async function PlanoContasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('organizacao_id')
    .eq('id', user.id)
    .single()

  const orgId = usuario?.organizacao_id ?? ''

  return <PlanoContasClient orgId={orgId} />
}
