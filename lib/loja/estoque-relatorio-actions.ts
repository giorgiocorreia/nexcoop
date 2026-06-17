"use server";

import { createClient } from "@/lib/supabase/server";

export async function getEstoqueAtual(orgId: string) {
  const supabase = await createClient();

  const { data: produtos } = await supabase
    .from("loja_produtos")
    .select("id, nome, unidade, preco_venda, estoque_minimo, ativo")
    .eq("org_id", orgId)
    .eq("ativo", true)
    .order("nome");

  const { data: lotes } = await supabase
    .from("loja_lotes")
    .select("produto_id, quantidade_atual, preco_custo")
    .eq("org_id", orgId)
    .gt("quantidade_atual", 0);

  return (produtos ?? []).map(p => {
    const lotesP = (lotes ?? []).filter(l => l.produto_id === p.id);
    const estoqueAtual = lotesP.reduce((a, l) => a + Number(l.quantidade_atual), 0);
    const custoTotal   = lotesP.reduce((a, l) => a + Number(l.quantidade_atual) * Number(l.preco_custo), 0);
    const custoMedio   = estoqueAtual > 0 ? custoTotal / estoqueAtual : 0;
    const valorEstoque = custoMedio * estoqueAtual;
    const emAlerta     = estoqueAtual <= Number(p.estoque_minimo ?? 0);

    return {
      id: p.id,
      nome: p.nome,
      unidade: p.unidade,
      preco_venda: Number(p.preco_venda),
      estoque_minimo: Number(p.estoque_minimo ?? 0),
      estoque_atual: estoqueAtual,
      custo_medio: custoMedio,
      valor_estoque: valorEstoque,
      em_alerta: emAlerta,
    };
  });
}

export async function getMovimentacoes(orgId: string, filtros?: {
  dataInicio?: string;
  dataFim?: string;
  produtoId?: string;
}) {
  const supabase = await createClient();

  let query = supabase
    .from("loja_estoque_movimentos")
    .select(`
      id, tipo, quantidade, motivo, criado_em,
      loja_produtos ( nome, unidade )
    `)
    .eq("org_id", orgId)
    .order("criado_em", { ascending: false })
    .limit(200);

  if (filtros?.dataInicio) query = query.gte("criado_em", filtros.dataInicio);
  if (filtros?.dataFim)    query = query.lte("criado_em", filtros.dataFim + "T23:59:59");
  if (filtros?.produtoId)  query = query.eq("produto_id", filtros.produtoId);

  const { data } = await query;

  return (data ?? []).map(m => ({
    id: m.id,
    tipo: m.tipo,
    quantidade: Number(m.quantidade),
    motivo: m.motivo,
    data: new Date(m.criado_em).toLocaleDateString("pt-BR"),
    hora: new Date(m.criado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    produto: (m.loja_produtos as any)?.nome ?? "—",
    unidade: (m.loja_produtos as any)?.unidade ?? "—",
  }));
}
