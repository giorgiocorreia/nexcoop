"use client";

import { useEffect } from "react";

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDT(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function ImprimirCaixaClient({ caixa, detalhes }: { caixa: any; detalhes: any }) {
  useEffect(() => {
    window.print();
  }, []);

  return (
    <>
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
          background: #fff;
        }
        .linha { border-top: 1px dashed #000; margin: 4px 0; }
        .row { display: flex; justify-content: space-between; margin: 1px 0; }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .danger { font-weight: bold; }
      `}</style>

      <div className="center bold" style={{ fontSize: 14, marginBottom: 2 }}>RELATÓRIO DE CAIXA</div>
      <div className="center" style={{ marginBottom: 2 }}>COOPAIBI</div>
      <div className="linha" />

      <div className="row"><span>Operador:</span><span>{caixa.operador}</span></div>
      <div className="row"><span>Abertura:</span><span>{fmtDT(caixa.aberto_em)}</span></div>
      <div className="row"><span>Fechamento:</span><span>{caixa.fechado_em ? fmtDT(caixa.fechado_em) : "—"}</span></div>
      <div className="linha" />

      <div className="row"><span>Fundo inicial:</span><span>{fmt(caixa.valor_abertura)}</span></div>
      <div className="row"><span>Total vendas:</span><span>{fmt(caixa.totalVendas)}</span></div>
      <div className="row"><span>&nbsp;&nbsp;Dinheiro:</span><span>{fmt(caixa.total_especie)}</span></div>
      <div className="row"><span>&nbsp;&nbsp;PIX:</span><span>{fmt(caixa.total_pix)}</span></div>
      <div className="row"><span>&nbsp;&nbsp;Cartão:</span><span>{fmt(caixa.total_cartao)}</span></div>
      <div className="row"><span>Sangrias:</span><span>- {fmt(caixa.totalSangrias)}</span></div>
      <div className="linha" />

      <div className="row bold"><span>Saldo esperado:</span><span>{fmt(caixa.saldoEsperado)}</span></div>
      <div className="row bold"><span>Saldo informado:</span><span>{fmt(caixa.saldoInformado)}</span></div>
      {Math.abs(caixa.diferenca) > 0.01 && (
        <div className="row danger">
          <span>DIFERENÇA:</span>
          <span>{caixa.diferenca > 0 ? "+" : ""}{fmt(caixa.diferenca)}</span>
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
    </>
  );
}
