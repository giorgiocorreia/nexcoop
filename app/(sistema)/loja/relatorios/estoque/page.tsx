import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RelatorioEstoqueClient from "./RelatorioEstoqueClient";
import { getEstoqueAtual, getMovimentacoes } from "@/lib/loja/estoque-relatorio-actions";

export default async function RelatorioEstoquePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: usuario } = await supabase
    .from("usuarios").select("organizacao_id").eq("id", user.id).single();
  if (!usuario?.organizacao_id) redirect("/login");

  const [estoque, movimentacoes] = await Promise.all([
    getEstoqueAtual(usuario.organizacao_id),
    getMovimentacoes(usuario.organizacao_id),
  ]);

  return <RelatorioEstoqueClient estoque={estoque} movimentacoes={movimentacoes} />;
}
