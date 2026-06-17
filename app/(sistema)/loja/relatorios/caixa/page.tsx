import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RelatorioCaixaClient from "./RelatorioCaixaClient";
import { getSessoesCaixa, getOperadoresCaixa } from "@/lib/loja/caixa-relatorio-actions";

export const metadata = { title: "Relatório de Caixa — Loja | NexCoop" };

export default async function RelatorioCaixaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("organizacao_id")
    .eq("id", user.id)
    .single();

  if (!usuario) redirect("/login");

  const orgId = usuario.organizacao_id as string;

  const [sessoes, operadores] = await Promise.all([
    getSessoesCaixa(orgId),
    getOperadoresCaixa(orgId),
  ]);

  return <RelatorioCaixaClient sessoes={sessoes} operadores={operadores} orgId={orgId} />;
}
