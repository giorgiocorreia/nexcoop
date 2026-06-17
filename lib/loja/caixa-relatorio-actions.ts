"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function getSessoesCaixa(orgId: string, filtros?: {
  dataInicio?: string;
  dataFim?: string;
  usuarioId?: string;
  apenasDivergentes?: boolean;
}) {
  const supabase = await createClient();

  let query = supabase
    .from("loja_caixas")
    .select(`
      id,
      valor_abertura,
      valor_fechamento,
      total_especie,
      total_cartao,
      total_pix,
      aberto_em,
      fechado_em,
      usuarios ( nome_completo )
    `)
    .eq("org_id", orgId)
    .eq("status", "fechado")
    .order("aberto_em", { ascending: false });

  if (filtros?.dataInicio) query = query.gte("aberto_em", filtros.dataInicio);
  if (filtros?.dataFim)    query = query.lte("aberto_em", filtros.dataFim);
  if (filtros?.usuarioId)  query = query.eq("usuario_id", filtros.usuarioId);

  const { data: sessoes } = await query;
  const admin = createAdminClient();

  const resultado = await Promise.all((sessoes ?? []).map(async (s) => {
    const { data: vendas } = await supabase
      .from("loja_vendas")
      .select("total, pago_especie, pago_pix, pago_cartao, pago_saldo")
      .eq("caixa_id", s.id)
      .eq("status", "concluida");

    const { data: sangrias } = await (admin as any)
      .from("loja_sangrias")
      .select("valor, tipo")
      .eq("caixa_id", s.id);

    const totalVendas   = (vendas ?? []).reduce((a: number, v: any) => a + Number(v.total), 0);
    const totalSangrias = (sangrias ?? []).reduce((a: number, v: any) => a + Number(v.valor), 0);

    const saldoEsperado  = Number(s.valor_abertura) + Number(s.total_especie ?? 0) + Number(s.total_pix ?? 0) - totalSangrias;
    const saldoInformado = Number(s.valor_fechamento ?? 0);
    const diferenca      = saldoInformado - saldoEsperado;

    return {
      id: s.id,
      operador: (s.usuarios as any)?.nome_completo ?? "—",
      aberto_em: s.aberto_em,
      fechado_em: s.fechado_em ?? "",
      valor_abertura: Number(s.valor_abertura),
      total_especie: Number(s.total_especie ?? 0),
      total_cartao: Number(s.total_cartao ?? 0),
      total_pix: Number(s.total_pix ?? 0),
      totalVendas,
      totalSangrias,
      saldoEsperado,
      saldoInformado,
      diferenca,
    };
  }));

  if (filtros?.apenasDivergentes) {
    return resultado.filter(s => Math.abs(s.diferenca) > 0.01);
  }

  return resultado;
}

export async function getDetalhesSessao(caixaId: string) {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: vendas } = await supabase
    .from("loja_vendas")
    .select("id, total, pago_especie, pago_pix, pago_cartao, pago_saldo, criado_em")
    .eq("caixa_id", caixaId)
    .eq("status", "concluida")
    .order("criado_em", { ascending: true });

  const { data: sangrias } = await (admin as any)
    .from("loja_sangrias")
    .select("id, valor, tipo, observacoes, created_at, usuarios!executado_por ( nome_completo )")
    .eq("caixa_id", caixaId)
    .order("created_at", { ascending: true });

  return {
    vendas: (vendas ?? []).map((v: any) => ({
      id: v.id,
      num: `V-${v.id.slice(-6).toUpperCase()}`,
      hora: new Date(v.criado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      total: Number(v.total),
      forma: Number(v.pago_saldo) > 0 ? "Crédito Coop."
           : Number(v.pago_pix) > 0 ? "PIX"
           : Number(v.pago_cartao) > 0 ? "Cartão"
           : "Dinheiro",
    })),
    sangrias: (sangrias ?? []).map((s: any) => ({
      id: s.id,
      hora: new Date(s.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      valor: Number(s.valor),
      tipo: s.tipo,
      observacoes: s.observacoes,
      executado_por: s.usuarios?.nome_completo ?? "—",
    })),
  };
}

export async function getOperadoresCaixa(orgId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("loja_caixas")
    .select("usuario_id, usuarios ( nome_completo )")
    .eq("org_id", orgId)
    .eq("status", "fechado");

  const mapa: Record<string, string> = {};
  for (const c of data ?? []) {
    const id = c.usuario_id;
    const nome = (c.usuarios as any)?.nome_completo ?? "—";
    if (id && !mapa[id]) mapa[id] = nome;
  }
  return Object.entries(mapa).map(([id, nome]) => ({ id, nome }));
}
