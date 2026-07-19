import { createClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/supabase/impersonation'
import { redirect } from 'next/navigation'
import DocumentosLista from './DocumentosLista'

export const metadata = { title: 'Documentos — NexCoop' }

const FILTROS_VALIDOS = ['vencendo_30'] as const
type FiltroInicial = (typeof FILTROS_VALIDOS)[number]

export default async function DocumentosPage({
  searchParams,
}: {
  searchParams: Promise<{ vencendo?: string }>
}) {
  const supabaseAuth = await createClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) redirect('/login')

  const ctx = await getOrgContext()
  if (!ctx) redirect('/login')

  const { data: documentos } = await ctx.supabase
    .from('documentos')
    .select('*')
    .eq('organizacao_id', ctx.orgId)
    .order('nome')

  // filtro inicial vindo da URL (ex.: clique no KPI "Docs vencendo" do dashboard,
  // que usa a mesma janela fixa de 30 dias — não o alerta_dias por documento)
  const params = await searchParams
  const filtroInicial: FiltroInicial | undefined =
    params.vencendo === '30' ? 'vencendo_30' : undefined

  return <DocumentosLista documentos={documentos ?? []} filtroInicial={filtroInicial} />
}
