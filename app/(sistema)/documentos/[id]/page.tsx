import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import DocumentoDetalhe from './DocumentoDetalhe'

interface Props { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('documentos').select('nome, categoria').eq('id', id).single()
  return {
    title: data ? `${data.nome} — Documentos — NextCoop` : 'Documento — NextCoop',
  }
}

export default async function DocumentoPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: documento, error } = await supabase
    .from('documentos').select('*').eq('id', id).single()

  if (error || !documento) notFound()

  return <DocumentoDetalhe documento={documento} />
}
