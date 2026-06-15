import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { temModulo } from '@/lib/org'
import { podeVerEstoqueLoja } from '@/lib/permissoes'
import { getDashboardEstoque } from '@/lib/loja/actions'
import EstoqueClient from './EstoqueClient'

export const metadata = { title: 'Estoque — Loja | NexCoop' }

export default async function EstoquePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('funcoes, role, organizacoes(modulos_ativos)')
    .eq('id', user.id)
    .single()

  const orgRaw = (usuario as any)?.organizacoes
  const org = Array.isArray(orgRaw) ? orgRaw[0] : orgRaw
  if (!temModulo(org?.modulos_ativos, 'loja')) redirect('/dashboard')

  const up = { role: usuario?.role ?? '', funcoes: ((usuario as any)?.funcoes ?? []) as string[] }
  if (!podeVerEstoqueLoja(up)) redirect('/loja')

  const { data: { user: authUser } } = await supabase.auth.getUser()
  const { data: usuarioOrg } = await supabase
    .from('usuarios')
    .select('organizacao_id')
    .eq('id', authUser!.id)
    .single()
  const orgId = (usuarioOrg as any)?.organizacao_id as string

  const [dashResult, { data: produtosRaw }] = await Promise.all([
    getDashboardEstoque(),
    supabase
      .from('loja_produtos')
      .select('*, loja_lotes(quantidade_atual, preco_custo)')
      .eq('org_id', orgId)
      .eq('ativo', true)
      .order('nome'),
  ])

  const produtos = (produtosRaw ?? []).map((p: any) => {
    const lotes = (p.loja_lotes ?? []) as { quantidade_atual: number; preco_custo: number }[]
    const valor_estoque = lotes.reduce((sum, l) => sum + l.quantidade_atual * l.preco_custo, 0)
    const { loja_lotes: _l, ...rest } = p
    return { ...rest, valor_estoque }
  })

  const dashboard = dashResult.data ?? {
    total_skus: 0,
    valor_total_estoque: 0,
    qtd_criticos: 0,
    proximos_vencimentos: [],
    sem_movimento: [],
  }

  return <EstoqueClient dashboard={dashboard} produtos={produtos} />
}
