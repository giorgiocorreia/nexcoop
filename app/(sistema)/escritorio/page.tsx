import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import EscritorioClient from './EscritorioClient'

export const metadata = { title: 'Meu Escritório — NexCoop' }

export default async function EscritorioPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return <EscritorioClient userId={user.id} />
}
