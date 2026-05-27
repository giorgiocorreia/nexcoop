import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AssembleiaLista from './AssembleiaLista'

export const metadata = { title: 'Assembleias — NextCoop' }

export default async function AssembleiasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: assembleias, error } = await supabase
    .from('assembleias')
    .select('*')
    .order('data_realizacao', { ascending: false })

  if (error) console.error('Erro ao buscar assembleias:', error.message)

  return <AssembleiaLista assembleias={assembleias ?? []} />
}
