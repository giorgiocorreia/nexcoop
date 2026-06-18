import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/permissoes";
import FiscalLojaClient from "./FiscalLojaClient";
import type { Organizacao } from "@/types/database";

export const metadata = { title: "Fiscal da Loja — Configurações | NexCoop" };

export default async function FiscalLojaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!usuario || !usuario.organizacao_id) redirect("/dashboard");
  if (!isAdmin(usuario)) redirect("/configuracoes");

  const admin = createAdminClient();
  const { data: org } = await admin
    .from("organizacoes")
    .select("*")
    .eq("id", usuario.organizacao_id)
    .single();

  if (!org) redirect("/configuracoes");

  const { count: semNcm } = await admin
    .from("loja_produtos")
    .select("id", { count: "exact", head: true })
    .eq("org_id", usuario.organizacao_id)
    .is("ncm", null)
    .eq("ativo", true);

  return (
    <FiscalLojaClient
      org={org as Organizacao}
      produtosSemNcm={semNcm ?? 0}
    />
  );
}
