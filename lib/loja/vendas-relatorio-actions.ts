"use server";

import { createClient } from "@/lib/supabase/server";

export async function getVendasRelatorio(orgId: string, filtros?: {
  dataInicio?: string;
  dataFim?: string;
  forma?: string;
  usuarioId?: string;
}) {
  const supabase = await createClient();

  let query = supabase
    .from("loja_vendas")
    .select(`
      id, total, pago_especie, pago_pix, pago_cartao, pago_saldo,
      criado_em, status,
      loja_caixas ( usuario_id, usuarios ( nome_completo ) )
    `)
    .eq("org_id", orgId)
    .eq("status", "concluida")
    .order("criado_em", { ascending: false });

  if (filtros?.dataInicio) query = query.gte("criado_em", filtros.dataInicio);
  if (filtros?.dataFim)    query = query.lte("criado_em", filtros.dataFim + "T23:59:59");

  const { data } = await query;

  return (data ?? []).map(v => {
    const forma =
      Number(v.pago_saldo)  > 0 ? "credito_cooperado" :
      Number(v.pago_pix)    > 0 ? "pix" :
      Number(v.pago_cartao) > 0 ? "cartao" :
      "especie";

    return {
      id: v.id,
      num: `V-${v.id.slice(-6).toUpperCase()}`,
      data: new Date(v.criado_em).toLocaleDateString("pt-BR"),
      hora: new Date(v.criado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      operador: (v.loja_caixas as any)?.usuarios?.nome_completo ?? "—",
      forma,
      pago_especie:  Number(v.pago_especie  ?? 0),
      pago_pix:      Number(v.pago_pix      ?? 0),
      pago_cartao:   Number(v.pago_cartao   ?? 0),
      pago_saldo:    Number(v.pago_saldo    ?? 0),
      total:         Number(v.total),
    };
  }).filter(v => {
    if (filtros?.forma && v.forma !== filtros.forma) return false;
    return true;
  });
}

export async function getOperadoresVendas(orgId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("loja_caixas")
    .select("usuario_id, usuarios(nome_completo)")
    .eq("org_id", orgId);

  const mapa: Record<string, string> = {};
  for (const c of data ?? []) {
    const id = c.usuario_id;
    const nome = (c.usuarios as any)?.nome_completo ?? "—";
    if (id && !mapa[id]) mapa[id] = nome;
  }
  return Object.entries(mapa).map(([id, nome]) => ({ id, nome }));
}
