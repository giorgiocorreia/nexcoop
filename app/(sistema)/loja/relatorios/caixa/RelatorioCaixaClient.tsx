"use client";

import { useState } from "react";
import Link from "next/link";

interface Sessao {
  id: string;
  operador: string;
  aberto_em: string;
  fechado_em: string;
  valor_abertura: number;
  total_especie: number;
  total_cartao: number;
  total_pix: number;
  totalVendas: number;
  totalSangrias: number;
  saldoEsperado: number;
  saldoInformado: number;
  diferenca: number;
}

interface Operador { id: string; nome: string }

const C = {
  laranja: '#E07B30', laranjaLt: '#FFF7ED',
  verde: '#15803d',
  vermelho: '#DC2626',
  borda: '#E5E3DC', bg: '#F8F7F4',
  txt: '#1C1917', txtSub: '#78716C',
}

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDT(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function RelatorioCaixaClient({
  sessoes, operadores,
}: {
  sessoes: Sessao[];
  operadores: Operador[];
  orgId: string;
}) {
  const [filtroOperador, setFiltroOperador]       = useState("");
  const [filtroInicio, setFiltroInicio]           = useState("");
  const [filtroFim, setFiltroFim]                 = useState("");
  const [apenasDivergentes, setApenasDivergentes] = useState(false);

  const handleImprimir = (id: string) => {
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none;";
    document.body.appendChild(iframe);
    iframe.src = `/imprimir/caixa/${id}`;
    iframe.onload = () => {
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 2000);
    };
  };

  const filtradas = sessoes.filter(s => {
    if (filtroOperador && s.operador !== filtroOperador) return false;
    if (apenasDivergentes && Math.abs(s.diferenca) <= 0.01) return false;
    if (filtroInicio || filtroFim) {
      const aberto = new Date(s.aberto_em).getTime()
      if (filtroInicio && aberto < new Date(filtroInicio).getTime()) return false;
      if (filtroFim && aberto > new Date(filtroFim + "T23:59:59").getTime()) return false;
    }
    return true;
  });

  const inp: React.CSSProperties = {
    fontSize: 12, padding: '6px 10px', border: `1px solid ${C.borda}`, borderRadius: 8, outline: 'none', background: '#fff',
  }

  return (
    <>
      <style>{`
        .rc-header  { padding: 0 32px; min-height: 88px; display: flex; align-items: center; }
        .rc-content { padding: 28px 32px; }
        @media (max-width: 640px) {
          .rc-header  { padding: 0 16px 0 56px; min-height: 60px; }
          .rc-content { padding: 16px; }
        }
      `}</style>

      <header className="rc-header" style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: '#fff', borderBottom: `1px solid ${C.borda}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, margin: '0 -2rem 0 -2rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: C.laranjaLt, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="ti ti-report-money" style={{ fontSize: 20, color: C.laranja }} />
          </div>
          <div>
            <h1 style={{ fontSize: 19, fontWeight: 800, color: C.txt, margin: 0, lineHeight: 1.2 }}>Relatório de Caixa</h1>
            <div style={{ fontSize: 12, color: C.txtSub, marginTop: 2 }}>
              <Link href="/loja" style={{ color: C.txtSub, textDecoration: 'none' }}>Loja Agropecuária</Link>
              {' / '}Relatórios
            </div>
          </div>
        </div>
      </header>

      <div className="rc-content" style={{ background: C.bg, margin: '0 -2rem -2rem -2rem', minHeight: 'calc(100vh - 88px)' }}>

        {/* Filtros */}
        <div style={{ background: '#fff', border: `1px solid ${C.borda}`, borderRadius: 12, padding: '14px 20px', marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: C.txtSub }}>De</span>
            <input type="date" value={filtroInicio} onChange={e => setFiltroInicio(e.target.value)} style={inp} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: C.txtSub }}>Até</span>
            <input type="date" value={filtroFim} onChange={e => setFiltroFim(e.target.value)} style={inp} />
          </div>
          {operadores.length > 0 && (
            <select value={filtroOperador} onChange={e => setFiltroOperador(e.target.value)} style={inp}>
              <option value="">Todos os operadores</option>
              {operadores.map(o => <option key={o.id} value={o.nome}>{o.nome}</option>)}
            </select>
          )}
          <button
            onClick={() => setApenasDivergentes(!apenasDivergentes)}
            style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1px solid ${apenasDivergentes ? C.vermelho : C.borda}`, background: apenasDivergentes ? '#fef2f2' : '#fff', color: apenasDivergentes ? C.vermelho : C.txtSub }}
          >
            ⚠ Só divergentes
          </button>
          <button
            onClick={() => { setFiltroInicio(""); setFiltroFim(""); setFiltroOperador(""); setApenasDivergentes(false); }}
            style={{ fontSize: 12, padding: '6px 12px', borderRadius: 8, border: `1px solid ${C.borda}`, background: 'transparent', color: C.txtSub, cursor: 'pointer' }}
          >
            Limpar
          </button>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: C.txtSub, whiteSpace: 'nowrap' }}>
            {filtradas.length} sessão{filtradas.length !== 1 ? 'ões' : ''} · {fmt(filtradas.reduce((a, s) => a + s.totalVendas, 0))}
          </span>
        </div>

        {/* Tabela */}
        <div style={{ background: '#fff', border: `1px solid ${C.borda}`, borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 780 }}>
              <thead>
                <tr style={{ background: '#fafaf9', borderBottom: `1px solid ${C.borda}` }}>
                  {["Abertura", "Fechamento", "Operador", "Total vendas", "Sangrias", "Saldo esperado", "Saldo informado", "Diferença", ""].map(h => (
                    <th key={h} style={{ padding: "11px 14px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: C.txtSub, textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtradas.map((s, i) => {
                  const temDif = Math.abs(s.diferenca) > 0.01;
                  return (
                    <tr key={s.id} style={{ borderBottom: "1px solid #f5f5f4", background: i % 2 === 0 ? "#fff" : "#fafaf9" }}>
                      <td style={{ padding: "11px 14px", fontSize: 12, whiteSpace: "nowrap" }}>{fmtDT(s.aberto_em)}</td>
                      <td style={{ padding: "11px 14px", fontSize: 12, whiteSpace: "nowrap" }}>{fmtDT(s.fechado_em)}</td>
                      <td style={{ padding: "11px 14px", fontSize: 12 }}>{s.operador}</td>
                      <td style={{ padding: "11px 14px", fontSize: 12, fontWeight: 600 }}>{fmt(s.totalVendas)}</td>
                      <td style={{ padding: "11px 14px", fontSize: 12, color: s.totalSangrias > 0 ? "#D97706" : C.txtSub }}>{fmt(s.totalSangrias)}</td>
                      <td style={{ padding: "11px 14px", fontSize: 12 }}>{fmt(s.saldoEsperado)}</td>
                      <td style={{ padding: "11px 14px", fontSize: 12 }}>{fmt(s.saldoInformado)}</td>
                      <td style={{ padding: "11px 14px", fontSize: 13, fontWeight: 700, color: temDif ? C.vermelho : C.verde }}>
                        {temDif ? (s.diferenca > 0 ? "+" : "") + fmt(s.diferenca) : "—"}
                      </td>
                      <td style={{ padding: "11px 14px" }}>
                        <button onClick={() => handleImprimir(s.id)} style={{ padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", background: "transparent", color: C.txt, border: `1px solid ${C.borda}` }}>
                          <i className="ti ti-printer" style={{ fontSize: 12, marginRight: 4 }} />
                          Imprimir
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filtradas.length === 0 && (
            <div style={{ padding: "40px", textAlign: "center", color: C.txtSub, fontSize: 13 }}>Nenhuma sessão encontrada.</div>
          )}

          <div style={{ padding: "10px 16px", borderTop: "1px solid #f5f5f4", fontSize: 11, color: "#a8a29e", background: "#fafaf9", display: "flex", justifyContent: "space-between" }}>
            <span>{filtradas.length} sessão{filtradas.length !== 1 ? "ões" : ""} exibida{filtradas.length !== 1 ? "s" : ""}</span>
            <span>Total período: {fmt(filtradas.reduce((a, s) => a + s.totalVendas, 0))}</span>
          </div>
        </div>
      </div>
    </>
  );
}
