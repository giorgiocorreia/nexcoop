import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import MensalidadeDetalhe from './MensalidadeDetalhe'
import type { Mensalidade, Cooperado } from '@/types/database'

interface Props { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('mensalidades').select('mes_referencia').eq('id', id).single()
  if (!data) return { title: 'Mensalidade — NextCoop' }
  const mes = new Date(data.mes_referencia + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  return { title: `Mensalidade ${mes} — NextCoop` }
}

export type CooperadoDetalhe = Pick<Cooperado, 'id' | 'nome_completo' | 'cpf' | 'status' | 'quota_parte' | 'numero_matricula'>
export type HistoricoItem = Pick<Mensalidade, 'id' | 'mes_referencia' | 'valor' | 'status' | 'data_pagamento' | 'data_vencimento'>

export default async function MensalidadePage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: mensalidade, error } = await supabase
    .from('mensalidades').select('*').eq('id', id).single<Mensalidade>()

  if (error || !mensalidade) notFound()

  const [{ data: cooperado }, { data: historico }] = await Promise.all([
    supabase
      .from('cooperados')
      .select('id, nome_completo, cpf, status, quota_parte, numero_matricula')
      .eq('id', mensalidade.cooperado_id)
      .single<CooperadoDetalhe>(),
    supabase
      .from('mensalidades')
      .select('id, mes_referencia, valor, status, data_pagamento, data_vencimento')
      .eq('cooperado_id', mensalidade.cooperado_id)
      .neq('id', id)
      .order('mes_referencia', { ascending: false })
      .limit(11)
      .returns<HistoricoItem[]>(),
  ])

  return (
    <MensalidadeDetalhe
      mensalidade={mensalidade}
      cooperado={cooperado}
      historico={historico ?? []}
    />
  )
}
