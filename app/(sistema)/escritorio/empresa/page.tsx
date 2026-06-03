import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import EmpresaPerfilClient from './EmpresaPerfilClient'

export default async function EmpresaPerfilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: prof } = await admin
    .from('profissionais_parceiros')
    .select('empresa:empresa_id(*)')
    .eq('usuario_id', user.id)
    .eq('ativo', true)
    .single()

  if (!prof?.empresa) redirect('/escritorio')

  return <EmpresaPerfilClient empresa={prof.empresa} />
}
