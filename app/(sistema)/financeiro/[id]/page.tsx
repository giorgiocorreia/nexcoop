import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import LancamentoDetalhe from './LancamentoDetalhe'
import type { Cooperado } from '@/types/database'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('lancamentos')
    .select('descricao, tipo')
    .eq('id', id)
    .single()
  return {
    title: data
      ? `${data.descricao} — Financeiro — NextCoop`
      : 'Lançamento — NextCoop',
  }
}

export default async function LancamentoPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: lancamento, error } = await supabase
    .from('lancamentos')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !lancamento) notFound()

  // Busca cooperado vinculado, se houver
  let cooperado: Cooperado | null = null
  if (lancamento.cooperado_id) {
    const { data } = await supabase
      .from('cooperados')
      .select('*')
      .eq('id', lancamento.cooperado_id)
      .single()
    cooperado = data ?? null
  }

  return <LancamentoDetalhe lancamento={lancamento} cooperado={cooperado} />
}
