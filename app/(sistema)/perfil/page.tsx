import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PerfilUsuarioClient from './PerfilUsuarioClient'

export default async function PerfilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', user.id)
    .single()

  return <PerfilUsuarioClient usuario={usuario} email={user.email || ''} />
}
