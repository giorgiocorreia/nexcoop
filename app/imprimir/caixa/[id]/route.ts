import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDetalhesSessao } from "@/lib/loja/caixa-relatorio-actions";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url));

  const { data: caixa } = await supabase
    .from("loja_caixas")
    .select("id, valor_abertura, valor_fechamento, total_especie, total_cartao, total_pix, aberto_em, fechado_em, usuarios(nome_completo)")
    .eq("id", id)
    .single();

  if (!caixa) return new NextResponse("Não encontrado", { status: 404 });

  const detalhes = await getDetalhesSessao(id);

  const fmt = (v: number) => "R$ " + Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
  const fmtDT = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const totalSangrias = detalhes.sangrias.reduce((a: number, s: any) => a + s.valor, 0);
  const saldoEsperado = Number(caixa.valor_abertura) + Number(caixa.total_especie ?? 0) + Number(caixa.total_pix ?? 0) - totalSangrias;
  const saldoInformado = Number(caixa.valor_fechamento ?? 0);
  const diferenca = saldoInformado - saldoEsperado;
  const operador = (caixa.usuarios as any)?.nome_completo ?? "—";
  const totalVendas = detalhes.vendas.reduce((a: number, v: any) => a + v.total, 0);

  const vendasHtml = detalhes.vendas.map((v: any) => `
    <div class="row"><span>${v.hora} ${v.num}</span><span>${v.forma} ${fmt(v.total)}</span></div>
  `).join("");

  const sangriasHtml = detalhes.sangrias.map((s: any) => `
    <div class="row"><span>${s.hora} ${s.tipo}</span><span>${fmt(s.valor)}</span></div>
  `).join("");

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>Relatório de Caixa</title>
  <style>
    @page { width: 80mm; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { width: 80mm; font-family: monospace; font-size: 12px; line-height: 1.5; color: #000; padding: 3mm 4mm; }
    .linha { border-top: 1px dashed #000; margin: 4px 0; }
    .row { display: flex; justify-content: space-between; margin: 1px 0; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
  </style>
</head>
<body onload="window.print()">
  <div class="center bold" style="font-size:14px;margin-bottom:2px">RELATÓRIO DE CAIXA</div>
  <div class="center" style="margin-bottom:2px">COOPAIBI</div>
  <div class="linha"></div>

  <div class="row"><span>Operador:</span><span>${operador}</span></div>
  <div class="row"><span>Abertura:</span><span>${fmtDT(caixa.aberto_em)}</span></div>
  <div class="row"><span>Fechamento:</span><span>${caixa.fechado_em ? fmtDT(caixa.fechado_em) : "—"}</span></div>
  <div class="linha"></div>

  <div class="row"><span>Fundo inicial:</span><span>${fmt(Number(caixa.valor_abertura))}</span></div>
  <div class="row"><span>Total vendas:</span><span>${fmt(totalVendas)}</span></div>
  <div class="row"><span>&nbsp;&nbsp;Dinheiro:</span><span>${fmt(Number(caixa.total_especie ?? 0))}</span></div>
  <div class="row"><span>&nbsp;&nbsp;PIX:</span><span>${fmt(Number(caixa.total_pix ?? 0))}</span></div>
  <div class="row"><span>&nbsp;&nbsp;Cartão:</span><span>${fmt(Number(caixa.total_cartao ?? 0))}</span></div>
  <div class="row"><span>Sangrias:</span><span>- ${fmt(totalSangrias)}</span></div>
  <div class="linha"></div>

  <div class="row bold"><span>Saldo esperado:</span><span>${fmt(saldoEsperado)}</span></div>
  <div class="row bold"><span>Saldo informado:</span><span>${fmt(saldoInformado)}</span></div>
  ${Math.abs(diferenca) > 0.01 ? `<div class="row bold"><span>DIFERENÇA:</span><span>${diferenca > 0 ? "+" : ""}${fmt(diferenca)}</span></div>` : ""}
  <div class="linha"></div>

  ${detalhes.vendas.length > 0 ? `<div class="bold center" style="margin-bottom:2px">VENDAS</div>${vendasHtml}<div class="linha"></div>` : ""}
  ${detalhes.sangrias.length > 0 ? `<div class="bold center" style="margin-bottom:2px">SANGRIAS</div>${sangriasHtml}<div class="linha"></div>` : ""}

  <div class="center" style="font-size:10px;margin-top:4px">
    Impresso em ${new Date().toLocaleString("pt-BR")}
  </div>
  <br/><br/><br/><br/><br/><br/><br/><br/>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
