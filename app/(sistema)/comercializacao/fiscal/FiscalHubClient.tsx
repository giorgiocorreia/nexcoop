"use client"

/**
 * Hub operacional de Documentos Fiscais — Comercialização.
 * Independente de app/(sistema)/contabil/nfe/* (Cancelar, CC-e, Docs de lote).
 */

import { useEffect, useState } from "react"
import FiscalNfeClient from "./FiscalNfeClient"
import FiscalEntradasClient from "./FiscalEntradasClient"
import FiscalDevolucoesClient from "./FiscalDevolucoesClient"
import { PageLayout } from "@/components/comercializacao/ui/PageLayout"
import { Tabs } from "@/components/comercializacao/ui/Tabs"
import { listarNfeSaida } from "./actions"
import { listarDevolucoesAction } from "@/lib/comercializacao/devolucao"

type Aba = "saidas" | "entradas" | "devolucoes"

export default function FiscalHubClient({ orgId }: { orgId: string }) {
  const [aba, setAba] = useState<Aba>("saidas")
  const [badges, setBadges] = useState({ saidas: 0, entradas: 0, devolucoes: 0 })

  useEffect(() => {
    let cancelado = false
    ;(async () => {
      try {
        const [saidas, entradasRes, devolucoes] = await Promise.all([
          listarNfeSaida(),
          fetch(`/api/comercializacao/entradas-nfe?org=${orgId}`).then(r =>
            r.ok ? r.json() : [],
          ),
          listarDevolucoesAction(orgId),
        ])
        if (cancelado) return
        setBadges({
          saidas: Array.isArray(saidas) ? saidas.length : 0,
          entradas: Array.isArray(entradasRes) ? entradasRes.length : 0,
          devolucoes: Array.isArray(devolucoes) ? devolucoes.length : 0,
        })
      } catch {
        /* badges são só indicativos */
      }
    })()
    return () => {
      cancelado = true
    }
  }, [orgId])

  const abas = [
    { id: "saidas" as const,     label: "NF-e Saídas",   icon: "ti-arrow-up-right",  badge: badges.saidas },
    { id: "entradas" as const,   label: "NF-e Entradas", icon: "ti-arrow-down-left", badge: badges.entradas },
    { id: "devolucoes" as const, label: "Devoluções",    icon: "ti-refresh-alert",   badge: badges.devolucoes },
  ]

  return (
    <PageLayout
      titulo="Documentos Fiscais"
      subtitulo="NF-e e devoluções — operação (emissão, cancelamento, CC-e)"
      icone="ti-file-invoice"
      breadcrumb={[{ label: "Fiscal" }]}
      fullHeight
    >
      <Tabs tabs={abas} ativa={aba} onChange={(id) => setAba(id as Aba)} />

      {aba === "saidas"     && <FiscalNfeClient embedded />}
      {aba === "entradas"   && <FiscalEntradasClient orgId={orgId} />}
      {aba === "devolucoes" && <FiscalDevolucoesClient orgId={orgId} />}
    </PageLayout>
  )
}
