"use client";

import { useState } from "react";
import Link from "next/link";
import FabMenu from "@/components/loja/FabMenu";

interface ItemEstoque {
  id: string; nome: string; unidade: string;
  preco_venda: number; estoque_minimo: number;
  estoque_atual: number; custo_medio: number;
  valor_estoque: number; em_alerta: boolean;
}

interface Movimentacao {
  id: string; tipo: string; quantidade: number;
  motivo: string | null; data: string; hora: string;
  produto: string; unidade: string;
}

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtNum(v: number, dec = 2) {
  return Number(v).toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function exportCSV(estoque: ItemEstoque[]) {
  const header = "Produto,Unidade,Estoque Atual,Mínimo,Custo Médio,Valor em Estoque,Preço Venda,Alerta";
  const rows = estoque.map(p =>
    `"${p.nome}",${p.unidade},${p.estoque_atual},${p.estoque_minimo},${p.custo_medio},${p.valor_estoque},${p.preco_venda},${p.em_alerta ? "Sim" : "Não"}`
  );
  const blob = new Blob([header + "\n" + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "estoque.csv"; a.click();
  URL.revokeObjectURL(url);
}

export default function RelatorioEstoqueClient({
  estoque, movimentacoes,
}: {
  estoque: ItemEstoque[];
  movimentacoes: Movimentacao[];
}) {
  const [aba, setAba]               = useState<"posicao" | "movimentacoes">("posicao");
  const [busca, setBusca]           = useState("");
  const [apenasAlerta, setApenasAlerta] = useState(false);
  const [hoveredFiltro, setHoveredFiltro] = useState<string | null>(null);

  const filtrados = estoque.filter(p => {
    if (busca && !p.nome.toLowerCase().includes(busca.toLowerCase())) return false;
    if (apenasAlerta && !p.em_alerta) return false;
    return true;
  });

  const valorTotalEstoque = filtrados.reduce((a, p) => a + p.valor_estoque, 0);
  const totalItens        = filtrados.length;
  const totalAlertas      = estoque.filter(p => p.em_alerta).length;

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
        <Link href="/loja" style={{ fontSize: 13, color: "#78716c", textDecoration: "none" }}>NexCoop</Link>
        <span style={{ fontSize: 13, color: "#e5e3dc" }}>/</span>
        <Link href="/loja" style={{ fontSize: 13, color: "#78716c", textDecoration: "none" }}>Loja Agropecuária</Link>
        <span style={{ fontSize: 13, color: "#e5e3dc" }}>/</span>
        <span style={{ fontSize: 13, color: "#78716c", fontWeight: 600 }}>Relatório de Estoque</span>
      </div>

      {/* Abas */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {([
          { key: "posicao",       label: "Posição Atual" },
          { key: "movimentacoes", label: "Movimentações" },
        ] as const).map(a => (
          <button
            key={a.key}
            onClick={() => setAba(a.key)}
            onMouseEnter={() => setHoveredFiltro(a.key)}
            onMouseLeave={() => setHoveredFiltro(null)}
            style={btnStyle(aba === a.key, hoveredFiltro === a.key)}
          >{a.label}</button>
        ))}
      </div>

      {aba === "posicao" && (
        <>
          {/* KPIs */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 12, marginBottom: 16,
          }}>
            {[
              { label: "Produtos ativos", value: String(totalItens) },
              { label: "Em alerta", value: String(totalAlertas), alert: totalAlertas > 0 },
              { label: "Valor em estoque", value: fmt(valorTotalEstoque), bold: true },
            ].map(c => (
              <div key={c.label} style={{
                background: "#fff", border: "1px solid #e5e3dc",
                borderRadius: 10, padding: "12px 16px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              }}>
                <div style={{ fontSize: 11, color: "#78716c", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{c.label}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: c.alert ? "#DC2626" : "#1c1917" }}>{c.value}</div>
              </div>
            ))}
          </div>

          {/* Filtros */}
          <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
            <input
              placeholder="Buscar produto..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e3dc", fontSize: 13, outline: "none", width: 220 }}
            />
            <button
              onClick={() => setApenasAlerta(!apenasAlerta)}
              onMouseEnter={() => setHoveredFiltro("alerta")}
              onMouseLeave={() => setHoveredFiltro(null)}
              style={btnStyle(apenasAlerta, hoveredFiltro === "alerta")}
            >⚠ Só alertas</button>
            <button
              onClick={() => exportCSV(filtrados)}
              onMouseEnter={() => setHoveredFiltro("csv")}
              onMouseLeave={() => setHoveredFiltro(null)}
              style={btnStyle(false, hoveredFiltro === "csv")}
            >⬇ Exportar CSV</button>
          </div>

          {/* Tabela posição */}
          <div style={{ background: "#fff", border: "1px solid #e5e3dc", borderRadius: 12, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#fafaf9", borderBottom: "1px solid #e5e3dc" }}>
                  {["Produto", "Un.", "Estoque atual", "Mínimo", "Custo médio", "Valor estoque", "Preço venda", ""].map(h => (
                    <th key={h} style={{
                      padding: "11px 14px", fontSize: 11, fontWeight: 700,
                      textTransform: "uppercase", letterSpacing: "0.05em",
                      color: "#78716c", textAlign: "left", whiteSpace: "nowrap",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.map((p, i) => (
                  <tr key={p.id} style={{ borderBottom: "1px solid #f5f5f4", background: i % 2 === 0 ? "#fff" : "#fafaf9" }}>
                    <td style={{ padding: "11px 14px", fontSize: 13, fontWeight: 600 }}>{p.nome}</td>
                    <td style={{ padding: "11px 14px" }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "#78716c", background: "#f5f5f4", padding: "2px 8px", borderRadius: 5 }}>{p.unidade}</span>
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <span style={{
                        fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 99,
                        background: p.em_alerta ? (p.estoque_atual === 0 ? "#fef2f2" : "#fffbeb") : "#f0fdf4",
                        color: p.em_alerta ? (p.estoque_atual === 0 ? "#DC2626" : "#D97706") : "#15803d",
                        border: `1px solid ${p.em_alerta ? (p.estoque_atual === 0 ? "#fecaca" : "#fde68a") : "#bbf7d0"}`,
                      }}>
                        {fmtNum(p.estoque_atual)} {p.em_alerta && p.estoque_atual === 0 ? "— zerado" : p.em_alerta ? "⚠" : ""}
                      </span>
                    </td>
                    <td style={{ padding: "11px 14px", fontSize: 12, color: "#78716c" }}>{fmtNum(p.estoque_minimo)}</td>
                    <td style={{ padding: "11px 14px", fontSize: 12 }}>{fmt(p.custo_medio)}</td>
                    <td style={{ padding: "11px 14px", fontSize: 13, fontWeight: 700 }}>{fmt(p.valor_estoque)}</td>
                    <td style={{ padding: "11px 14px", fontSize: 12 }}>{fmt(p.preco_venda)}</td>
                    <td style={{ padding: "11px 14px" }}>
                      {p.em_alerta && (
                        <span style={{ fontSize: 11, color: "#DC2626", fontWeight: 600 }}>Repor</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtrados.length === 0 && (
              <div style={{ padding: "40px", textAlign: "center", color: "#78716c", fontSize: 13 }}>Nenhum produto encontrado.</div>
            )}
            <div style={{
              padding: "10px 16px", borderTop: "1px solid #f5f5f4",
              fontSize: 11, color: "#a8a29e", background: "#fafaf9",
              display: "flex", justifyContent: "space-between",
            }}>
              <span>{filtrados.length} produto{filtrados.length !== 1 ? "s" : ""}</span>
              <span>Valor total: {fmt(valorTotalEstoque)}</span>
            </div>
          </div>
        </>
      )}

      {aba === "movimentacoes" && (
        <div style={{ background: "#fff", border: "1px solid #e5e3dc", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#fafaf9", borderBottom: "1px solid #e5e3dc" }}>
                {["Data", "Hora", "Produto", "Tipo", "Quantidade", "Motivo"].map(h => (
                  <th key={h} style={{
                    padding: "11px 14px", fontSize: 11, fontWeight: 700,
                    textTransform: "uppercase", letterSpacing: "0.05em",
                    color: "#78716c", textAlign: "left", whiteSpace: "nowrap",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {movimentacoes.map((m, i) => (
                <tr key={m.id} style={{ borderBottom: "1px solid #f5f5f4", background: i % 2 === 0 ? "#fff" : "#fafaf9" }}>
                  <td style={{ padding: "11px 14px", fontSize: 12 }}>{m.data}</td>
                  <td style={{ padding: "11px 14px", fontSize: 12, color: "#78716c", fontFamily: "monospace" }}>{m.hora}</td>
                  <td style={{ padding: "11px 14px", fontSize: 13, fontWeight: 600 }}>{m.produto}</td>
                  <td style={{ padding: "11px 14px" }}>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 5,
                      background: m.tipo === "entrada" ? "#f0fdf4" : "#fef2f2",
                      color: m.tipo === "entrada" ? "#15803d" : "#DC2626",
                    }}>{m.tipo}</span>
                  </td>
                  <td style={{ padding: "11px 14px", fontSize: 12, fontWeight: 600 }}>
                    {m.tipo === "entrada" ? "+" : "-"}{fmtNum(m.quantidade)} {m.unidade}
                  </td>
                  <td style={{ padding: "11px 14px", fontSize: 12, color: "#78716c" }}>{m.motivo ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {movimentacoes.length === 0 && (
            <div style={{ padding: "40px", textAlign: "center", color: "#78716c", fontSize: 13 }}>Nenhuma movimentação registrada.</div>
          )}
          <div style={{ padding: "10px 16px", borderTop: "1px solid #f5f5f4", fontSize: 11, color: "#a8a29e", background: "#fafaf9" }}>
            {movimentacoes.length} movimentação{movimentacoes.length !== 1 ? "ões" : ""}
          </div>
        </div>
      )}

      <FabMenu />
    </div>
  );
}
