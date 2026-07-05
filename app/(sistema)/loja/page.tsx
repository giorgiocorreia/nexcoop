import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { temModulo } from "@/lib/org"
import { podeVerEstoqueLoja, podeVenderLoja } from "@/lib/permissoes"
import LojaHubClient from "./LojaHubClient"
import {
  getHubKpis,
  getAlertasEstoque,
  getTopProdutos,
  getUltimasVendas,
  getFaturamentoDiario,
} from "@/lib/loja/hub-actions"

export const metadata = { title: "Loja — NexCoop" }
export const dynamic = 'force-dynamic'

export default async function LojaHubPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("organizacao_id, nome_completo, role, funcoes, organizacoes(modulos_ativos)")
    .eq("id", user.id)
    .single()

  if (!usuario) redirect("/login")

  const orgRaw = usuario.organizacoes as any
  const org = Array.isArray(orgRaw) ? orgRaw[0] : orgRaw
  if (!temModulo(org?.modulos_ativos, "loja")) redirect("/dashboard")

  const up = { role: usuario.role ?? "", funcoes: (usuario.funcoes ?? []) as string[] }
  if (!podeVerEstoqueLoja(up) && !podeVenderLoja(up)) redirect("/dashboard")

  const orgId = usuario.organizacao_id as string

  const [kpis, alertas, topProdutos, ultimasVendas, faturamentoDiario] = await Promise.all([
    getHubKpis(orgId),
    getAlertasEstoque(orgId),
    getTopProdutos(orgId),
    getUltimasVendas(orgId),
    getFaturamentoDiario(orgId),
  ])

  const hoje = new Date().toLocaleDateString("pt-BR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  })

  return (
    <LojaHubClient
      hoje={hoje}
      kpis={kpis}
      alertas={alertas}
      topProdutos={topProdutos}
      ultimasVendas={ultimasVendas}
      faturamentoDiario={faturamentoDiario}
      podeVender={podeVenderLoja(up)}
    />
  )
}