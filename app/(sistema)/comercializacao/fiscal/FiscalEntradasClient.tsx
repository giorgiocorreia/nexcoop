"use client"

import { useEffect, useState } from "react"
import { fmt } from "@/lib/fmt"
import { HubStyles } from "@/components/comercializacao/ui/HubStyles"
import { ContentCard } from "@/components/comercializacao/ui/ContentCard"
import { Badge } from "@/components/comercializacao/ui/Badge"
import { EmptyState } from "@/components/comercializacao/ui/EmptyState"
import { COM_C } from "@/components/comercializacao/ui/tokens"

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

  if (loading) {
    return (
      <>
        <HubStyles />
        <div style={{ padding: 40, textAlign: "center", color: COM_C.txtSub, fontSize: 13 }}>Carregando...</div>
      </>
    )
  }

  if (!dados.length) {
    return (
      <>
        <HubStyles />
        <EmptyState emoji="📥" titulo="Nenhuma NF-e de entrada registrada" />
      </>
    )
  }

  return (
    <>
      <HubStyles />
      <ContentCard noPadding>
        <div style={{ overflowX: "auto" }}>
          <table className="com-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Data", "Produtor", "NF-e", "CFOP", "Kg", "Valor", "Status"].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dados.map((n: any) => (
                <tr key={n.id}>
                  <td style={{ color: COM_C.txtSub }}>{fmt.data(n.created_at)}</td>
                  <td style={{ fontWeight: 600 }}>{n.produtores?.nome ?? "—"}</td>
                  <td style={{ fontFamily: "monospace", fontSize: 11 }}>{n.numero_nfe ? `${n.serie ?? "2"}-${n.numero_nfe}` : "—"}</td>
                  <td style={{ color: COM_C.txtSub }}>{n.cfop ?? "—"}</td>
                  <td>{n.quantidade_kg ? fmt.peso(n.quantidade_kg) : "—"}</td>
                  <td style={{ fontWeight: 600 }}>{n.valor_total ? fmt.moeda(n.valor_total) : "—"}</td>
                  <td>
                    <Badge label="Autorizada" bg={COM_C.verdeLt} cor={COM_C.verde} dot />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ContentCard>
    </>
  )
}