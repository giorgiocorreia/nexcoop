"use server";

import { createClient } from "@/lib/supabase/server";

export async function getHubKpis(orgId: string) {
  const supabase = await createClient();
  const hoje = new Date();
  const inicioDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).toISOString();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString();

  const { data: vendas } = await supabase
    .from("loja_vendas")
    .select("total, criado_em, pago_especie, pago_pix, pago_cartao, pago_saldo, status")
    .eq("org_id", orgId)
    .eq("status", "concluida");

  const { data: caixa } = await supabase
    .from("loja_caixas")
    .select("id, valor_abertura, usuario_id")
    .eq("org_id", orgId)
    .eq("status", "aberto")
    .maybeSingle();

  const vendasHoje = (vendas ?? []).filter(v => v.criado_em >= inicioDia);
  const vendasMes  = (vendas ?? []).filter(v => v.criado_em >= inicioMes);

  const fatHoje = vendasHoje.reduce((s, v) => s + Number(v.total), 0);
  const fatMes  = vendasMes.reduce((s, v) => s + Number(v.total), 0);
  const ticketMedio = vendasMes.length > 0 ? fatMes / vendasMes.length : 0;

  // Vendas em conta = soma de pago_saldo do mês
  const vendasEmConta = vendasMes.reduce((s, v) => s + Number(v.pago_saldo ?? 0), 0);

  // Saldo estimado em caixa: fundo + dinheiro + pix de hoje
  const vendasDinheiroHoje = vendasHoje.reduce(
    (s, v) => s + Number(v.pago_especie ?? 0) + Number(v.pago_pix ?? 0), 0
  );
  const saldoCaixa = caixa
    ? Number(caixa.valor_abertura) + vendasDinheiroHoje
    : 0;

  // Nome do operador (via caixa aberto)
  let operadorNome: string | null = null;
  if (caixa?.usuario_id) {
    const { data: usr } = await supabase
      .from("usuarios")
      .select("nome_completo")
      .eq("id", caixa.usuario_id)
      .single();
    operadorNome = usr?.nome_completo ?? null;
  }

  return {
    fatHoje,
    fatMes,
    ticketMedio,
    saldoCaixa,
    vendasEmConta,
    transacoesHoje: vendasHoje.length,
    caixaAberto: !!caixa,
    operadorNome,
  };
}

export async function getAlertasEstoque(orgId: string) {
  const supabase = await createClient();

  const [{ data: produtos }, { data: lotes }] = await Promise.all([
    supabase
      .from("loja_produtos")
      .select("id, nome, unidade, estoque_minimo")
      .eq("org_id", orgId)
      .eq("ativo", true),
    supabase
      .from("loja_lotes")
      .select("produto_id, quantidade_atual")
      .eq("org_id", orgId)
      .gt("quantidade_atual", 0),
  ]);

  if (!produtos?.length) return [];

  const estoquePorProduto: Record<string, number> = {};
  for (const l of lotes ?? []) {
    estoquePorProduto[l.produto_id] =
      (estoquePorProduto[l.produto_id] ?? 0) + Number(l.quantidade_atual);
  }

  return produtos
    .filter(p => (estoquePorProduto[p.id] ?? 0) <= Number(p.estoque_minimo ?? 0))
    .map(p => ({
      produto_id: p.id,
      nome: p.nome,
      unidade: p.unidade,
      estoque_atual: estoquePorProduto[p.id] ?? 0,
      estoque_minimo: Number(p.estoque_minimo ?? 0),
    }))
    .slice(0, 5);
}

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

  // 2. Itens com nome do produto
  const { data: itens } = await supabase
    .from("loja_venda_itens")
    .select("produto_id, quantidade, subtotal, loja_produtos(nome, unidade)")
    .in("venda_id", vendaIds);

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

  if (!vendas?.length) return [];

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

  return vendas.map(v => {
    const forma =
      Number(v.pago_saldo) > 0 ? "credito_cooperado"
      : Number(v.pago_pix) > 0 ? "pix"
      : Number(v.pago_cartao) > 0 ? "cartao"
      : "especie";

    return {
      id: v.id,
      num: `V-${v.id.slice(-6).toUpperCase()}`,
      hora: new Date(v.criado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      operador: v.caixa_id ? (caixaToNome[v.caixa_id] ?? "—") : "—",
      forma,
      total: Number(v.total),
    };
  });
}

export async function getFaturamentoDiario(orgId: string) {
  const supabase = await createClient();
  const inicio = new Date();
  inicio.setDate(inicio.getDate() - 29);
  inicio.setHours(0, 0, 0, 0);

  const { data } = await supabase
    .from("loja_vendas")
    .select("total, criado_em")
    .eq("org_id", orgId)
    .eq("status", "concluida")
    .gte("criado_em", inicio.toISOString());

  const mapa: Record<string, number> = {};
  for (let i = 0; i < 30; i++) {
    const d = new Date(inicio);
    d.setDate(d.getDate() + i);
    const key = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    mapa[key] = 0;
  }
  for (const v of data ?? []) {
    const key = new Date(v.criado_em).toLocaleDateString("pt-BR", {
      day: "2-digit", month: "2-digit",
    });
    if (key in mapa) mapa[key] += Number(v.total);
  }

  return Object.entries(mapa).map(([label, valor]) => ({ label, valor }));
}
