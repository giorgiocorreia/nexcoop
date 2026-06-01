import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SobrasClient from './SobrasClient'

export const metadata = { title: 'Sobras e REFAC — NexCoop' }

export default async function SobrasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('organizacao_id, funcoes')
    .eq('id', user.id)
    .single()

  const orgId = usuario?.organizacao_id ?? ''

  const { data: contadorVinculo } = await supabase
    .from('contador_org')
    .select('nivel, escritorios_contabeis(crc_responsavel)')
    .eq('usuario_id', user.id)
    .eq('org_id', orgId)
    .eq('ativo', true)
    .single()

  return (
    <SobrasClient
      orgId={orgId}
      userId={user.id}
      funcoes={usuario?.funcoes || []}
      crcContador={(contadorVinculo?.escritorios_contabeis as any)?.crc_responsavel || null}
      isContador={!!contadorVinculo}
    />
  )
}
