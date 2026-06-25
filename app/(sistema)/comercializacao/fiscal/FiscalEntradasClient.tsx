"use client"

import { useEffect, useState } from "react"
import { fmt } from "@/lib/fmt"

const C = { cor: "#185FA5", corLt: "#E6F1FB", borda: "#E5E3DC", sub: "#78716C" }

async function listarEntradasComercializacao(orgId: string) {
  const res = await fetch(`/api/comercializacao/entradas-nfe?org=${orgId}`)
  if (!res.ok) return []
  return res.json()
}

export default function FiscalEntradasClient({ orgId }: { orgId: string }) {
  const [dados, setDados]     = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listarEntradasComercializacao(orgId).then((d: any[]) => { setDados(d); setLoading(false) })
  }, [orgId])

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: C.sub }}>Carregando...</div>
  if (!dados.length) return (
    <div style={{ padding: 40, textAlign: "center", color: C.sub }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>📥</div>
      Nenhuma NF-e de entrada registrada
    </div>
  )

  return (
    <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${C.borda}`, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: C.corLt }}>
            {["Data", "Produtor", "NF-e", "CFOP", "Kg", "Valor", "Status"].map(h => (
              <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: C.cor }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dados.map((n: any, i: number) => (
            <tr key={n.id} style={{ borderTop: i > 0 ? `1px solid ${C.borda}` : "none" }}>
              <td style={{ padding: "10px 14px", color: C.sub }}>{fmt.data(n.created_at)}</td>
              <td style={{ padding: "10px 14px", fontWeight: 600 }}>{n.produtores?.nome ?? "—"}</td>
              <td style={{ padding: "10px 14px", fontFamily: "monospace", fontSize: 11 }}>{n.numero_nfe ? `${n.serie ?? "2"}-${n.numero_nfe}` : "—"}</td>
              <td style={{ padding: "10px 14px", color: C.sub }}>{n.cfop ?? "—"}</td>
              <td style={{ padding: "10px 14px" }}>{n.quantidade_kg ? fmt.peso(n.quantidade_kg) : "—"}</td>
              <td style={{ padding: "10px 14px", fontWeight: 600 }}>{n.valor_total ? fmt.moeda(n.valor_total) : "—"}</td>
              <td style={{ padding: "10px 14px" }}>
                <span style={{ padding: "3px 9px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: "#F0FDF4", color: "#16A34A" }}>Autorizada</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
