"use client";

import { useState } from "react";
import { PageLayout, MODULO_LOJA, COM_C } from '@/components/nexcoop/ui'
import Link from "next/link";

interface NotaVenda {
  id: string;
  tipo: string;
  status: string;
  chave_acesso: string | null;
}

interface Venda {
  id: string; num: string; data: string; hora: string;
  operador: string; forma: string;
  pago_especie: number; pago_pix: number; pago_cartao: number; pago_saldo: number;
  total: number;
  nota: NotaVenda | null;
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

function NotaBadge({ nota }: { nota: NotaVenda | null }) {
  if (!nota) {
    return (
      <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 5, background: "#f5f5f4", color: "#a8a29e", whiteSpace: "nowrap" }}>
        Sem nota
      </span>
    )
  }
  const config: Record<string, { bg: string; color: string; label: string }> = {
    autorizada:  { bg: "#f0fdf4", color: "#15803d", label: nota.tipo === "nfce" ? "NFC-e" : "NF-e" },
    processando: { bg: "#fef9c3", color: "#854d0e", label: "Emitindo..." },
    rejeitada:   { bg: "#fef2f2", color: "#dc2626", label: "Rejeitada" },
    cancelada:   { bg: "#f5f5f4", color: "#78716c", label: "Cancelada" },
    erro:        { bg: "#fef2f2", color: "#dc2626", label: "Erro" },
  }
  const c = config[nota.status] ?? { bg: "#f5f5f4", color: "#78716c", label: nota.status }
  return (
    <span title={nota.chave_acesso ? `Chave: ${nota.chave_acesso}` : undefined}
      style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 5, background: c.bg, color: c.color, whiteSpace: "nowrap", cursor: nota.chave_acesso ? "help" : "default" }}>
      {c.label}
    </span>
  )
}

function exportCSV(vendas: Venda[]) {
  const header = "Nº,Data,Hora,Operador,Forma,Nota,Dinheiro,PIX,Cartão,Crédito Coop.,Total";
  const rows = vendas.map(v =>
    `${v.num},${v.data},${v.hora},"${v.operador}",${fmtForma(v.forma)},${v.nota ? v.nota.status : "sem nota"},${v.pago_especie},${v.pago_pix},${v.pago_cartao},${v.pago_saldo},${v.total}`
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

  const filtradas = vendas.filter(v => {
    if (filtroForma && v.forma !== filtroForma) return false;
    if (filtroOp    && v.operador !== filtroOp) return false;
    if (filtroInicio && v.data < filtroInicio.split("-").reverse().join("/")) return false;
    if (filtroFim   && v.data > filtroFim.split("-").reverse().join("/")) return false;
    return true;
  });

  const totalGeral   = filtradas.reduce((a, v) => a + v.total, 0);
  const totalEspecie = filtradas.reduce((a, v) => a + v.pago_especie, 0);
  const totalPix     = filtradas.reduce((a, v) => a + v.pago_pix, 0);
  const totalCartao  = filtradas.reduce((a, v) => a + v.pago_cartao, 0);
  const totalSaldo   = filtradas.reduce((a, v) => a + v.pago_saldo, 0);

  const inp: React.CSSProperties = {
    fontSize: 12, padding: '6px 10px', border: `1px solid ${COM_C.borda}`, borderRadius: 8, outline: 'none', background: '#fff',
  }

  return (
    <PageLayout
      titulo="Relatório de Vendas"
      icone="ti-chart-bar"
      modulo={MODULO_LOJA}
      breadcrumb={[{ label: 'Relatórios' }]}
      acoes={
        <>
          <a
            href={(() => {
              const params = new URLSearchParams()
              if (filtroInicio) params.set('dataInicio', filtroInicio)
              if (filtroFim) params.set('dataFim', filtroFim)
              const qs = params.toString()
              return `/api/loja/relatorio/vendas/pdf${qs ? `?${qs}` : ''}`
            })()}
            target="_blank"
            rel="noopener noreferrer"
            style={{ padding: '8px 14px', background: COM_C.azul, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0, textDecoration: 'none' }}
          >
            <i className="ti ti-file-type-pdf" style={{ fontSize: 15 }} />
            Exportar PDF
          </a>
          <button onClick={() => exportCSV(filtradas)} style={{ padding: '8px 14px', background: '#fff', color: COM_C.txt, border: `1px solid ${COM_C.borda}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <i className="ti ti-download" style={{ fontSize: 15 }} />
            Exportar CSV
          </button>
        </>
      }
    >
{/* Filtros */}
        <div style={{ background: '#fff', border: `1px solid ${COM_C.borda}`, borderRadius: 12, padding: '14px 20px', marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: COM_C.txtSub }}>De</span>
            <input type="date" value={filtroInicio} onChange={e => setFiltroInicio(e.target.value)} style={inp} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: COM_C.txtSub }}>Até</span>
            <input type="date" value={filtroFim} onChange={e => setFiltroFim(e.target.value)} style={inp} />
          </div>
          <select value={filtroForma} onChange={e => setFiltroForma(e.target.value)} style={inp}>
            <option value="">Todas as formas</option>
            <option value="especie">Dinheiro</option>
            <option value="pix">PIX</option>
            <option value="cartao">Cartão</option>
            <option value="credito_cooperado">Crédito Coop.</option>
          </select>
          {operadores.length > 0 && (
            <select value={filtroOp} onChange={e => setFiltroOp(e.target.value)} style={inp}>
              <option value="">Todos os operadores</option>
              {operadores.map(o => <option key={o.id} value={o.nome}>{o.nome}</option>)}
            </select>
          )}
          <button onClick={() => { setFiltroInicio(""); setFiltroFim(""); setFiltroForma(""); setFiltroOp(""); }} style={{ fontSize: 12, padding: '6px 12px', borderRadius: 8, border: `1px solid ${COM_C.borda}`, background: 'transparent', color: COM_C.txtSub, cursor: 'pointer' }}>
            Limpar
          </button>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: COM_C.txtSub, whiteSpace: 'nowrap' }}>
            {filtradas.length} venda{filtradas.length !== 1 ? 's' : ''} · {fmt(totalGeral)}
          </span>
        </div>

        {/* Totalizadores por forma */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {[
            { label: 'Dinheiro', value: fmt(totalEspecie) },
            { label: 'PIX', value: fmt(totalPix) },
            { label: 'Cartão', value: fmt(totalCartao) },
            { label: 'Crédito Coop.', value: fmt(totalSaldo) },
          ].map(c => (
            <div key={c.label} style={{ background: '#fff', border: `1px solid ${COM_C.borda}`, borderRadius: 8, padding: '8px 14px', display: 'flex', gap: 8, alignItems: 'baseline' }}>
              <span style={{ fontSize: 11, color: COM_C.txtSub }}>{c.label}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: COM_C.txt }}>{c.value}</span>
            </div>
          ))}
        </div>

        {/* Tabela */}
        <div style={{ background: '#fff', border: `1px solid ${COM_C.borda}`, borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
              <thead>
                <tr style={{ background: '#fafaf9', borderBottom: `1px solid ${COM_C.borda}` }}>
                  {["Data", "Hora", "Nº", "Operador", "Forma", "Nota", "Total"].map(h => (
                    <th key={h} style={{ padding: "11px 14px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: COM_C.txtSub, textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtradas.map((v, i) => (
                  <tr key={v.id} style={{ borderBottom: "1px solid #f5f5f4", background: i % 2 === 0 ? "#fff" : "#fafaf9" }}>
                    <td style={{ padding: "11px 14px", fontSize: 12 }}>{v.data}</td>
                    <td style={{ padding: "11px 14px", fontSize: 12, color: COM_C.txtSub, fontFamily: "monospace" }}>{v.hora}</td>
                    <td style={{ padding: "11px 14px", fontSize: 12, fontWeight: 600, color: COM_C.laranja }}>{v.num}</td>
                    <td style={{ padding: "11px 14px", fontSize: 12 }}>{v.operador}</td>
                    <td style={{ padding: "11px 14px", fontSize: 11 }}>
                      <span style={{ background: v.forma === "credito_cooperado" ? "#e0f2fe" : "#f5f5f4", color: v.forma === "credito_cooperado" ? "#0369a1" : COM_C.txtSub, padding: "2px 7px", borderRadius: 5, fontWeight: 600, whiteSpace: "nowrap" }}>{fmtForma(v.forma)}</span>
                    </td>
                    <td style={{ padding: "11px 14px" }}><NotaBadge nota={v.nota} /></td>
                    <td style={{ padding: "11px 14px", fontSize: 13, fontWeight: 700, textAlign: "right" }}>{fmt(v.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtradas.length === 0 && (
            <div style={{ padding: "40px", textAlign: "center", color: COM_C.txtSub, fontSize: 13 }}>Nenhuma venda encontrada.</div>
          )}
          <div style={{ padding: "10px 16px", borderTop: "1px solid #f5f5f4", fontSize: 11, color: "#a8a29e", background: "#fafaf9", display: "flex", justifyContent: "space-between" }}>
            <span>{filtradas.length} venda{filtradas.length !== 1 ? "s" : ""}</span>
            <span>Total: {fmt(totalGeral)}</span>
          </div>
        </div>
    </PageLayout>
  );
}
