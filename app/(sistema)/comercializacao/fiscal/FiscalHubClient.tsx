"use client"

import { useState } from "react"
import FiscalNfeClient from "./FiscalNfeClient"
import FiscalEntradasClient from "./FiscalEntradasClient"
import FiscalDevolucoesClient from "./FiscalDevolucoesClient"

const C = { cor: "#92400e", corLt: "#FDF8F4", borda: "#E5E3DC", bg: "#F8F7F4", txt: "#1C1917", sub: "#78716C" }
type Aba = "saidas" | "entradas" | "devolucoes"

export default function FiscalHubClient({ orgId }: { orgId: string }) {
  const [aba, setAba] = useState<Aba>("saidas")

  const abas: { id: Aba; label: string; icon: string }[] = [
    { id: "saidas",     label: "NF-e Saídas",   icon: "ti-arrow-up-right"  },
    { id: "entradas",   label: "NF-e Entradas",  icon: "ti-arrow-down-left" },
    { id: "devolucoes", label: "Devoluções",      icon: "ti-refresh-alert"  },
  ]

  return (
    <div>
      <style>{`
        .page-header { padding: 0 32px; min-height: 88px; display: flex; align-items: center; }
        .hub-content  { padding: 28px 32px; margin: 0 -2rem -2rem -2rem; background: #F8F7F4; }
        @media (max-width: 640px) {
          .page-header { padding: 0 16px 0 56px; min-height: 60px; }
          .hub-content  { padding: 16px; }
        }
      `}</style>

      <div style={{ position: "sticky", top: 0, zIndex: 10, background: "#fff", borderBottom: `1px solid ${C.borda}`, margin: "0 -2rem 0 -2rem" }}>
        <div className="page-header" style={{ justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: C.corLt, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <i className="ti ti-file-invoice" style={{ fontSize: 20, color: C.cor }} />
            </div>
            <div>
              <h1 style={{ fontSize: 19, fontWeight: 800, color: C.txt, margin: 0 }}>Documentos Fiscais</h1>
              <div style={{ fontSize: 12, color: C.sub }}>Comercialização · NF-e e devoluções</div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 2, padding: "0 32px", borderTop: `1px solid ${C.borda}` }}>
          {abas.map(a => (
            <button key={a.id} onClick={() => setAba(a.id)} style={{
              padding: "10px 18px", fontSize: 13, fontWeight: 600,
              border: "none", background: "none", cursor: "pointer",
              color: aba === a.id ? C.cor : C.sub,
              borderBottom: aba === a.id ? `2px solid ${C.cor}` : "2px solid transparent",
              display: "flex", alignItems: "center", gap: 6, transition: "all 0.15s",
            }}>
              <i className={`ti ${a.icon}`} style={{ fontSize: 14 }} />
              {a.label}
            </button>
          ))}
        </div>
      </div>

      <div className="hub-content">
        {aba === "saidas"     && <FiscalNfeClient embedded />}
        {aba === "entradas"   && <FiscalEntradasClient orgId={orgId} />}
        {aba === "devolucoes" && <FiscalDevolucoesClient orgId={orgId} />}
      </div>
    </div>
  )
}
