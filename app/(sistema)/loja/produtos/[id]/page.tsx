import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { podeGerenciarLoja, podeVerEstoqueLoja } from '@/lib/permissoes'
import { getProduto, getPosicaoEstoque, listarFornecedores } from '@/lib/loja/actions'
import EditarProdutoClient from './EditarProdutoClient'

export const metadata = { title: 'Editar Produto — Loja | NexCoop' }

export default async function EditarProdutoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('funcoes, role')
    .eq('id', user.id)
    .single()

  const up = { role: usuario?.role ?? '', funcoes: (usuario?.funcoes ?? []) as string[] }
  const podeGerenciar = podeGerenciarLoja(up)
  const podeVerEstoque = podeVerEstoqueLoja(up)

  if (!podeGerenciar && !podeVerEstoque) redirect('/loja/produtos')

  const [prodResult, estoqueResult, fornResult] = await Promise.all([
    getProduto(id),
    getPosicaoEstoque(id),
    listarFornecedores(),
  ])

  if (prodResult.error || !prodResult.data) redirect('/loja/produtos')

  return (
    <EditarProdutoClient
      produto={prodResult.data}
      posicaoEstoque={estoqueResult.data ?? { estoque_atual: 0, estoque_minimo: null, lotes: [] }}
      fornecedores={fornResult.data ?? []}
      podeGerenciar={podeGerenciar}
    />
  )
}
