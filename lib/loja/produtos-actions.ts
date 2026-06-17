"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function atualizarPrecoProduto(id: string, preco: number) {
  const supabase = await createClient();
  await supabase
    .from("loja_produtos")
    .update({ preco_normal: preco })
    .eq("id", id);
  revalidatePath("/loja/produtos");
}

export async function atualizarMinimoProduto(id: string, minimo: number) {
  const supabase = await createClient();
  await supabase
    .from("loja_produtos")
    .update({ estoque_minimo: minimo })
    .eq("id", id);
  revalidatePath("/loja/produtos");
}

export async function toggleAtivoProduto(id: string, ativo: boolean) {
  const supabase = await createClient();
  await supabase
    .from("loja_produtos")
    .update({ ativo })
    .eq("id", id);
  revalidatePath("/loja/produtos");
}
