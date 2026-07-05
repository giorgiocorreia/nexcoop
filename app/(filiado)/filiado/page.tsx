import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function FiliadoRootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/filiado/inicio')
  }

  redirect('/filiado/login')
}