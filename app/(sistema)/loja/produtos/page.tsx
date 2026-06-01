import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProdutosLista from './ProdutosLista'
import type { LojaFornecedor } from '@/types/database'
import type { LojaProdutoComFornecedor } from '@/lib/loja/actions'

export const metadata = { title: 'Produtos — Loja | NexCoop' }

export default async function ProdutosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const hoje     = new Date().toISOString().split('T')[0]
  const em30Dias = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [
    { data: produtos, error },
    { data: fornecedores },
    { data: lotesVencendo },
  ] = await Promise.all([
    supabase
      .from('loja_produtos')
      .select('*, loja_fornecedores(nome)')
      .order('nome'),
    supabase
      .from('loja_fornecedores')
      .select('id, nome')
      .eq('ativo', true)
      .order('nome'),
    supabase
      .from('loja_lotes')
      .select('produto_id')
      .gte('data_validade', hoje)
      .lte('data_validade', em30Dias)
      .gt('quantidade_atual', 0),
  ])

  if (error) console.error('Erro ao buscar produtos:', error.message)

  const produtosComVencimento = new Set(
    (lotesVencendo ?? []).map(l => (l as { produto_id: string }).produto_id)
  )

  return (
    <ProdutosLista
      produtos={(produtos ?? []) as unknown as LojaProdutoComFornecedor[]}
      fornecedores={(fornecedores ?? []) as Pick<LojaFornecedor, 'id' | 'nome'>[]}
      produtosComVencimento={produtosComVencimento}
    />
  )
}
