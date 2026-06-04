import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import PlanoEscritorioClient from './PlanoEscritorioClient'

export const metadata = { title: 'Plano de Contas do Escritório — NexCoop' }

export default async function PlanoContasEscritorioPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: prof } = await admin
    .from('profissionais_parceiros')
    .select('empresa_id')
    .eq('usuario_id', user.id)
    .eq('ativo', true)
    .single()

  if (!prof?.empresa_id) redirect('/escritorio')

  return <PlanoEscritorioClient empresaId={prof.empresa_id} />
}
