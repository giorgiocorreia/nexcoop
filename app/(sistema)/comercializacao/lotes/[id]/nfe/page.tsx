import { redirect } from 'next/navigation'
import { getUsuarioLogado } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import NfeSaidaClient from './NfeSaidaClient'

export default async function NfeSaidaPage({ params, searchParams }: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ venda?: string }>
}) {
  const usuario = await getUsuarioLogado()
  if (!usuario) redirect('/login')

  const { id } = await params
  const { venda: vendaId } = await searchParams

  const supabase = createAdminClient()

  const { data: lote } = await supabase
    .from('lotes')
    .select('id, codigo, produto_descricao, peso_total_kg, status')
    .eq('id', id)
    .single()

  if (!lote) redirect('/comercializacao/lotes')

  const { data: venda } = vendaId ? await supabase
    .from('vendas_externas')
    .select(`
      id, quantidade_kg, preco_kg, valor_bruto, valor_liquido,
      taxa_comercializacao_pct, valor_taxa, status,
      chave_nfe, numero_nfe, status_nfe, data_emissao_nfe,
      compradores(id, nome, cnpj, ie, logradouro, numero, bairro, cep, municipio, uf)
    `)
    .eq('id', vendaId)
    .single() : { data: null }

  return <NfeSaidaClient lote={lote} venda={venda} vendaId={vendaId ?? null} />
}
