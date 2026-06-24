"use client";

import { useState } from "react";
import Link from "next/link";

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

const C = {
  laranja: '#E07B30', laranjaLt: '#FFF7ED',
  verde: '#1D9E75', verdeLt: '#F0FDF4',
  vermelho: '#DC2626', vermelhoLt: '#FEF2F2',
  borda: '#E5E3DC', bg: '#F8F7F4',
  txt: '#1C1917', txtSub: '#78716C',
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
  const [aba, setAba]           = useState<"posicao" | "movimentacoes">("posicao");
  const [busca, setBusca]       = useState("");
  const [apenasAlerta, setApenasAlerta] = useState(false);

  const filtrados = estoque.filter(p => {
    if (busca && !p.nome.toLowerCase().includes(busca.toLowerCase())) return false;
    if (apenasAlerta && !p.em_alerta) return false;
    return true;
  });

  const valorTotalEstoque = filtrados.reduce((a, p) => a + p.valor_estoque, 0);
  const totalAlertas      = estoque.filter(p => p.em_alerta).length;

  const inp: React.CSSProperties = {
    fontSize: 12, padding: '6px 10px', border: `1px solid ${C.borda}`, borderRadius: 8, outline: 'none', background: '#fff',
  }

  return (
    <>
      <style>{`
        .re-header  { padding: 0 32px; min-height: 88px; display: flex; align-items: center; }
        .re-content { padding: 28px 32px; }
        @media (max-width: 640px) {
          .re-header  { padding: 0 16px 0 56px; min-height: 60px; }
          .re-content { padding: 16px; }
        }
      `}</style>

      <header className="re-header" style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: '#fff', borderBottom: `1px solid ${C.borda}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, margin: '0 -2rem 0 -2rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: C.laranjaLt, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="ti ti-chart-dots" style={{ fontSize: 20, color: C.laranja }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{ fontSize: 19, fontWeight: 800, color: C.txt, margin: 0, lineHeight: 1.2 }}>Relatório de Estoque</h1>
              {totalAlertas > 0 && (
                <span style={{ background: C.vermelhoLt, color: C.vermelho, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6 }}>
                  {totalAlertas} alerta{totalAlertas !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: C.txtSub, marginTop: 2 }}>
              <Link href="/loja" style={{ color: C.txtSub, textDecoration: 'none' }}>Loja Agropecuária</Link>
              {' / '}Relatórios
            </div>
          </div>
        </div>
      </header>

      <div className="re-content" style={{ background: C.bg, margin: '0 -2rem -2rem -2rem', minHeight: 'calc(100vh - 88px)' }}>

        {/* Abas */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
          {([
            { key: 'posicao', label: 'Posição Atual' },
            { key: 'movimentacoes', label: 'Movimentações' },
          ] as const).map(a => (
            <button
              key={a.key}
              onClick={() => setAba(a.key)}
              style={{
                padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                cursor: 'pointer', border: `1px solid ${aba === a.key ? C.laranja : C.borda}`,
                background: aba === a.key ? C.laranjaLt : '#fff',
                color: aba === a.key ? C.laranja : C.txtSub,
              }}
            >{a.label}</button>
          ))}
        </div>

        {aba === 'posicao' && (
          <>
            {/* Filtros */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                placeholder="Buscar produto..."
                value={busca}
                onChange={e => setBusca(e.target.value)}
                style={{ ...inp, width: 220 }}
              />
              <button
                onClick={() => setApenasAlerta(!apenasAlerta)}
                style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1px solid ${apenasAlerta ? C.vermelho : C.borda}`, background: apenasAlerta ? C.vermelhoLt : '#fff', color: apenasAlerta ? C.vermelho : C.txtSub }}
              >
                <i className="ti ti-alert-triangle" style={{ fontSize: 13, marginRight: 4 }} />
                Só alertas
              </button>
              <button onClick={() => exportCSV(filtrados)} style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1px solid ${C.borda}`, background: '#fff', color: C.txtSub, display: 'flex', alignItems: 'center', gap: 4 }}>
                <i className="ti ti-download" style={{ fontSize: 13 }} />
                Exportar CSV
              </button>
              <span style={{ marginLeft: 'auto', fontSize: 12, color: C.txtSub, whiteSpace: 'nowrap' }}>
                {filtrados.length} produto{filtrados.length !== 1 ? 's' : ''} · {fmt(valorTotalEstoque)} em estoque
              </span>
            </div>

            {/* Tabela posição */}
            <div style={{ background: '#fff', border: `1px solid ${C.borda}`, borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 680 }}>
                  <thead>
                    <tr style={{ background: '#fafaf9', borderBottom: `1px solid ${C.borda}` }}>
                      {["Produto", "Un.", "Estoque atual", "Mínimo", "Custo médio", "Valor estoque", "Preço venda", ""].map(h => (
                        <th key={h} style={{ padding: "11px 14px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: C.txtSub, textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtrados.map((p, i) => (
                      <tr key={p.id} style={{ borderBottom: "1px solid #f5f5f4", background: i % 2 === 0 ? "#fff" : "#fafaf9" }}>
                        <td style={{ padding: "11px 14px", fontSize: 13, fontWeight: 600 }}>{p.nome}</td>
                        <td style={{ padding: "11px 14px" }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: C.txtSub, background: "#f5f5f4", padding: "2px 8px", borderRadius: 5 }}>{p.unidade}</span>
                        </td>
                        <td style={{ padding: "11px 14px" }}>
                          <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: p.em_alerta ? (p.estoque_atual === 0 ? C.vermelhoLt : "#fffbeb") : C.verdeLt, color: p.em_alerta ? (p.estoque_atual === 0 ? C.vermelho : "#D97706") : C.verde, border: `1px solid ${p.em_alerta ? (p.estoque_atual === 0 ? "#fecaca" : "#fde68a") : "#bbf7d0"}` }}>
                            {fmtNum(p.estoque_atual)} {p.em_alerta && p.estoque_atual === 0 ? "— zerado" : p.em_alerta ? "⚠" : ""}
                          </span>
                        </td>
                        <td style={{ padding: "11px 14px", fontSize: 12, color: C.txtSub }}>{fmtNum(p.estoque_minimo)}</td>
                        <td style={{ padding: "11px 14px", fontSize: 12 }}>{fmt(p.custo_medio)}</td>
                        <td style={{ padding: "11px 14px", fontSize: 13, fontWeight: 700 }}>{fmt(p.valor_estoque)}</td>
                        <td style={{ padding: "11px 14px", fontSize: 12 }}>{fmt(p.preco_venda)}</td>
                        <td style={{ padding: "11px 14px" }}>
                          {p.em_alerta && <span style={{ fontSize: 11, color: C.vermelho, fontWeight: 700 }}>Repor</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filtrados.length === 0 && (
                <div style={{ padding: "40px", textAlign: "center", color: C.txtSub, fontSize: 13 }}>Nenhum produto encontrado.</div>
              )}
              <div style={{ padding: "10px 16px", borderTop: "1px solid #f5f5f4", fontSize: 11, color: "#a8a29e", background: "#fafaf9", display: "flex", justifyContent: "space-between" }}>
                <span>{filtrados.length} produto{filtrados.length !== 1 ? "s" : ""}</span>
                <span>Valor total: {fmt(valorTotalEstoque)}</span>
              </div>
            </div>
          </>
        )}

        {aba === 'movimentacoes' && (
          <div style={{ background: '#fff', border: `1px solid ${C.borda}`, borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
                <thead>
                  <tr style={{ background: '#fafaf9', borderBottom: `1px solid ${C.borda}` }}>
                    {["Data", "Hora", "Produto", "Tipo", "Quantidade", "Motivo"].map(h => (
                      <th key={h} style={{ padding: "11px 14px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: C.txtSub, textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {movimentacoes.map((m, i) => (
                    <tr key={m.id} style={{ borderBottom: "1px solid #f5f5f4", background: i % 2 === 0 ? "#fff" : "#fafaf9" }}>
                      <td style={{ padding: "11px 14px", fontSize: 12 }}>{m.data}</td>
                      <td style={{ padding: "11px 14px", fontSize: 12, color: C.txtSub, fontFamily: "monospace" }}>{m.hora}</td>
                      <td style={{ padding: "11px 14px", fontSize: 13, fontWeight: 600 }}>{m.produto}</td>
                      <td style={{ padding: "11px 14px" }}>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 5, background: m.tipo === "entrada" ? C.verdeLt : C.vermelhoLt, color: m.tipo === "entrada" ? C.verde : C.vermelho }}>{m.tipo}</span>
                      </td>
                      <td style={{ padding: "11px 14px", fontSize: 12, fontWeight: 600 }}>
                        {m.tipo === "entrada" ? "+" : "-"}{fmtNum(m.quantidade)} {m.unidade}
                      </td>
                      <td style={{ padding: "11px 14px", fontSize: 12, color: C.txtSub }}>{m.motivo ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {movimentacoes.length === 0 && (
              <div style={{ padding: "40px", textAlign: "center", color: C.txtSub, fontSize: 13 }}>Nenhuma movimentação registrada.</div>
            )}
            <div style={{ padding: "10px 16px", borderTop: "1px solid #f5f5f4", fontSize: 11, color: "#a8a29e", background: "#fafaf9" }}>
              {movimentacoes.length} movimentação{movimentacoes.length !== 1 ? "ões" : ""}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
