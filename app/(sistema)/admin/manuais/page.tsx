import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ManuaisClient from './ManuaisClient'

export default async function ManuaisPage() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!usuario || usuario.role !== 'super_admin') redirect('/dashboard')

    return <ManuaisClient />
  } catch (error) {
    redirect('/dashboard')
  }
}
