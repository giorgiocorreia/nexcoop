import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DocumentosLista from './DocumentosLista'

export const metadata = { title: 'Documentos — NextCoop' }

export default async function DocumentosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: documentos } = await supabase
    .from('documentos')
    .select('*')
    .order('nome')

  return <DocumentosLista documentos={documentos ?? []} />
}
