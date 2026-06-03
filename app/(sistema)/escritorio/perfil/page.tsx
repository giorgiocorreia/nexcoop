import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PerfilEscritorioClient from './PerfilEscritorioClient'

export default async function PerfilEscritorioPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return <PerfilEscritorioClient userId={user.id} email={user.email || ''} />
}
