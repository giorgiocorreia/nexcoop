"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { podeGerenciarLoja } from "@/lib/permissoes";

export async function getVendasRelatorio(orgId: string, filtros?: {
  dataInicio?: string;
  dataFim?: string;
  forma?: string;
  usuarioId?: string;
}) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("role, funcoes")
    .eq("id", user.id)
    .single();

  const isGerente = podeGerenciarLoja({
    role: usuario?.role ?? "",
    funcoes: (usuario?.funcoes ?? []) as string[],
  });

  // caixa_loja sempre vê só as próprias vendas — filtro forçado no servidor
  const usuarioIdFiltro = isGerente ? filtros?.usuarioId : user.id;

  const admin = createAdminClient();

  let query = admin
    .from("loja_vendas")
    .select(`
      id, total, pago_especie, pago_pix, pago_cartao, pago_saldo,
      criado_em, status,
      loja_caixas ( usuario_id, usuarios ( nome_completo ) ),
      loja_notas_fiscais ( id, tipo, status, chave_acesso )
    `)
    .eq("org_id", orgId)
    .eq("status", "concluida")
    .order("criado_em", { ascending: false });

  if (filtros?.dataInicio) query = query.gte("criado_em", filtros.dataInicio);
  if (filtros?.dataFim)    query = query.lte("criado_em", filtros.dataFim + "T23:59:59");

  if (usuarioIdFiltro) {
    const { data: caixas } = await admin
      .from("loja_caixas")
      .select("id")
      .eq("org_id", orgId)
      .eq("usuario_id", usuarioIdFiltro);

    const caixaIds = (caixas ?? []).map(c => c.id);
    if (caixaIds.length === 0) return [];
    query = query.in("caixa_id", caixaIds);
  }

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
      nota: (() => {
        const notas = (v as any).loja_notas_fiscais
        const nota = Array.isArray(notas) ? notas[0] : notas
        if (!nota) return null
        return {
          id:           nota.id as string,
          tipo:         nota.tipo as string,
          status:       nota.status as string,
          chave_acesso: nota.chave_acesso as string | null,
        }
      })(),
    };
  }).filter(v => {
    if (filtros?.forma && v.forma !== filtros.forma) return false;
    return true;
  });
}

export async function getOperadoresVendas(orgId: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("role, funcoes")
    .eq("id", user.id)
    .single();

  // caixa_loja não precisa do select de operador — dados já vêm filtrados
  if (!podeGerenciarLoja({ role: usuario?.role ?? "", funcoes: (usuario?.funcoes ?? []) as string[] })) {
    return [];
  }

  const admin = createAdminClient();
  const { data } = await admin
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
