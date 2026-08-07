"use client"

import { useEffect, useState } from "react"
import FiscalNfeClient from "./FiscalNfeClient"
import FiscalEntradasClient from "./FiscalEntradasClient"
import FiscalDevolucoesClient from "./FiscalDevolucoesClient"
import { PageLayout } from "@/components/comercializacao/ui/PageLayout"
import { Tabs } from "@/components/comercializacao/ui/Tabs"
import { listarNfeSaida } from "./actions"
import { listarDevolucoesAction } from "@/lib/comercializacao/devolucao"

type Aba = "saidas" | "entradas" | "devolucoes"

export default function FiscalHubClient({
  orgId,
  modulo,
  breadcrumbLabel = "Fiscal",
  titulo = "Documentos Fiscais",
  subtitulo = "NF-e emitidas — saídas, entradas e devoluções",
}: {
  orgId: string
  /** Módulo pai no breadcrumb (ex.: Contábil). Padrão: Comercialização */
  modulo?: { label: string; href: string }
  breadcrumbLabel?: string
  titulo?: string
  subtitulo?: string
}) {
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
      titulo={titulo}
      subtitulo={subtitulo}
      icone="ti-file-invoice"
      modulo={modulo}
      breadcrumb={[{ label: breadcrumbLabel }]}
      fullHeight
    >
      <Tabs tabs={abas} ativa={aba} onChange={(id) => setAba(id as Aba)} />

      {aba === "saidas"     && <FiscalNfeClient embedded />}
      {aba === "entradas"   && <FiscalEntradasClient orgId={orgId} />}
      {aba === "devolucoes" && <FiscalDevolucoesClient orgId={orgId} />}
    </PageLayout>
  )
}
