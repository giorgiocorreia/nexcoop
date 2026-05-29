import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import OrgDetalhe from './OrgDetalhe'

export async function generateMetadata() {
  return { title: 'Organização — Admin — NextCoop' }
}

export default async function OrgDetalhePage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const { data: org } = await admin
    .from('organizacoes')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!org) redirect('/admin')

  const [
    { data: usuarios },
    { count: totalCooperados },
    { count: totalMensalidades },
    { count: totalDocumentos },
  ] = await Promise.all([
    admin.from('usuarios').select('*').eq('organizacao_id', params.id).order('nome_completo'),
    admin.from('cooperados').select('*', { count: 'exact', head: true }).eq('organizacao_id', params.id),
    admin.from('mensalidades').select('*', { count: 'exact', head: true }).eq('organizacao_id', params.id),
    admin.from('documentos').select('*', { count: 'exact', head: true }).eq('organizacao_id', params.id),
  ])

  return (
    <OrgDetalhe
      org={org}
      usuarios={usuarios ?? []}
      totalCooperados={totalCooperados ?? 0}
      totalMensalidades={totalMensalidades ?? 0}
      totalDocumentos={totalDocumentos ?? 0}
    />
  )
}