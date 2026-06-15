import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { temModulo } from '@/lib/org'
import { podeGerenciarLoja } from '@/lib/permissoes'
import { listarProdutos, listarFornecedores } from '@/lib/loja/actions'
import NovaCompraClient from './NovaCompraClient'

export const metadata = { title: 'Nova Compra — Loja | NexCoop' }

export default async function NovaCompraPage() {
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

  const [{ data: produtos }, { data: fornecedores }] = await Promise.all([
    listarProdutos(),
    listarFornecedores(),
  ])

  const produtosAtivos = (produtos ?? [])
    .filter(p => p.ativo)
    .map(p => ({ id: p.id, nome: p.nome, unidade: p.unidade }))

  const fornecedoresAtivos = (fornecedores ?? [])
    .filter(f => f.ativo)
    .map(f => ({ id: f.id, nome: f.nome }))

  return (
    <NovaCompraClient
      produtos={produtosAtivos}
      fornecedores={fornecedoresAtivos}
      orgId={orgId}
      usuarioId={user.id}
    />
  )
}
