"use client"

import { useEffect, useState } from "react"
import { listarDevolucoesAction } from "@/lib/comercializacao/devolucao"
import { fmt } from "@/lib/fmt"
import { HubStyles } from "@/components/comercializacao/ui/HubStyles"
import { ContentCard } from "@/components/comercializacao/ui/ContentCard"
import { Badge } from "@/components/comercializacao/ui/Badge"
import { EmptyState } from "@/components/comercializacao/ui/EmptyState"
import { COM_C } from "@/components/comercializacao/ui/tokens"

export default function FiscalDevolucoesClient({ orgId }: { orgId: string }) {
  const [dados, setDados]     = useState<Awaited<ReturnType<typeof listarDevolucoesAction>>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listarDevolucoesAction(orgId).then(d => { setDados(d); setLoading(false) })
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
        <EmptyState emoji="📋" titulo="Nenhuma devolução registrada" />
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
                {["Data", "Lote", "Comprador", "Kg devolvido", "Valor devolvido", "Chave NF-e", "Status"].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dados.map((d: any) => {
                const venda = d.vendas_externas as any
                const processada = d.status === "processada"
                return (
                  <tr key={d.id}>
                    <td style={{ color: COM_C.txtSub }}>{fmt.data(d.created_at)}</td>
                    <td style={{ fontWeight: 600 }}>{venda?.lotes?.codigo ?? "—"}</td>
                    <td>{venda?.compradores?.nome_razao_social ?? "—"}</td>
                    <td>{fmt.peso(d.quantidade_kg)}</td>
                    <td style={{ fontWeight: 600, color: COM_C.vermelho }}>{fmt.moeda(d.valor_total)}</td>
                    <td style={{ fontFamily: "monospace", fontSize: 11, color: COM_C.txtSub }}>
                      {d.chave_nfe_devolucao ? d.chave_nfe_devolucao.substring(0, 20) + "..." : "—"}
                    </td>
                    <td>
                      <Badge
                        label={processada ? "Processada" : "Pendente"}
                        bg={processada ? COM_C.verdeLt : COM_C.marromLt}
                        cor={processada ? COM_C.verde : COM_C.marrom}
                        dot
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </ContentCard>
    </>
  )
}