import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import UsuarioPerfilClient from './UsuarioPerfilClient'

export default async function UsuarioPerfilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: prof } = await admin
    .from('profissionais_parceiros')
    .select('id, nome, cargo, crc, nivel')
    .eq('usuario_id', user.id)
    .eq('ativo', true)
    .single()

  return (
    <UsuarioPerfilClient
      userId={user.id}
      email={user.email ?? ''}
      profissional={prof}
    />
  )
}
