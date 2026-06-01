import { createClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/supabase/impersonation'
import { redirect } from 'next/navigation'
import SobrasClient from './SobrasClient'

export const metadata = { title: 'Sobras e REFAC — NexCoop' }

export default async function SobrasPage() {
  const supabaseAuth = await createClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) redirect('/login')

  const ctx = await getOrgContext()
  if (!ctx) redirect('/login')

  const { data: usuario } = await supabaseAuth
    .from('usuarios')
    .select('funcoes')
    .eq('id', user.id)
    .single()

  const { data: contadorVinculo } = await supabaseAuth
    .from('contador_org')
    .select('nivel, escritorios_contabeis(crc_responsavel)')
    .eq('usuario_id', user.id)
    .eq('org_id', ctx.orgId)
    .eq('ativo', true)
    .single()

  return (
    <SobrasClient
      orgId={ctx.orgId}
      userId={ctx.usuarioId}
      funcoes={usuario?.funcoes || []}
      crcContador={(contadorVinculo?.escritorios_contabeis as any)?.crc_responsavel || null}
      isContador={!!contadorVinculo}
    />
  )
}
