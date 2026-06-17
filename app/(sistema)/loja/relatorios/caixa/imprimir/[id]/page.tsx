import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDetalhesSessao } from "@/lib/loja/caixa-relatorio-actions";

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

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const fmtDT = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const totalSangrias = detalhes.sangrias.reduce((a: number, s: any) => a + s.valor, 0);
  const saldoEsperado = Number(caixa.valor_abertura) + Number(caixa.total_especie ?? 0) + Number(caixa.total_pix ?? 0) - totalSangrias;
  const saldoInformado = Number(caixa.valor_fechamento ?? 0);
  const diferenca = saldoInformado - saldoEsperado;
  const operador = (caixa.usuarios as any)?.nome_completo ?? "—";

  return (
    <html>
      <head>
        <meta charSet="UTF-8" />
        <style>{`
          @page { width: 80mm; margin: 0; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            width: 80mm;
            font-family: monospace;
            font-size: 12px;
            line-height: 1.5;
            color: #000;
            padding: 3mm 4mm;
          }
          .linha { border-top: 1px dashed #000; margin: 4px 0; }
          .row { display: flex; justify-content: space-between; margin: 1px 0; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .danger { font-weight: bold; }
        `}</style>
        <script dangerouslySetInnerHTML={{ __html: "window.onload = function() { window.print(); };" }} />
      </head>
      <body>

        <div className="center bold" style={{ fontSize: 14, marginBottom: 2 }}>RELATÓRIO DE CAIXA</div>
        <div className="center" style={{ marginBottom: 2 }}>COOPAIBI</div>
        <div className="linha" />

        <div className="row"><span>Operador:</span><span>{operador}</span></div>
        <div className="row"><span>Abertura:</span><span>{fmtDT(caixa.aberto_em)}</span></div>
        <div className="row"><span>Fechamento:</span><span>{caixa.fechado_em ? fmtDT(caixa.fechado_em) : "—"}</span></div>
        <div className="linha" />

        <div className="row"><span>Fundo inicial:</span><span>{fmt(Number(caixa.valor_abertura))}</span></div>
        <div className="row"><span>Total vendas:</span><span>{fmt(detalhes.vendas.reduce((a: number, v: any) => a + v.total, 0))}</span></div>
        <div className="row"><span>&nbsp;&nbsp;Dinheiro:</span><span>{fmt(Number(caixa.total_especie ?? 0))}</span></div>
        <div className="row"><span>&nbsp;&nbsp;PIX:</span><span>{fmt(Number(caixa.total_pix ?? 0))}</span></div>
        <div className="row"><span>&nbsp;&nbsp;Cartão:</span><span>{fmt(Number(caixa.total_cartao ?? 0))}</span></div>
        <div className="row"><span>Sangrias:</span><span>- {fmt(totalSangrias)}</span></div>
        <div className="linha" />

        <div className="row bold"><span>Saldo esperado:</span><span>{fmt(saldoEsperado)}</span></div>
        <div className="row bold"><span>Saldo informado:</span><span>{fmt(saldoInformado)}</span></div>
        {Math.abs(diferenca) > 0.01 && (
          <div className="row danger">
            <span>DIFERENÇA:</span>
            <span>{diferenca > 0 ? "+" : ""}{fmt(diferenca)}</span>
          </div>
        )}
        <div className="linha" />

        {detalhes.vendas.length > 0 && (
          <>
            <div className="bold center" style={{ marginBottom: 2 }}>VENDAS</div>
            {detalhes.vendas.map((v: any) => (
              <div key={v.id} className="row">
                <span>{v.hora} {v.num}</span>
                <span>{v.forma} {fmt(v.total)}</span>
              </div>
            ))}
            <div className="linha" />
          </>
        )}

        {detalhes.sangrias.length > 0 && (
          <>
            <div className="bold center" style={{ marginBottom: 2 }}>SANGRIAS</div>
            {detalhes.sangrias.map((s: any) => (
              <div key={s.id} className="row">
                <span>{s.hora} {s.tipo}</span>
                <span>{fmt(s.valor)}</span>
              </div>
            ))}
            <div className="linha" />
          </>
        )}

        <div className="center" style={{ fontSize: 10, marginTop: 4 }}>
          Impresso em {new Date().toLocaleString("pt-BR")}
        </div>

        <br/><br/><br/><br/><br/><br/><br/><br/>

      </body>
    </html>
  );
}
