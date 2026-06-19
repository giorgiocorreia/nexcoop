import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProdutosClient from "./ProdutosClient";
import { podeGerenciarLoja } from "@/lib/permissoes";

export const metadata = { title: "Produtos — Loja | NexCoop" };

export default async function ProdutosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("organizacao_id, role, funcoes")
    .eq("id", user.id)
    .single();

  if (!usuario) redirect("/login");

  const { data: produtos } = await supabase
    .from("loja_produtos")
    .select(`
      id, nome, unidade, preco_normal, estoque_minimo, ativo, ncm,
      loja_lotes ( quantidade_atual )
    `)
    .eq("org_id", usuario.organizacao_id as string)
    .order("nome");

  const produtosComEstoque = (produtos ?? []).map(p => ({
    id: p.id,
    nome: p.nome,
    unidade: p.unidade,
    preco: Number(p.preco_normal),
    estoque: ((p as any).loja_lotes as any[] ?? []).reduce(
      (s: number, l: any) => s + Number(l.quantidade_atual ?? 0), 0
    ),
    minimo: Number(p.estoque_minimo ?? 0),
    ativo: p.ativo ?? true,
    ncm: (p as any).ncm as string | null ?? null,
  }));

  const podeGerenciar = podeGerenciarLoja({
    role: usuario.role,
    funcoes: (usuario.funcoes ?? []) as string[],
  });

  return <ProdutosClient produtos={produtosComEstoque} podeGerenciar={podeGerenciar} />;
}
