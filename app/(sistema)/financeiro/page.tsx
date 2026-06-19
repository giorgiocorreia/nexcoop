import { createClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/supabase/impersonation'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import FinanceiroLista from './FinanceiroLista'

export const metadata = { title: 'Financeiro — NexCoop' }

export default async function FinanceiroPage() {
  const supabaseAuth = await createClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) redirect('/login')

  const ctx = await getOrgContext()
  if (!ctx) redirect('/login')

  const [
    { data: lancamentos },
    { data: cooperados },
  ] = await Promise.all([
    ctx.supabase
      .from('lancamentos')
      .select('*')
      .eq('organizacao_id', ctx.orgId)
      .order('data_competencia', { ascending: false }),
    ctx.supabase
      .from('cooperados')
      .select('id, nome_completo')
      .eq('organizacao_id', ctx.orgId)
      .order('nome_completo'),
  ])

  const nomeCooperado: Record<string, string> = {}
  for (const c of cooperados ?? []) {
    nomeCooperado[c.id] = c.nome_completo
  }

  const cookieStore = await cookies()
  const isParceiro = !!cookieStore.get('parceiro_org_id')?.value

  return (
    <FinanceiroLista
      lancamentos={lancamentos ?? []}
      nomeCooperado={nomeCooperado}
      isParceiro={isParceiro}
    />
  )
}
