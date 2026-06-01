import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ExportacoesClient from './ExportacoesClient'

export const metadata = { title: 'Exportações Contábeis — NexCoop' }

export default async function ExportacoesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('organizacao_id')
    .eq('id', user.id)
    .single()

  const orgId = usuario?.organizacao_id ?? ''

  return <ExportacoesClient orgId={orgId} userId={user.id} />
}
