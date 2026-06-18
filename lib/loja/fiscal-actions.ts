"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { registrarLog } from "@/lib/audit/logger";
import { revalidatePath } from "next/cache";

interface DadosFiscal {
  loja_nfce_csc_id:       string | null;
  loja_nfce_csc_token:    string | null;
  loja_regime_tributario: string | null;
  loja_nfce_serie:        string | null;
  loja_nfe_saida_serie:   string | null;
}

export async function salvarFiscalLoja(
  orgId: string,
  dados: DadosFiscal
): Promise<{ sucesso: boolean; erro?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { sucesso: false, erro: "Não autenticado." };

    const admin = createAdminClient();
    const { error } = await admin
      .from("organizacoes")
      .update({
        loja_nfce_csc_id:       dados.loja_nfce_csc_id || null,
        loja_nfce_csc_token:    dados.loja_nfce_csc_token || null,
        loja_regime_tributario: dados.loja_regime_tributario || "simples",
        loja_nfce_serie:        dados.loja_nfce_serie || "001",
        loja_nfe_saida_serie:   dados.loja_nfe_saida_serie || "001",
      })
      .eq("id", orgId);

    if (error) return { sucesso: false, erro: error.message };

    await registrarLog({
      org_id: orgId,
      usuario_id: user.id,
      modulo: "loja",
      acao: "fiscal_configurado",
      dados_depois: dados,
    });

    revalidatePath("/configuracoes/fiscal-loja");
    return { sucesso: true };
  } catch (e) {
    return { sucesso: false, erro: String(e) };
  }
}
