import { createClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/supabase/impersonation'
import { redirect } from 'next/navigation'
import MensalidadesLista from './MensalidadesLista'
import type { Cooperado, Mensalidade } from '@/types/database'

export const metadata = { title: 'Mensalidades — NexCoop' }

export type CooperadoResumo = Pick<Cooperado, 'id' | 'nome_completo' | 'cpf' | 'quota_parte' | 'status'>

export default async function MensalidadesPage() {
  const supabaseAuth = await createClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) redirect('/login')

  const ctx = await getOrgContext()
  if (!ctx) redirect('/login')

  const inicio = new Date()
  inicio.setMonth(inicio.getMonth() - 11)
  const dataInicio = `${inicio.getFullYear()}-${String(inicio.getMonth() + 1).padStart(2, '0')}-01`

  const [{ data: mensalidades }, { data: cooperados }, { data: org }] = await Promise.all([
    ctx.supabase
      .from('mensalidades')
      .select('*')
      .eq('organizacao_id', ctx.orgId)
      .gte('mes_referencia', dataInicio)
      .order('mes_referencia', { ascending: false })
      .order('criado_em', { ascending: false })
      .returns<Mensalidade[]>(),
    ctx.supabase
      .from('cooperados')
      .select('id, nome_completo, cpf, quota_parte, status')
      .eq('organizacao_id', ctx.orgId)
      .order('nome_completo')
      .returns<CooperadoResumo[]>(),
    ctx.supabase
      .from('organizacoes')
      .select('tipo')
      .eq('id', ctx.orgId)
      .single<{ tipo: string }>(),
  ])

  const cooperadoMap: Record<string, CooperadoResumo> = {}
  for (const c of cooperados ?? []) cooperadoMap[c.id] = c

  return (
    <MensalidadesLista
      mensalidades={mensalidades ?? []}
      cooperadoMap={cooperadoMap}
      tipoOrg={org?.tipo ?? null}
    />
  )
}
