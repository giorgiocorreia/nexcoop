import { createClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/supabase/impersonation'
import { redirect } from 'next/navigation'
import AssembleiaLista from './AssembleiaLista'

export const metadata = { title: 'Assembleias — NexCoop' }

export default async function AssembleiasPage() {
  const supabaseAuth = await createClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) redirect('/login')

  const ctx = await getOrgContext()
  if (!ctx) redirect('/login')

  const { data: assembleias, error } = await ctx.supabase
    .from('assembleias')
    .select('*')
    .eq('organizacao_id', ctx.orgId)
    .order('data_realizacao', { ascending: false })

  if (error) console.error('Erro ao buscar assembleias:', error.message)

  return <AssembleiaLista assembleias={assembleias ?? []} />
}
