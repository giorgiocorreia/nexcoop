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

export default function FiscalHubClient({ orgId }: { orgId: string }) {
  const [aba, setAba] = useState<Aba>("saidas")

  return (
    <PageLayout
      titulo="Documentos Fiscais"
      subtitulo="NF-e e devoluções"
      icone="ti-file-invoice"
      breadcrumb={[{ label: "Fiscal" }]}
      fullHeight
    >
      <Tabs tabs={ABAS} ativa={aba} onChange={(id) => setAba(id as Aba)} />

      {aba === "saidas"     && <FiscalNfeClient embedded />}
      {aba === "entradas"   && <FiscalEntradasClient orgId={orgId} />}
      {aba === "devolucoes" && <FiscalDevolucoesClient orgId={orgId} />}
    </PageLayout>
  )
}