import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { temModulo } from '@/lib/org'
import { podeGerenciarLoja } from '@/lib/permissoes'
import { listarProdutos, listarMovimentacoes } from '@/lib/loja/actions'
import AjusteEstoqueClient from './AjusteEstoqueClient'

export const metadata = { title: 'Ajuste de Estoque — Loja | NexCoop' }

export default async function AjusteEstoquePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('funcoes, role, organizacao_id, organizacoes(modulos_ativos)')
    .eq('id', user.id)
    .single()

  const orgRaw = (usuario as any)?.organizacoes
  const org = Array.isArray(orgRaw) ? orgRaw[0] : orgRaw
  if (!temModulo(org?.modulos_ativos, 'loja')) redirect('/dashboard')

  const up = { role: usuario?.role ?? '', funcoes: ((usuario as any)?.funcoes ?? []) as string[] }
  if (!podeGerenciarLoja(up)) redirect('/loja')

  const orgId = (usuario as any)?.organizacao_id as string

  const ha30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [{ data: produtosRaw }, { data: movRaw }] = await Promise.all([
    listarProdutos(),
    listarMovimentacoes({ tipo: 'inventario', data_inicio: ha30 }),
  ])

  const produtos = (produtosRaw ?? [])
    .filter(p => p.ativo)
    .map(p => ({ id: p.id, nome: p.nome, unidade: p.unidade, estoque_atual: p.estoque_atual }))

  const historico = (movRaw ?? []).map((m: any) => ({
    id: m.id,
    produto_id: m.produto_id,
    produto_nome: m.loja_produtos?.nome ?? '—',
    quantidade: m.quantidade,
    motivo: m.motivo,
    criado_em: m.criado_em,
  }))

  return (
    <AjusteEstoqueClient
      produtos={produtos}
      historico={historico}
      orgId={orgId}
      usuarioId={user.id}
    />
  )
}
