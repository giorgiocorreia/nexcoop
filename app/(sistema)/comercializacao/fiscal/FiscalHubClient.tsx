"use client"

import { useState } from "react"
import FiscalNfeClient from "./FiscalNfeClient"
import FiscalEntradasClient from "./FiscalEntradasClient"
import FiscalDevolucoesClient from "./FiscalDevolucoesClient"
import { PageLayout } from "@/components/comercializacao/ui/PageLayout"
import { Tabs } from "@/components/comercializacao/ui/Tabs"

type Aba = "saidas" | "entradas" | "devolucoes"

const ABAS = [
  { id: "saidas" as const,     label: "NF-e Saídas",   icon: "ti-arrow-up-right"  },
  { id: "entradas" as const,   label: "NF-e Entradas",  icon: "ti-arrow-down-left" },
  { id: "devolucoes" as const, label: "Devoluções",      icon: "ti-refresh-alert"  },
]

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

  return (
    <PageLayout
      titulo={titulo}
      subtitulo={subtitulo}
      icone="ti-file-invoice"
      modulo={modulo}
      breadcrumb={[{ label: breadcrumbLabel }]}
      fullHeight
    >
      <Tabs tabs={ABAS} ativa={aba} onChange={(id) => setAba(id as Aba)} />

      {aba === "saidas"     && <FiscalNfeClient embedded />}
      {aba === "entradas"   && <FiscalEntradasClient orgId={orgId} />}
      {aba === "devolucoes" && <FiscalDevolucoesClient orgId={orgId} />}
    </PageLayout>
  )
}