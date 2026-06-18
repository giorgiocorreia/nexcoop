"use client";

import { useState } from "react";
import Link from "next/link";

interface Venda {
  id: string; num: string; data: string; hora: string;
  operador: string; forma: string;
  pago_especie: number; pago_pix: number; pago_cartao: number; pago_saldo: number;
  total: number;
}

interface Operador { id: string; nome: string; }

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtForma(f: string) {
  const map: Record<string, string> = {
    especie: "Dinheiro", pix: "PIX",
    cartao: "Cartão", credito_cooperado: "Crédito Coop.",
  };
  return map[f] ?? f;
}

function exportCSV(vendas: Venda[]) {
  const header = "Nº,Data,Hora,Operador,Forma,Dinheiro,PIX,Cartão,Crédito Coop.,Total";
  const rows = vendas.map(v =>
    `${v.num},${v.data},${v.hora},"${v.operador}",${fmtForma(v.forma)},${v.pago_especie},${v.pago_pix},${v.pago_cartao},${v.pago_saldo},${v.total}`
  );
  const blob = new Blob([header + "\n" + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "vendas.csv"; a.click();
  URL.revokeObjectURL(url);
}

export default function RelatorioVendasClient({ vendas, operadores }: { vendas: Venda[]; operadores: Operador[] }) {
  const [filtroInicio, setFiltroInicio] = useState("");
  const [filtroFim, setFiltroFim]       = useState("");
  const [filtroForma, setFiltroForma]   = useState("");
  const [filtroOp, setFiltroOp]         = useState("");
  const [hoveredFiltro, setHoveredFiltro] = useState<string | null>(null);

  const filtradas = vendas.filter(v => {
    if (filtroForma && v.forma !== filtroForma) return false;
    if (filtroOp    && v.operador !== filtroOp) return false;
    if (filtroInicio && v.data < filtroInicio.split("-").reverse().join("/")) return false;
    if (filtroFim   && v.data > filtroFim.split("-").reverse().join("/")) return false;
    return true;
  });

  const totalGeral    = filtradas.reduce((a, v) => a + v.total, 0);
  const totalEspecie  = filtradas.reduce((a, v) => a + v.pago_especie, 0);
  const totalPix      = filtradas.reduce((a, v) => a + v.pago_pix, 0);
  const totalCartao   = filtradas.reduce((a, v) => a + v.pago_cartao, 0);
  const totalSaldo    = filtradas.reduce((a, v) => a + v.pago_saldo, 0);

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
    <div style={{ padding: "24px 32px", maxWidth: 1200 }}>

      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 24 }}>
        <Link href="/loja" style={{ fontSize: 13, color: "#78716c", textDecoration: "none" }}>NexCoop</Link>
        <span style={{ fontSize: 13, color: "#e5e3dc" }}>/</span>
        <Link href="/loja" style={{ fontSize: 13, color: "#78716c", textDecoration: "none" }}>Loja Agropecuária</Link>
        <span style={{ fontSize: 13, color: "#e5e3dc" }}>/</span>
        <span style={{ fontSize: 13, color: "#78716c", fontWeight: 600 }}>Relatório de Vendas</span>
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
          <div style={{ fontSize: 11, fontWeight: 600, color: "#78716c", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Forma</div>
          <select value={filtroForma} onChange={e => setFiltroForma(e.target.value)}
            style={{ padding: "7px 10px", borderRadius: 7, border: "1px solid #e5e3dc", fontSize: 13, outline: "none", background: "#fff" }}>
            <option value="">Todas</option>
            <option value="especie">Dinheiro</option>
            <option value="pix">PIX</option>
            <option value="cartao">Cartão</option>
            <option value="credito_cooperado">Crédito Coop.</option>
          </select>
        </div>
        {operadores.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#78716c", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Operador</div>
            <select value={filtroOp} onChange={e => setFiltroOp(e.target.value)}
              style={{ padding: "7px 10px", borderRadius: 7, border: "1px solid #e5e3dc", fontSize: 13, outline: "none", background: "#fff" }}>
              <option value="">Todos</option>
              {operadores.map(o => <option key={o.id} value={o.nome}>{o.nome}</option>)}
            </select>
          </div>
        )}
        <button
          onClick={() => { setFiltroInicio(""); setFiltroFim(""); setFiltroForma(""); setFiltroOp(""); }}
          onMouseEnter={() => setHoveredFiltro("limpar")}
          onMouseLeave={() => setHoveredFiltro(null)}
          style={btnStyle(false, hoveredFiltro === "limpar")}
        >Limpar filtros</button>
        <button
          onClick={() => exportCSV(filtradas)}
          onMouseEnter={() => setHoveredFiltro("csv")}
          onMouseLeave={() => setHoveredFiltro(null)}
          style={btnStyle(false, hoveredFiltro === "csv")}
        >⬇ Exportar CSV</button>
      </div>

      {/* Totalizadores */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
        gap: 12, marginBottom: 16,
      }}>
        {[
          { label: "Total", value: fmt(totalGeral), bold: true },
          { label: "Dinheiro", value: fmt(totalEspecie) },
          { label: "PIX", value: fmt(totalPix) },
          { label: "Cartão", value: fmt(totalCartao) },
          { label: "Crédito Coop.", value: fmt(totalSaldo) },
        ].map(c => (
          <div key={c.label} style={{
            background: "#fff", border: "1px solid #e5e3dc",
            borderRadius: 10, padding: "12px 16px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          }}>
            <div style={{ fontSize: 11, color: "#78716c", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{c.label}</div>
            <div style={{ fontSize: 18, fontWeight: c.bold ? 700 : 600, color: "#1c1917" }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Tabela */}
      <div style={{ background: "#fff", border: "1px solid #e5e3dc", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#fafaf9", borderBottom: "1px solid #e5e3dc" }}>
              {["Data", "Hora", "Nº", "Operador", "Forma", "Total"].map(h => (
                <th key={h} style={{
                  padding: "11px 14px", fontSize: 11, fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: "0.05em",
                  color: "#78716c", textAlign: "left", whiteSpace: "nowrap",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtradas.map((v, i) => (
              <tr key={v.id} style={{ borderBottom: "1px solid #f5f5f4", background: i % 2 === 0 ? "#fff" : "#fafaf9" }}>
                <td style={{ padding: "11px 14px", fontSize: 12 }}>{v.data}</td>
                <td style={{ padding: "11px 14px", fontSize: 12, color: "#78716c", fontFamily: "monospace" }}>{v.hora}</td>
                <td style={{ padding: "11px 14px", fontSize: 12, fontWeight: 600, color: "#378ADD" }}>{v.num}</td>
                <td style={{ padding: "11px 14px", fontSize: 12 }}>{v.operador}</td>
                <td style={{ padding: "11px 14px", fontSize: 11 }}>
                  <span style={{
                    background: v.forma === "credito_cooperado" ? "#e0f2fe" : "#f5f5f4",
                    color: v.forma === "credito_cooperado" ? "#0369a1" : "#78716c",
                    padding: "2px 7px", borderRadius: 5, fontWeight: 600, whiteSpace: "nowrap",
                  }}>{fmtForma(v.forma)}</span>
                </td>
                <td style={{ padding: "11px 14px", fontSize: 13, fontWeight: 700, textAlign: "right" }}>{fmt(v.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtradas.length === 0 && (
          <div style={{ padding: "40px", textAlign: "center", color: "#78716c", fontSize: 13 }}>
            Nenhuma venda encontrada.
          </div>
        )}

        <div style={{
          padding: "10px 16px", borderTop: "1px solid #f5f5f4",
          fontSize: 11, color: "#a8a29e", background: "#fafaf9",
          display: "flex", justifyContent: "space-between",
        }}>
          <span>{filtradas.length} venda{filtradas.length !== 1 ? "s" : ""}</span>
          <span>Total: {fmt(totalGeral)}</span>
        </div>
      </div>

    </div>
  );
}
