import { createClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/supabase/impersonation'
import { redirect } from 'next/navigation'
import { temAlgumaFuncao } from '@/lib/permissoes'
import CooperadosLista from './CooperadosLista'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  const ctx = await getOrgContext()
  const { data: org } = ctx
    ? await ctx.supabase.from('organizacoes').select('tipo').eq('id', ctx.orgId).single()
    : { data: null }
  const label = org?.tipo === 'cooperativa' ? 'Cooperados' : 'Filiados'
  return { title: `${label} — NexCoop` }
}

export default async function CooperadosPage() {
  const supabaseAuth = await createClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) redirect('/login')

  const ctx = await getOrgContext()
  if (!ctx) redirect('/login')

  // Mesmas funções que exibem o item "Cooperados" no menu (Sidebar) — sem
  // isso a página ficava acessível por URL direta pra qualquer usuário logado.
  const { data: usuarioAtual } = await supabaseAuth
    .from('usuarios')
    .select('role, funcoes')
    .eq('id', user.id)
    .single()
  if (!usuarioAtual || !temAlgumaFuncao(usuarioAtual as any, ['admin', 'tecnico'])) redirect('/dashboard')

  const { data: org } = await ctx.supabase
    .from('organizacoes')
    .select('tipo')
    .eq('id', ctx.orgId)
    .single()

  const tipoOrg = org?.tipo ?? 'cooperativa'

  const { data: cooperados, error } = await ctx.supabase
    .from('cooperados')
    .select('*')
    .eq('organizacao_id', ctx.orgId)
    .order('nome_completo')

  if (error) {
    console.error('Erro ao buscar cooperados:', error.message)
  }

  return <CooperadosLista cooperados={cooperados ?? []} tipoOrg={tipoOrg} />
}
