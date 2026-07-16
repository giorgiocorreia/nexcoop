"use client"

import { useCallback, useEffect, useState } from "react"
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
  const [dados, setDados]           = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [consultando, setConsultando] = useState<string | null>(null)
  const [erro, setErro]             = useState<string | null>(null)

  const carregar = useCallback(() => {
    return listarEntradasComercializacao(orgId).then((d: any[]) => { setDados(d); setLoading(false) })
  }, [orgId])

  useEffect(() => { carregar() }, [carregar])

  async function handleConsultar(notaId: string) {
    setConsultando(notaId)
    setErro(null)
    try {
      const res = await fetch("/api/nfe/sincronizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nota_id: notaId }),
      })
      const json = await res.json()
      if (json.sucesso) {
        await carregar()
      } else {
        setErro(json.status === "processando_autorizacao"
          ? "Ainda em processamento na SEFAZ. Tente novamente em instantes."
          : (json.erro ?? "Não foi possível consultar o status da nota."))
      }
    } catch {
      setErro("Não foi possível consultar o status da nota.")
    } finally {
      setConsultando(null)
    }
  }

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
      {erro && (
        <div style={{ marginBottom: 12, padding: "10px 14px", borderRadius: 8, background: COM_C.laranjaLt, color: COM_C.laranjaTxt, fontSize: 13 }}>
          {erro}
        </div>
      )}
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
                    {n.status === "processando" ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <Badge label="Processando" bg={COM_C.laranjaLt} cor={COM_C.laranjaTxt} dot />
                        <button
                          onClick={() => handleConsultar(n.id)}
                          disabled={consultando === n.id}
                          style={{
                            fontSize: 12, fontWeight: 600, color: "#185FA5",
                            background: "none", border: `1px solid ${COM_C.borda}`,
                            borderRadius: 6, padding: "3px 10px",
                            cursor: consultando === n.id ? "wait" : "pointer",
                          }}
                        >
                          {consultando === n.id ? "Consultando..." : "Consultar"}
                        </button>
                      </span>
                    ) : (
                      <Badge label="Autorizada" bg={COM_C.verdeLt} cor={COM_C.verde} dot />
                    )}
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
