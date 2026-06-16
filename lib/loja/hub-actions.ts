"use server";

import { createClient } from "@/lib/supabase/server";

// KPIs financeiros do hub
export async function getHubKpis(orgId: string) {
  const supabase = await createClient();
  const hoje = new Date();
  const inicioDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).toISOString();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString();

  const [{ data: vendas }, { data: caixa }] = await Promise.all([
    supabase
      .from("loja_vendas")
      .select("total, criado_em, pago_especie, pago_pix, pago_cartao, pago_saldo")
      .eq("org_id", orgId)
      .eq("status", "concluida"),
    supabase
      .from("loja_caixas")
      .select("id, valor_abertura")
      .eq("org_id", orgId)
      .eq("status", "aberto")
      .maybeSingle(),
  ]);

  const vendasHoje = (vendas ?? []).filter(v => v.criado_em >= inicioDia);
  const vendasMes  = (vendas ?? []).filter(v => v.criado_em >= inicioMes);

  const fatHoje = vendasHoje.reduce((s, v) => s + Number(v.total), 0);
  const fatMes  = vendasMes.reduce((s, v) => s + Number(v.total), 0);
  const ticketMedio = vendasMes.length > 0 ? fatMes / vendasMes.length : 0;

  // Saldo estimado: fundo inicial + dinheiro/pix de hoje
  const espeicaHoje = vendasHoje.reduce((s, v) => s + Number(v.pago_especie ?? 0), 0);
  const pixHoje     = vendasHoje.reduce((s, v) => s + Number(v.pago_pix ?? 0), 0);
  const saldoCaixa  = caixa ? Number(caixa.valor_abertura) + espeicaHoje + pixHoje : 0;

  // Total consumido via conta corrente no mês
  const totalContaMes = vendasMes.reduce(
    (s, v) => s + Number((v as any).pago_saldo ?? 0),
    0
  );

  return {
    fatHoje,
    fatMes,
    ticketMedio,
    saldoCaixa,
    totalContaMes,
    transacoesHoje: vendasHoje.length,
    caixaAberto: !!caixa,
  };
}

// Produtos com estoque crítico (consulta direta em loja_produtos)
export async function getAlertasEstoque(orgId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("loja_produtos")
    .select("id, nome, unidade, estoque_atual, estoque_minimo")
    .eq("org_id", orgId)
    .eq("ativo", true)
    .not("estoque_minimo", "is", null)
    .order("estoque_atual", { ascending: true })
    .limit(10);

  return (data ?? [])
    .filter(p => Number(p.estoque_atual) <= Number(p.estoque_minimo ?? 0))
    .slice(0, 5)
    .map(p => ({
      produto_id: p.id,
      nome: p.nome,
      unidade: p.unidade,
      estoque_atual: p.estoque_atual,
      estoque_minimo: p.estoque_minimo,
    }));
}

// Top 5 produtos do mês por faturamento
export async function getTopProdutos(orgId: string) {
  const supabase = await createClient();
  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  // 1. IDs das vendas concluídas no mês
  const { data: vendasMes } = await supabase
    .from("loja_vendas")
    .select("id")
    .eq("org_id", orgId)
    .eq("status", "concluida")
    .gte("criado_em", inicioMes.toISOString());

  const vendaIds = (vendasMes ?? []).map(v => v.id);
  if (vendaIds.length === 0) return [];

  // 2. Itens dessas vendas
  const { data: itens } = await supabase
    .from("loja_venda_itens")
    .select("produto_id, quantidade, subtotal, loja_produtos(nome, unidade)")
    .in("venda_id", vendaIds);

  // 3. Agrupa por produto
  const mapa: Record<string, { nome: string; qtd: number; total: number }> = {};
  for (const item of itens ?? []) {
    const id = item.produto_id;
    const nome = (item.loja_produtos as any)?.nome ?? "—";
    if (!mapa[id]) mapa[id] = { nome, qtd: 0, total: 0 };
    mapa[id].qtd   += Number(item.quantidade);
    mapa[id].total += Number(item.subtotal);
  }

  return Object.entries(mapa)
    .map(([id, v]) => ({ produto_id: id, ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
}

// Últimas 5 vendas do dia com operador
export async function getUltimasVendas(orgId: string) {
  const supabase = await createClient();
  const hoje = new Date();
  const inicioDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).toISOString();

  const { data: vendas } = await supabase
    .from("loja_vendas")
    .select("id, total, criado_em, pago_especie, pago_pix, pago_cartao, pago_saldo, caixa_id")
    .eq("org_id", orgId)
    .eq("status", "concluida")
    .gte("criado_em", inicioDia)
    .order("criado_em", { ascending: false })
    .limit(5);

  if (!vendas || vendas.length === 0) return [];

  // Busca operadores via caixas
  const caixaIds = [...new Set(vendas.map(v => v.caixa_id).filter(Boolean))] as string[];
  let caixaToNome: Record<string, string> = {};

  if (caixaIds.length > 0) {
    const { data: caixas } = await supabase
      .from("loja_caixas")
      .select("id, usuario_id")
      .in("id", caixaIds);

    const userIds = [...new Set((caixas ?? []).map(c => c.usuario_id).filter(Boolean))] as string[];
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from("usuarios")
        .select("id, nome_completo")
        .in("id", userIds);

      const userMap: Record<string, string> = {};
      for (const u of users ?? []) userMap[u.id] = u.nome_completo ?? "—";
      for (const c of caixas ?? []) {
        if (c.usuario_id) caixaToNome[c.id] = userMap[c.usuario_id] ?? "—";
      }
    }
  }

  function deriveForma(v: {
    pago_especie: number; pago_pix: number;
    pago_cartao: number; pago_saldo: number
  }): string {
    const saldo  = Number(v.pago_saldo ?? 0);
    const pix    = Number(v.pago_pix ?? 0);
    const cartao = Number(v.pago_cartao ?? 0);
    if (saldo > 0 && saldo >= pix && saldo >= cartao) return "pago_saldo";
    if (pix > 0 && pix >= cartao) return "pix";
    if (cartao > 0) return "cartao";
    return "dinheiro";
  }

  return vendas.map(v => ({
    id: v.id,
    num: `V-${v.id.slice(-6).toUpperCase()}`,
    hora: new Date(v.criado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    operador: v.caixa_id ? (caixaToNome[v.caixa_id] ?? "—") : "—",
    forma: deriveForma(v as any),
    total: Number(v.total),
  }));
}
