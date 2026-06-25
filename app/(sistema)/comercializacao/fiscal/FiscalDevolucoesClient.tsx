"use client"

import { useEffect, useState } from "react"
import { listarDevolucoesAction } from "@/lib/comercializacao/devolucao"
import { fmt } from "@/lib/fmt"

const C = { cor: "#92400e", corLt: "#FDF8F4", borda: "#E5E3DC", sub: "#78716C" }

export default function FiscalDevolucoesClient({ orgId }: { orgId: string }) {
  const [dados, setDados]     = useState<Awaited<ReturnType<typeof listarDevolucoesAction>>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listarDevolucoesAction(orgId).then(d => { setDados(d); setLoading(false) })
  }, [orgId])

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: C.sub }}>Carregando...</div>
  if (!dados.length) return (
    <div style={{ padding: 40, textAlign: "center", color: C.sub }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
      Nenhuma devolução registrada
    </div>
  )

  return (
    <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${C.borda}`, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: C.corLt }}>
            {["Data", "Lote", "Comprador", "Kg devolvido", "Valor devolvido", "Chave NF-e", "Status"].map(h => (
              <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: C.cor }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dados.map((d: any, i: number) => {
            const venda = d.vendas_externas as any
            return (
              <tr key={d.id} style={{ borderTop: i > 0 ? `1px solid ${C.borda}` : "none" }}>
                <td style={{ padding: "10px 14px", color: C.sub }}>{fmt.data(d.created_at)}</td>
                <td style={{ padding: "10px 14px", fontWeight: 600 }}>{venda?.lotes?.codigo ?? "—"}</td>
                <td style={{ padding: "10px 14px" }}>{venda?.compradores?.nome_razao_social ?? "—"}</td>
                <td style={{ padding: "10px 14px" }}>{fmt.peso(d.quantidade_kg)}</td>
                <td style={{ padding: "10px 14px", fontWeight: 600, color: "#DC2626" }}>{fmt.moeda(d.valor_total)}</td>
                <td style={{ padding: "10px 14px", fontFamily: "monospace", fontSize: 11, color: C.sub }}>
                  {d.chave_nfe_devolucao ? d.chave_nfe_devolucao.substring(0, 20) + "..." : "—"}
                </td>
                <td style={{ padding: "10px 14px" }}>
                  <span style={{
                    padding: "3px 9px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                    background: d.status === "processada" ? "#F0FDF4" : "#FEF9C3",
                    color: d.status === "processada" ? "#16A34A" : "#92400E",
                  }}>
                    {d.status === "processada" ? "Processada" : "Pendente"}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
