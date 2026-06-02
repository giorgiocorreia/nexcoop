import { createClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/supabase/impersonation'
import { redirect } from 'next/navigation'
import DREClient from './DREClient'
import type { TipoOrg } from '@/lib/contabil/types'

export const metadata = { title: 'DRE — NexCoop' }

export default async function DREPage() {
  const supabaseAuth = await createClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) redirect('/login')

  const ctx = await getOrgContext()
  if (!ctx) redirect('/login')

  const { data: org } = await ctx.supabase
    .from('organizacoes')
    .select('tipo')
    .eq('id', ctx.orgId)
    .single()

  const tipoOrg: TipoOrg = (org?.tipo as TipoOrg) || 'cooperativa'

  return <DREClient orgId={ctx.orgId} tipoOrg={tipoOrg} />
}
