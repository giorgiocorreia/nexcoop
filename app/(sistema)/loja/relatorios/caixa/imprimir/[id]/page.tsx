import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDetalhesSessao } from "@/lib/loja/caixa-relatorio-actions";
import ImprimirCaixaClient from "./ImprimirCaixaClient";

export default async function ImprimirCaixaPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: caixa } = await supabase
    .from("loja_caixas")
    .select("id, valor_abertura, valor_fechamento, total_especie, total_cartao, total_pix, aberto_em, fechado_em, usuarios(nome_completo)")
    .eq("id", params.id)
    .single();

  if (!caixa) redirect("/loja/relatorios/caixa");

  const detalhes = await getDetalhesSessao(params.id);

  const totalSangrias = detalhes.sangrias.reduce((a: number, s: any) => a + s.valor, 0);
  const saldoEsperado = Number(caixa.valor_abertura) + Number(caixa.total_especie ?? 0) + Number(caixa.total_pix ?? 0) - totalSangrias;
  const saldoInformado = Number(caixa.valor_fechamento ?? 0);
  const diferenca = saldoInformado - saldoEsperado;

  return (
    <ImprimirCaixaClient
      caixa={{
        operador: (caixa.usuarios as any)?.nome_completo ?? "—",
        aberto_em: caixa.aberto_em,
        fechado_em: caixa.fechado_em,
        valor_abertura: Number(caixa.valor_abertura),
        total_especie: Number(caixa.total_especie ?? 0),
        total_pix: Number(caixa.total_pix ?? 0),
        total_cartao: Number(caixa.total_cartao ?? 0),
        totalVendas: detalhes.vendas.reduce((a: number, v: any) => a + v.total, 0),
        totalSangrias,
        saldoEsperado,
        saldoInformado,
        diferenca,
      }}
      detalhes={detalhes}
    />
  );
}
