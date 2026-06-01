import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import CooperadoPerfil from './CooperadoPerfil'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('cooperados')
    .select('nome_completo')
    .eq('id', id)
    .single()
  return { title: data ? `${data.nome_completo} — NexCoop` : 'Cooperado — NexCoop' }
}

export default async function CooperadoPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: cooperado, error } = await supabase
    .from('cooperados')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !cooperado) notFound()

  const { data: org } = await supabase
    .from('organizacoes')
    .select('tipo')
    .eq('id', cooperado.organizacao_id)
    .single()

  return <CooperadoPerfil cooperado={cooperado} orgTipo={org?.tipo ?? null} />
}
