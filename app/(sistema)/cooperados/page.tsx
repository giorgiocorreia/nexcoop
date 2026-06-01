import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CooperadosLista from './CooperadosLista'

export const metadata = { title: 'Cooperados — NexCoop' }

export default async function CooperadosPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: cooperados, error } = await supabase
    .from('cooperados')
    .select('*')
    .order('nome_completo')

  if (error) {
    console.error('Erro ao buscar cooperados:', error.message)
  }

  return <CooperadosLista cooperados={cooperados ?? []} />
}
