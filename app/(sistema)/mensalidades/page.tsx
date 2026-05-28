import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MensalidadesLista from './MensalidadesLista'
import type { Cooperado, Mensalidade } from '@/types/database'

export const metadata = { title: 'Mensalidades — NextCoop' }

export type CooperadoResumo = Pick<Cooperado, 'id' | 'nome_completo' | 'cpf' | 'quota_parte' | 'status'>

export default async function MensalidadesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Últimos 12 meses
  const inicio = new Date()
  inicio.setMonth(inicio.getMonth() - 11)
  const dataInicio = `${inicio.getFullYear()}-${String(inicio.getMonth() + 1).padStart(2, '0')}-01`

  const [{ data: mensalidades }, { data: cooperados }] = await Promise.all([
    supabase
      .from('mensalidades')
      .select('*')
      .gte('mes_referencia', dataInicio)
      .order('mes_referencia', { ascending: false })
      .order('criado_em', { ascending: false })
      .returns<Mensalidade[]>(),
    supabase
      .from('cooperados')
      .select('id, nome_completo, cpf, quota_parte, status')
      .order('nome_completo')
      .returns<CooperadoResumo[]>(),
  ])

  const cooperadoMap: Record<string, CooperadoResumo> = {}
  for (const c of cooperados ?? []) cooperadoMap[c.id] = c

  return (
    <MensalidadesLista
      mensalidades={mensalidades ?? []}
      cooperadoMap={cooperadoMap}
    />
  )
}
