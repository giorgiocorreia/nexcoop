import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LojaHub from './LojaHub'

export const metadata = { title: 'Loja — NexCoop' }

export default async function LojaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { count: totalProdutos },
    { count: totalFornecedores },
    { data: produtosBaixos },
  ] = await Promise.all([
    supabase
      .from('loja_produtos')
      .select('*', { count: 'exact', head: true })
      .eq('ativo', true),
    supabase
      .from('loja_fornecedores')
      .select('*', { count: 'exact', head: true })
      .eq('ativo', true),
    // Estoque baixo: busca produtos com estoque_minimo definido e calcula no cliente
    supabase
      .from('loja_produtos')
      .select('estoque_atual, estoque_minimo')
      .eq('ativo', true)
      .not('estoque_minimo', 'is', null),
  ])

  const estoqueBaixo = (produtosBaixos ?? []).filter(
    p => p.estoque_minimo != null && p.estoque_atual < p.estoque_minimo
  ).length

  return (
    <LojaHub
      totalProdutos={totalProdutos ?? 0}
      totalFornecedores={totalFornecedores ?? 0}
      estoqueBaixo={estoqueBaixo}
    />
  )
}
