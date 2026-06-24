"use client";
import { useState } from "react";
import Link from "next/link";
import { Btn } from "@/components/ui/Btn";
import { atualizarPrecoProduto, atualizarMinimoProduto, toggleAtivoProduto, atualizarNcmProduto } from "@/lib/loja/produtos-actions";

interface Produto {
  id: string;
  nome: string;
  unidade: string;
  preco: number;
  estoque: number;
  minimo: number;
  ativo: boolean;
  ncm: string | null;
}

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function StatusBadge({ ativo }: { ativo: boolean }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 99,
      background: ativo ? "#f0fdf4" : "#f5f5f4",
      color: ativo ? "#15803d" : "#78716c",
      border: `1px solid ${ativo ? "#bbf7d0" : "#e5e3dc"}`,
      whiteSpace: "nowrap",
    }}>
      {ativo ? "Ativo" : "Inativo"}
    </span>
  );
}

function InlineNcm({ ncm, onSave }: { ncm: string | null; onSave: (v: string | null) => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(ncm ?? "");

  if (!editing) {
    return (
      <span onClick={() => setEditing(true)} title="Clique para editar NCM" style={{
        cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "monospace",
        color: ncm ? "#374151" : "#a8a29e",
        borderBottom: "1px dashed #d1d5db", paddingBottom: 1,
      }}>
        {ncm ?? "—"}
      </span>
    );
  }

  const salvar = () => {
    const limpo = val.replace(/\D/g, "").slice(0, 8);
    onSave(limpo || null);
    setEditing(false);
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <input
        autoFocus value={val}
        onChange={e => setVal(e.target.value.replace(/\D/g, "").slice(0, 8))}
        onKeyDown={e => { if (e.key === "Enter") salvar(); if (e.key === "Escape") setEditing(false); }}
        placeholder="00000000"
        maxLength={8}
        inputMode="numeric"
        style={{
          width: 80, fontSize: 12, fontWeight: 600, fontFamily: "monospace",
          padding: "3px 6px", borderRadius: 6,
          border: "1px solid #378ADD", outline: "none",
        }}
      />
      <button onClick={salvar} style={{
        fontSize: 11, padding: "3px 8px", borderRadius: 5,
        background: "#378ADD", color: "#fff", border: "none", cursor: "pointer",
      }}>✓</button>
      <button onClick={() => setEditing(false)} style={{
        fontSize: 11, padding: "3px 8px", borderRadius: 5,
        background: "transparent", color: "#78716c",
        border: "1px solid #e5e3dc", cursor: "pointer",
      }}>✕</button>
    </div>
  );
}

function NcmBadge({ ncm }: { ncm: string | null }) {
  const ok = !!ncm;
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 99,
      background: ok ? "#f0fdf4" : "#f5f5f4",
      color: ok ? "#15803d" : "#a8a29e",
      border: `1px solid ${ok ? "#bbf7d0" : "#e5e3dc"}`,
      whiteSpace: "nowrap", marginLeft: 6,
    }}>
      {ok ? "NCM ok" : "Sem NCM"}
    </span>
  );
}

function EstoqueBadge({ atual, minimo, unidade }: { atual: number; minimo: number; unidade: string }) {
  const zerado = atual === 0;
  const critico = !zerado && atual <= minimo;
  const color  = zerado ? "#DC2626" : critico ? "#D97706" : "#15803d";
  const bg     = zerado ? "#fef2f2" : critico ? "#fffbeb" : "#f0fdf4";
  const border = zerado ? "#fecaca" : critico ? "#fde68a" : "#bbf7d0";
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99,
      background: bg, color, border: `1px solid ${border}`, whiteSpace: "nowrap",
    }}>
      {atual} {unidade}{zerado ? " — zerado" : critico ? " ⚠" : ""}
    </span>
  );
}

function InlineEdit({ value, tipo, onSave }: {
  value: number;
  tipo: "preco" | "minimo";
  onSave: (v: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(tipo === "preco" ? value.toFixed(2) : String(value));

  if (!editing) {
    return (
      <span onClick={() => setEditing(true)} title="Clique para editar" style={{
        cursor: "pointer", fontSize: 13, fontWeight: 600,
        borderBottom: "1px dashed #d1d5db", paddingBottom: 1,
      }}>
        {tipo === "preco" ? fmt(value) : value}
      </span>
    );
  }

  const salvar = () => {
    const parsed = tipo === "preco" ? parseFloat(val) : parseInt(val);
    if (!isNaN(parsed)) onSave(parsed);
    setEditing(false);
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <input
        autoFocus value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter") salvar();
          if (e.key === "Escape") setEditing(false);
        }}
        style={{
          width: tipo === "preco" ? 80 : 50, fontSize: 13, fontWeight: 600,
          padding: "3px 6px", borderRadius: 6,
          border: "1px solid #378ADD", outline: "none",
        }}
      />
      <button onClick={salvar} style={{
        fontSize: 11, padding: "3px 8px", borderRadius: 5,
        background: "#378ADD", color: "#fff", border: "none", cursor: "pointer",
      }}>✓</button>
      <button onClick={() => setEditing(false)} style={{
        fontSize: 11, padding: "3px 8px", borderRadius: 5,
        background: "transparent", color: "#78716c",
        border: "1px solid #e5e3dc", cursor: "pointer",
      }}>✕</button>
    </div>
  );
}

const C = { laranja: "#E07B30", laranjaLt: "#FFF7ED", borda: "#E5E3DC", bg: "#F8F7F4", txt: "#1C1917", txtSub: "#78716C" };

export default function ProdutosClient({ produtos: inicial, podeGerenciar = false }: { produtos: Produto[]; podeGerenciar?: boolean }) {
  const [produtos, setProdutos] = useState(inicial);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<"todos" | "criticos" | "inativos">("todos");

  const criticos = produtos.filter(p => p.ativo && p.estoque <= p.minimo).length;

  const filtrados = produtos.filter(p => {
    const matchBusca  = p.nome.toLowerCase().includes(busca.toLowerCase());
    const matchFiltro =
      filtro === "todos"    ? true :
      filtro === "criticos" ? p.estoque <= p.minimo && p.ativo :
      !p.ativo;
    return matchBusca && matchFiltro;
  });

  const atualizarPreco = async (id: string, preco: number) => {
    setProdutos(prev => prev.map(p => p.id === id ? { ...p, preco } : p));
    await atualizarPrecoProduto(id, preco);
  };

  const atualizarMinimo = async (id: string, minimo: number) => {
    setProdutos(prev => prev.map(p => p.id === id ? { ...p, minimo } : p));
    await atualizarMinimoProduto(id, minimo);
  };

  const toggleAtivo = async (id: string, ativo: boolean) => {
    setProdutos(prev => prev.map(p => p.id === id ? { ...p, ativo: !p.ativo } : p));
    await toggleAtivoProduto(id, !ativo);
  };

  const atualizarNcm = async (id: string, ncm: string | null) => {
    setProdutos(prev => prev.map(p => p.id === id ? { ...p, ncm } : p));
    await atualizarNcmProduto(id, ncm);
  };

  const filtrosBtns = [
    { key: "todos",    label: `Todos (${produtos.length})` },
    { key: "criticos", label: `⚠ Críticos (${criticos})` },
    { key: "inativos", label: `Inativos (${produtos.filter(p => !p.ativo).length})` },
  ] as const;

  return (
    <>
      <style>{`
        .prod-header  { padding: 0 32px; min-height: 88px; display: flex; align-items: center; }
        .prod-content { padding: 28px 32px; }
        .prod-toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; flex-wrap: wrap; gap: 10px; }
        .prod-filtros { display: flex; gap: 6px; flex-wrap: wrap; }
        @media (max-width: 640px) {
          .prod-header  { padding: 0 16px 0 56px; min-height: 60px; }
          .prod-content { padding: 16px; }
          .prod-toolbar { flex-direction: column; align-items: stretch; }
          .prod-filtros { overflow-x: auto; flex-wrap: nowrap; }
        }
      `}</style>

      {/* Header sticky */}
      <header className="prod-header" style={{
        position: "sticky", top: 0, zIndex: 10,
        background: "#fff", borderBottom: `1px solid ${C.borda}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 12, margin: "0 -2rem 0 -2rem",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10, flexShrink: 0,
            background: C.laranjaLt, display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <i className="ti ti-package" style={{ fontSize: 20, color: C.laranja }} />
          </div>
          <div>
            <h1 style={{ fontSize: 19, fontWeight: 800, color: C.txt, margin: 0, lineHeight: 1.2 }}>
              Produtos
            </h1>
            <div style={{ fontSize: 12, color: C.txtSub, marginTop: 2 }}>
              <Link href="/loja" style={{ color: C.txtSub, textDecoration: "none" }}>Loja Agropecuária</Link>
              {" / "}Produtos
            </div>
          </div>
        </div>
        {podeGerenciar && (
          <Link href="/loja/produtos/novo" style={{
            padding: "9px 18px", background: C.laranja, color: "#fff",
            borderRadius: 8, fontSize: 13, fontWeight: 600,
            textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6,
            whiteSpace: "nowrap", flexShrink: 0,
          }}>
            <i className="ti ti-plus" style={{ fontSize: 15 }} />
            Novo produto
          </Link>
        )}
      </header>

      {/* Conteúdo */}
      <div className="prod-content" style={{ background: C.bg, margin: "0 -2rem -2rem -2rem", minHeight: "calc(100vh - 88px)" }}>

        {/* Toolbar: filtros + busca */}
        <div className="prod-toolbar">
          <div className="prod-filtros">
            {filtrosBtns.map(f => (
              <button
                key={f.key}
                onClick={() => setFiltro(f.key)}
                style={{
                  padding: "7px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                  cursor: "pointer", whiteSpace: "nowrap",
                  background: filtro === f.key ? C.laranja : "#fff",
                  color: filtro === f.key ? "#fff" : C.txtSub,
                  border: `1px solid ${filtro === f.key ? C.laranja : C.borda}`,
                  transition: "all 0.12s",
                }}
              >{f.label}</button>
            ))}
          </div>
          <input
            placeholder="Buscar produto..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            style={{
              padding: "8px 12px", borderRadius: 8,
              border: `1px solid ${C.borda}`, fontSize: 13,
              outline: "none", width: 220, background: "#fff",
            }}
          />
        </div>

        {/* Tabela */}
        <div style={{ background: "#fff", border: `1px solid ${C.borda}`, borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
              <thead>
                <tr style={{ background: "#fafaf9", borderBottom: `1px solid ${C.borda}` }}>
                  {["Produto", "NCM", "Unidade", "Preço de venda", "Estoque atual", "Mínimo", "Status", ""].map(h => (
                    <th key={h} style={{
                      padding: "11px 16px", fontSize: 11, fontWeight: 700,
                      textTransform: "uppercase", letterSpacing: "0.05em",
                      color: C.txtSub, textAlign: "left", whiteSpace: "nowrap",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.map((p, i) => (
                  <tr key={p.id} style={{
                    borderBottom: "1px solid #f5f5f4",
                    background: i % 2 === 0 ? "#fff" : "#fafaf9",
                    opacity: p.ativo ? 1 : 0.6,
                  }}>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{p.nome}</span>
                        <NcmBadge ncm={p.ncm} />
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <InlineNcm ncm={p.ncm} onSave={v => atualizarNcm(p.id, v)} />
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{
                        fontSize: 11, fontWeight: 600, color: C.txtSub,
                        background: "#f5f5f4", padding: "2px 8px", borderRadius: 5,
                      }}>{p.unidade}</span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <InlineEdit value={p.preco} tipo="preco" onSave={v => atualizarPreco(p.id, v)} />
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <EstoqueBadge atual={p.estoque} minimo={p.minimo} unidade={p.unidade} />
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <InlineEdit value={p.minimo} tipo="minimo" onSave={v => atualizarMinimo(p.id, v)} />
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <StatusBadge ativo={p.ativo} />
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <Btn
                          tamanho="sm"
                          variante="cinza"
                          icone="ti-pencil"
                          onClick={() => window.location.href = `/loja/produtos/${p.id}`}
                        >
                          Editar
                        </Btn>
                        <Btn
                          tamanho="sm"
                          variante="cinza"
                          icone={p.ativo ? "ti-ban" : "ti-check"}
                          onClick={() => toggleAtivo(p.id, p.ativo)}
                        >
                          {p.ativo ? "Inativar" : "Ativar"}
                        </Btn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtrados.length === 0 && (
            <div style={{ padding: "40px", textAlign: "center", color: C.txtSub, fontSize: 13 }}>
              Nenhum produto encontrado.
            </div>
          )}

          <div style={{
            padding: "10px 16px", borderTop: "1px solid #f5f5f4",
            fontSize: 11, color: "#a8a29e", background: "#fafaf9",
          }}>
            {filtrados.length} produto{filtrados.length !== 1 ? "s" : ""} exibido{filtrados.length !== 1 ? "s" : ""}
            {busca && ` · busca: "${busca}"`}
          </div>
        </div>
      </div>
    </>
  );
}
