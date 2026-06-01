import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import AssembleiaDetalhe from './AssembleiaDetalhe'

interface Props { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('assembleias').select('titulo, tipo').eq('id', id).single()
  return {
    title: data ? `${data.titulo} — Assembleias — NexCoop` : 'Assembleia — NexCoop',
  }
}

export default async function AssembleiaPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: assembleia, error } = await supabase
    .from('assembleias').select('*').eq('id', id).single()

  if (error || !assembleia) notFound()

  return <AssembleiaDetalhe assembleia={assembleia} />
}
