import { createClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/supabase/impersonation'
import { redirect } from 'next/navigation'
import DocumentosLista from './DocumentosLista'

export const metadata = { title: 'Documentos — NexCoop' }

export default async function DocumentosPage() {
  const supabaseAuth = await createClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) redirect('/login')

  const ctx = await getOrgContext()
  if (!ctx) redirect('/login')

  const { data: documentos } = await ctx.supabase
    .from('documentos')
    .select('*')
    .eq('organizacao_id', ctx.orgId)
    .order('nome')

  return <DocumentosLista documentos={documentos ?? []} />
}
