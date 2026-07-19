import { createAdminClient } from '@/lib/supabase/admin'
import { getUsuarioLogado } from '@/lib/auth'
import ResultadoClient from './ResultadoClient'

export default async function ResultadoPage() {
  const usuario = await getUsuarioLogado()
  const supabase = createAdminClient()
  const orgId = usuario.organizacao_id as string

  const { data: safras } = await supabase
    .from('safras')
    .select('id, ano, descricao, status')
    .eq('organizacao_id', orgId)
    .order('ano', { ascending: false })

  // Fonte única do resultado: vw_resultado_comercializacao (migration 082) —
  // realizado (transações consumadas) + marcação a mercado (posição em aberto
  // precificada na cotação vigente). Substitui a leitura antiga de
  // vw_resultado_safra (campos deprecated custo_aquisicao_rs/resultado_liquido_rs).
  const { data: resultados } = await (supabase as any)
    .from('vw_resultado_comercializacao')
    .select('*')
    .eq('organizacao_id', orgId)
    .order('safra_ano', { ascending: false })

  // Saldos por produtor — participação individual na safra (snapshot mantido
  // por trigger; ver docs/CLAUDE.md sobre migration 083 em andamento).
  const { data: saldos } = await (supabase as any)
    .from('vw_saldos_produtor')
    .select('*')
    .eq('organizacao_id', orgId)

  const { data: lotesAndamento } = await supabase
    .from('lotes')
    .select(`
      id, codigo, status, peso_total_kg, safra_id, produto_descricao,
      safras(ano, descricao),
      lote_itens(peso_kg, produtos(nome)),
      vendas_externas(id, status, valor_bruto, quantidade_kg, preco_kg, compradores(nome))
    `)
    .eq('organizacao_id', orgId)
    .in('status', ['rascunho', 'aberto', 'em_venda', 'entregue'])
    .order('created_at', { ascending: false })

  return (
    <ResultadoClient
      safras={safras ?? []}
      resultados={resultados ?? []}
      saldos={saldos ?? []}
      lotesAndamento={(lotesAndamento ?? []) as any[]}
    />
  )
}
