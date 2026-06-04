import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getOrgContext } from '@/lib/supabase/impersonation'
import OrganizacaoPerfilClient from './OrganizacaoPerfilClient'

export default async function OrganizacaoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('role')
    .eq('id', user.id)
    .single()

  if (usuario?.role === 'parceiro') redirect('/escritorio')

  const ctx = await getOrgContext()
  if (!ctx) redirect('/dashboard')

  const { data: org } = await ctx.supabase
    .from('organizacoes')
    .select('*')
    .eq('id', ctx.orgId)
    .single()

  if (!org) redirect('/dashboard')

  return <OrganizacaoPerfilClient org={org} />
}
