import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { podeGerenciarLoja } from '@/lib/permissoes'
import { listarFornecedores } from '@/lib/loja/actions'
import { listarUnidades } from '@/lib/loja/unidades-actions'
import NovoProdutoClient from './NovoProdutoClient'

export const metadata = { title: 'Novo Produto — Loja | NexCoop' }

export default async function NovoProdutoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('organizacao_id, funcoes, role')
    .eq('id', user.id)
    .single()

  const up = { role: usuario?.role ?? '', funcoes: (usuario?.funcoes ?? []) as string[] }
  if (!podeGerenciarLoja(up)) redirect('/loja/produtos')

  const orgId = usuario?.organizacao_id as string
  const [{ data: fornecedores }, unidades] = await Promise.all([
    listarFornecedores(),
    listarUnidades(orgId),
  ])

  return <NovoProdutoClient fornecedores={fornecedores ?? []} unidades={unidades} />
}
