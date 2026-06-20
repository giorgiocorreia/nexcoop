import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { podeGerenciarLoja } from "@/lib/permissoes";
import RelatorioVendasClient from "./RelatorioVendasClient";
import { getVendasRelatorio, getOperadoresVendas } from "@/lib/loja/vendas-relatorio-actions";

export default async function RelatorioVendasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("organizacao_id, role, funcoes")
    .eq("id", user.id)
    .single();
  if (!usuario?.organizacao_id) redirect("/login");

  const isGerente = podeGerenciarLoja({
    role: usuario.role,
    funcoes: (usuario.funcoes ?? []) as string[],
  });

  const [vendas, operadores] = await Promise.all([
    getVendasRelatorio(usuario.organizacao_id, isGerente ? undefined : { usuarioId: user.id }),
    getOperadoresVendas(usuario.organizacao_id, isGerente),
  ]);

  return <RelatorioVendasClient vendas={vendas} operadores={operadores} />;
}
