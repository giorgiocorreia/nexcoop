import { createClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/supabase/impersonation'
import { redirect } from 'next/navigation'
import ExportacoesClient from './ExportacoesClient'

export const metadata = { title: 'Exportações Contábeis — NexCoop' }

export default async function ExportacoesPage() {
  const supabaseAuth = await createClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) redirect('/login')

  const ctx = await getOrgContext()
  if (!ctx) redirect('/login')

  return <ExportacoesClient orgId={ctx.orgId} userId={ctx.usuarioId} />
}
