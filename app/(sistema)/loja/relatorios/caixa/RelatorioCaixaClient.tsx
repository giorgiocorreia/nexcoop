"use client";

import { useState } from "react";
import Link from "next/link";
import FabMenu from "@/components/loja/FabMenu";
import { getDetalhesSessao } from "@/lib/loja/caixa-relatorio-actions";

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

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDT(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function ConteudoImpressao({ sessao, detalhes }: { sessao: Sessao; detalhes: any }) {
  return (
    <div id="conteudo-impressao" style={{ display: "none" }}>
      <style>{`
        @media print {
          @page {
            width: 80mm;
            height: auto;
            margin: 0mm;
          }
          html, body {
            width: 80mm;
            margin: 0;
            padding: 0;
          }
          body * { visibility: hidden; }
          #conteudo-impressao,
          #conteudo-impressao * { visibility: visible; }
          #conteudo-impressao {
            display: block !important;
            position: fixed;
            top: 0;
            left: 0;
            width: 80mm;
            padding: 3mm 4mm 0 4mm;
            font-family: monospace;
            font-size: 12px;
            line-height: 1.5;
            color: #000;
          }
          .linha { border-top: 1px dashed #000; margin: 4px 0; }
          .row { display: flex; justify-content: space-between; margin: 2px 0; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .danger { font-weight: bold; }
        }
      `}</style>

      <div className="center bold" style={{ fontSize: 13, marginBottom: 4 }}>
        RELATÓRIO DE CAIXA
      </div>
      <div className="center" style={{ marginBottom: 2 }}>COOPAIBI</div>
      <div className="linha" />

      <div className="row"><span>Operador:</span><span>{sessao.operador}</span></div>
      <div className="row"><span>Abertura:</span><span>{fmtDT(sessao.aberto_em)}</span></div>
      <div className="row"><span>Fechamento:</span><span>{fmtDT(sessao.fechado_em)}</span></div>
      <div className="linha" />

      <div className="row"><span>Fundo inicial:</span><span>{fmt(sessao.valor_abertura)}</span></div>
      <div className="row"><span>Total vendas:</span><span>{fmt(sessao.totalVendas)}</span></div>
      <div className="row"><span>  Dinheiro:</span><span>{fmt(sessao.total_especie)}</span></div>
      <div className="row"><span>  PIX:</span><span>{fmt(sessao.total_pix)}</span></div>
      <div className="row"><span>  Cartão:</span><span>{fmt(sessao.total_cartao)}</span></div>
      <div className="row"><span>Sangrias:</span><span>- {fmt(sessao.totalSangrias)}</span></div>
      <div className="linha" />

      <div className="row bold"><span>Saldo esperado:</span><span>{fmt(sessao.saldoEsperado)}</span></div>
      <div className="row bold"><span>Saldo informado:</span><span>{fmt(sessao.saldoInformado)}</span></div>
      {Math.abs(sessao.diferenca) > 0.01 && (
        <div className="row danger">
          <span>DIFERENÇA:</span>
          <span>{sessao.diferenca > 0 ? "+" : ""}{fmt(sessao.diferenca)}</span>
        </div>
      )}
      <div className="linha" />

      {detalhes?.vendas?.length > 0 && (
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

      {detalhes?.sangrias?.length > 0 && (
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

      <div className="center" style={{ marginTop: 4, fontSize: 10 }}>
        Impresso em {new Date().toLocaleString("pt-BR")}
      </div>
      <div style={{ marginTop: 8 }}>
        <br/><br/><br/><br/><br/><br/><br/><br/>
      </div>
    </div>
  );
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
  const [sessaoAtiva, setSessaoAtiva]             = useState<Sessao | null>(null);
  const [detalhes, setDetalhes]                   = useState<any>(null);
  const [loadingId, setLoadingId]                 = useState<string | null>(null);
  const [hoveredFiltro, setHoveredFiltro]         = useState<string | null>(null);

  const filtradas = sessoes.filter(s => {
    if (filtroOperador && s.operador !== filtroOperador) return false;
    if (filtroInicio && s.aberto_em < filtroInicio) return false;
    if (filtroFim && s.aberto_em > filtroFim + "T23:59:59") return false;
    if (apenasDivergentes && Math.abs(s.diferenca) <= 0.01) return false;
    return true;
  });

  const handleImprimir = async (sessao: Sessao) => {
    setLoadingId(sessao.id);
    try {
      const det = await getDetalhesSessao(sessao.id);
      setSessaoAtiva(sessao);
      setDetalhes(det);
      setTimeout(() => window.print(), 100);
    } catch (err) {
      console.error("Erro ao carregar detalhes da sessão:", err);
      alert("Erro ao carregar dados para impressão. Tente novamente.");
    } finally {
      setLoadingId(null);
    }
  };

  const btnStyle = (ativo: boolean, hovered: boolean) => ({
    padding: "8px 16px", borderRadius: 8,
    fontSize: 13, fontWeight: 600, lineHeight: "20px",
    boxSizing: "border-box" as const, cursor: "pointer",
    background: hovered ? (ativo ? "#378ADD" : "#d1d5db") : "transparent",
    color: "#374151",
    border: ativo ? "1px solid #378ADD" : "1px solid #d1d5db",
    transform: hovered ? "scale(1.02)" : "scale(1)",
    transition: "transform 0.1s, background 0.1s",
  });

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1200, paddingBottom: 120 }}>

      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 24 }}>
        <Link href="/dashboard" style={{ fontSize: 13, color: "#78716c", textDecoration: "none" }}>NexCoop</Link>
        <span style={{ fontSize: 13, color: "#e5e3dc" }}>/</span>
        <Link href="/loja" style={{ fontSize: 13, color: "#78716c", textDecoration: "none" }}>Loja Agropecuária</Link>
        <span style={{ fontSize: 13, color: "#e5e3dc" }}>/</span>
        <span style={{ fontSize: 13, color: "#78716c", fontWeight: 600 }}>Relatório de Caixa</span>
      </div>

      {/* Filtros */}
      <div style={{
        background: "#fff", border: "1px solid #e5e3dc",
        borderRadius: 12, padding: "16px 20px", marginBottom: 16,
        display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end",
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#78716c", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>De</div>
          <input type="date" value={filtroInicio} onChange={e => setFiltroInicio(e.target.value)}
            style={{ padding: "7px 10px", borderRadius: 7, border: "1px solid #e5e3dc", fontSize: 13, outline: "none" }} />
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#78716c", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Até</div>
          <input type="date" value={filtroFim} onChange={e => setFiltroFim(e.target.value)}
            style={{ padding: "7px 10px", borderRadius: 7, border: "1px solid #e5e3dc", fontSize: 13, outline: "none" }} />
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#78716c", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Operador</div>
          <select value={filtroOperador} onChange={e => setFiltroOperador(e.target.value)}
            style={{ padding: "7px 10px", borderRadius: 7, border: "1px solid #e5e3dc", fontSize: 13, outline: "none", background: "#fff" }}>
            <option value="">Todos</option>
            {operadores.map(o => <option key={o.id} value={o.nome}>{o.nome}</option>)}
          </select>
        </div>
        <button
          onClick={() => setApenasDivergentes(!apenasDivergentes)}
          onMouseEnter={() => setHoveredFiltro("divergentes")}
          onMouseLeave={() => setHoveredFiltro(null)}
          style={btnStyle(apenasDivergentes, hoveredFiltro === "divergentes")}
        >
          ⚠ Só divergentes
        </button>
        <button
          onClick={() => { setFiltroInicio(""); setFiltroFim(""); setFiltroOperador(""); setApenasDivergentes(false); }}
          onMouseEnter={() => setHoveredFiltro("limpar")}
          onMouseLeave={() => setHoveredFiltro(null)}
          style={btnStyle(false, hoveredFiltro === "limpar")}
        >
          Limpar filtros
        </button>
      </div>

      {/* Tabela */}
      <div style={{ background: "#fff", border: "1px solid #e5e3dc", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#fafaf9", borderBottom: "1px solid #e5e3dc" }}>
              {["Abertura", "Fechamento", "Operador", "Total vendas", "Sangrias", "Saldo esperado", "Saldo informado", "Diferença", ""].map(h => (
                <th key={h} style={{
                  padding: "11px 14px", fontSize: 11, fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: "0.05em",
                  color: "#78716c", textAlign: "left", whiteSpace: "nowrap",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtradas.map((s, i) => {
              const temDif = Math.abs(s.diferenca) > 0.01;
              return (
                <tr key={s.id} style={{
                  borderBottom: "1px solid #f5f5f4",
                  background: i % 2 === 0 ? "#fff" : "#fafaf9",
                }}>
                  <td style={{ padding: "11px 14px", fontSize: 12, whiteSpace: "nowrap" }}>{fmtDT(s.aberto_em)}</td>
                  <td style={{ padding: "11px 14px", fontSize: 12, whiteSpace: "nowrap" }}>{fmtDT(s.fechado_em)}</td>
                  <td style={{ padding: "11px 14px", fontSize: 12 }}>{s.operador}</td>
                  <td style={{ padding: "11px 14px", fontSize: 12, fontWeight: 600 }}>{fmt(s.totalVendas)}</td>
                  <td style={{ padding: "11px 14px", fontSize: 12, color: s.totalSangrias > 0 ? "#D97706" : "#78716c" }}>{fmt(s.totalSangrias)}</td>
                  <td style={{ padding: "11px 14px", fontSize: 12 }}>{fmt(s.saldoEsperado)}</td>
                  <td style={{ padding: "11px 14px", fontSize: 12 }}>{fmt(s.saldoInformado)}</td>
                  <td style={{ padding: "11px 14px", fontSize: 13, fontWeight: 700, color: temDif ? "#DC2626" : "#15803d" }}>
                    {temDif ? (s.diferenca > 0 ? "+" : "") + fmt(s.diferenca) : "—"}
                  </td>
                  <td style={{ padding: "11px 14px" }}>
                    <button
                      onClick={() => handleImprimir(s)}
                      disabled={loadingId === s.id}
                      style={{
                        padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                        cursor: "pointer", background: "transparent", color: "#374151",
                        border: "1px solid #d1d5db",
                        opacity: loadingId === s.id ? 0.5 : 1,
                      }}
                    >
                      {loadingId === s.id ? "..." : "🖨 Imprimir"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtradas.length === 0 && (
          <div style={{ padding: "40px", textAlign: "center", color: "#78716c", fontSize: 13 }}>
            Nenhuma sessão encontrada.
          </div>
        )}

        <div style={{
          padding: "10px 16px", borderTop: "1px solid #f5f5f4",
          fontSize: 11, color: "#a8a29e", background: "#fafaf9",
          display: "flex", justifyContent: "space-between",
        }}>
          <span>{filtradas.length} sessão{filtradas.length !== 1 ? "ões" : ""} exibida{filtradas.length !== 1 ? "s" : ""}</span>
          <span>Total período: {fmt(filtradas.reduce((a, s) => a + s.totalVendas, 0))}</span>
        </div>
      </div>

      {sessaoAtiva && <ConteudoImpressao sessao={sessaoAtiva} detalhes={detalhes} />}

      <FabMenu />
    </div>
  );
}
