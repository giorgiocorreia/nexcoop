import { createClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/supabase/impersonation'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import FinanceiroLista from './FinanceiroLista'
import type { TipoLancamento, StatusLancamento } from '@/types/database'

export const metadata = { title: 'Financeiro — NexCoop' }

const TIPOS_VALIDOS: TipoLancamento[] = ['receita', 'despesa', 'transferencia']
const STATUS_VALIDOS: StatusLancamento[] = ['pendente', 'pago', 'cancelado', 'agendado']

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; status?: string }>
}) {
  const supabaseAuth = await createClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) redirect('/login')

  const ctx = await getOrgContext()
  if (!ctx) redirect('/login')

  const [
    { data: lancamentos },
    { data: cooperados },
  ] = await Promise.all([
    ctx.supabase
      .from('lancamentos')
      .select('*')
      .eq('organizacao_id', ctx.orgId)
      .order('data_competencia', { ascending: false }),
    ctx.supabase
      .from('cooperados')
      .select('id, nome_completo')
      .eq('organizacao_id', ctx.orgId)
      .order('nome_completo'),
  ])

  const nomeCooperado: Record<string, string> = {}
  for (const c of cooperados ?? []) {
    nomeCooperado[c.id] = c.nome_completo
  }

  const cookieStore = await cookies()
  const isParceiro = !!cookieStore.get('parceiro_org_id')?.value

  // filtros iniciais vindos da URL (ex.: clique nos KPIs do dashboard)
  const params = await searchParams
  const tipoInicial = TIPOS_VALIDOS.find(t => t === params.tipo)
  const statusInicial = STATUS_VALIDOS.find(s => s === params.status)

  return (
    <FinanceiroLista
      lancamentos={lancamentos ?? []}
      nomeCooperado={nomeCooperado}
      isParceiro={isParceiro}
      tipoInicial={tipoInicial}
      statusInicial={statusInicial}
    />
  )
}
