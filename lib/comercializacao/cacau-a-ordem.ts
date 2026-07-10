'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getOrganizacaoId } from '@/lib/auth'

// "Cacau à ordem": cacau que o produtor já entregou à cooperativa mas ainda não
// converteu em dinheiro (fisicamente entregue, financeiramente pendente).
//
// saldo_kg por produtor = SUM(entrega) − SUM(conversao) − SUM(estorno)
//
// Calculado SEMPRE ao vivo, direto de movimentacoes_conta — nunca de
// saldos_produtor_snapshot nem da view vw_saldos_produtor, que estão
// desatualizadas e não refletem tipo='estorno' corretamente. Assim o número
// atualiza a cada entrega/conversão/estorno, sem depender de trigger/cache.

export interface ProdutorCacauAOrdem {
  produtor_id: string
  nome: string
  saldo_kg: number
}

export interface CacauAOrdemResult {
  saldo_total_kg: number
  produtores: ProdutorCacauAOrdem[]
}

export async function getCacauAOrdem(): Promise<CacauAOrdemResult> {
  // Organização sempre da sessão atual — nunca hardcoded.
  const orgId = await getOrganizacaoId()
  const admin = createAdminClient()

  // 1. Todos os produtos de cacau seco da org. Não travamos num produto_id
  //    específico: se cadastrarem um novo produto de cacau, ele entra sozinho.
  const { data: produtosCacau } = await admin
    .from('produtos')
    .select('id')
    .eq('organizacao_id', orgId)
    .eq('categoria', 'Cacau Seco')

  const produtoIds = (produtosCacau ?? []).map((p) => p.id)
  if (produtoIds.length === 0) {
    return { saldo_total_kg: 0, produtores: [] }
  }

  // 2. Movimentações de cacau que entram na fórmula (entrega/conversao/estorno).
  //    Join movimentacoes_conta → contas_produtor → produtores para o nome.
  //    Estornos financeiros da loja têm produto_id NULL e ficam de fora do
  //    filtro .in('produto_id', ...) — só estornos de cacau contam.
  const { data: movs } = await admin
    .from('movimentacoes_conta')
    .select('tipo, quantidade_produto, contas_produtor!inner(produtor_id, produtores(nome))')
    .eq('organizacao_id', orgId)
    .in('produto_id', produtoIds)
    .in('tipo', ['entrega', 'conversao', 'estorno'])

  // 3. Agrega por produtor. entrega soma; conversao e estorno subtraem.
  const mapa = new Map<string, { nome: string; saldo: number }>()
  for (const m of movs ?? []) {
    const conta = (m as any).contas_produtor
    const produtorId: string | undefined = conta?.produtor_id
    if (!produtorId) continue
    const nome: string = conta?.produtores?.nome ?? '—'
    const qtd = Number((m as any).quantidade_produto ?? 0)
    const sinal = (m as any).tipo === 'entrega' ? 1 : -1
    const atual = mapa.get(produtorId) ?? { nome, saldo: 0 }
    atual.saldo += sinal * qtd
    atual.nome = nome
    mapa.set(produtorId, atual)
  }

  // Só produtores com saldo positivo, do maior para o menor. A tolerância de
  // 0,5 g descarta ruído de ponto flutuante que deixaria saldos "zerados"
  // aparecendo como 0,000x kg.
  const produtores = [...mapa.entries()]
    .map(([produtor_id, v]) => ({ produtor_id, nome: v.nome, saldo_kg: v.saldo }))
    .filter((p) => p.saldo_kg > 0.0005)
    .sort((a, b) => b.saldo_kg - a.saldo_kg)

  const saldo_total_kg = produtores.reduce((s, p) => s + p.saldo_kg, 0)

  return { saldo_total_kg, produtores }
}
