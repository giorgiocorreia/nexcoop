import { createClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/supabase/impersonation'
import { redirect } from 'next/navigation'
import SobrasClient from './SobrasClient'
import type { TipoOrg } from '@/lib/contabil/types'

export const metadata = { title: 'Sobras e REFAC — NexCoop' }

export default async function SobrasPage() {
  const supabaseAuth = await createClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) redirect('/login')

  const ctx = await getOrgContext()
  if (!ctx) redirect('/login')

  const [usuarioRes, orgRes, contadorRes] = await Promise.all([
    supabaseAuth.from('usuarios').select('funcoes').eq('id', user.id).single(),
    ctx.supabase.from('organizacoes').select('tipo').eq('id', ctx.orgId).single(),
    supabaseAuth
      .from('contador_org')
      .select('nivel, escritorios_contabeis(crc_responsavel)')
      .eq('usuario_id', user.id)
      .eq('org_id', ctx.orgId)
      .eq('ativo', true)
      .single(),
  ])

  const tipoOrg: TipoOrg = (orgRes.data?.tipo as TipoOrg) || 'cooperativa'

  return (
    <SobrasClient
      orgId={ctx.orgId}
      userId={ctx.usuarioId}
      funcoes={usuarioRes.data?.funcoes || []}
      crcContador={(contadorRes.data?.escritorios_contabeis as any)?.crc_responsavel || null}
      isContador={!!contadorRes.data}
      tipoOrg={tipoOrg}
    />
  )
}
