import { createClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/supabase/impersonation'
import { redirect } from 'next/navigation'
import CooperadosLista from './CooperadosLista'

export const metadata = { title: 'Cooperados — NexCoop' }

export default async function CooperadosPage() {
  const supabaseAuth = await createClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) redirect('/login')

  const ctx = await getOrgContext()
  if (!ctx) redirect('/login')

  const { data: cooperados, error } = await ctx.supabase
    .from('cooperados')
    .select('*')
    .eq('organizacao_id', ctx.orgId)
    .order('nome_completo')

  if (error) {
    console.error('Erro ao buscar cooperados:', error.message)
  }

  return <CooperadosLista cooperados={cooperados ?? []} />
}
