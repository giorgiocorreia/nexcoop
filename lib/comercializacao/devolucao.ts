"use server"

import { createAdminClient } from "@/lib/supabase/admin"

export interface DadosDevolucao {
  chaveNfe: string
  nomeEmitente: string
  dataEmissao: string
  quantidadeKg: number
  valorUnitario: number
  valorTotal: number
}

export function parsearXmlDevolucao(xml: string): DadosDevolucao | null {
  try {
    const get = (tag: string) => {
      const m = xml.match(new RegExp(`<${tag}[^>]*>([^<]+)<\/${tag}>`))
      return m ? m[1].trim() : ""
    }

    const chaveNfe     = get("chNFe")
    const nomeEmitente = get("xNome")
    const dataEmissao  = get("dhEmi").substring(0, 10)

    const qtds = [...xml.matchAll(/<qCom>([^<]+)<\/qCom>/g)]
    const quantidadeKg = qtds.reduce((acc, m) => acc + parseFloat(m[1]), 0)

    const vUnMatch    = xml.match(/<vUnCom>([^<]+)<\/vUnCom>/)
    const valorUnitario = vUnMatch ? parseFloat(vUnMatch[1]) : 0

    if (!chaveNfe || quantidadeKg <= 0 || valorUnitario <= 0) return null

    return {
      chaveNfe,
      nomeEmitente,
      dataEmissao,
      quantidadeKg,
      valorUnitario,
      valorTotal: Math.round(quantidadeKg * valorUnitario * 100) / 100,
    }
  } catch {
    return null
  }
}

export interface ProcessarPagamentoInput {
  vendaId: string
  orgId: string
  devolucao?: {
    quantidadeKg: number
    valorUnitario: number
    chaveNfeDevolucao?: string
    xmlNfeDevolucao?: string
  }
}

export async function processarPagamentoVendaAction(
  input: ProcessarPagamentoInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient()

  try {
    const { data: venda, error: errVenda } = await supabase
      .from("vendas_externas")
      .select("*")
      .eq("id", input.vendaId)
      .single()

    if (errVenda || !venda) throw new Error("Venda não encontrada")
    if (venda.status !== "entregue") throw new Error("Venda não está com status entregue")

    let quantidadeFinal = venda.quantidade_kg
    let valorFinal      = venda.valor_bruto

    if (input.devolucao) {
      const { quantidadeKg, valorUnitario, chaveNfeDevolucao, xmlNfeDevolucao } = input.devolucao

      if (quantidadeKg >= venda.quantidade_kg)
        throw new Error("Quantidade devolvida não pode ser maior ou igual à quantidade vendida")

      const { error: errDev } = await (supabase as any)
        .from("vendas_externas_devolucoes")
        .insert({
          organizacao_id:       input.orgId,
          venda_id:             input.vendaId,
          quantidade_kg:        quantidadeKg,
          valor_unitario:       valorUnitario,
          chave_nfe_devolucao:  chaveNfeDevolucao ?? null,
          xml_nfe_devolucao:    xmlNfeDevolucao ?? null,
          status:               "processada",
          processada_em:        new Date().toISOString(),
        } as any)

      if (errDev) throw new Error("Erro ao registrar devolução: " + errDev.message)

      quantidadeFinal = venda.quantidade_kg - quantidadeKg
      valorFinal      = Math.round(quantidadeFinal * valorUnitario * 100) / 100

      const { error: errUpd } = await supabase
        .from("vendas_externas")
        .update({
          quantidade_kg_original:  (venda as any).quantidade_kg_original ?? venda.quantidade_kg,
          valor_bruto_original:    (venda as any).valor_bruto_original   ?? venda.valor_bruto,
          quantidade_kg_devolvida: quantidadeKg,
          quantidade_kg:           quantidadeFinal,
          valor_bruto:             valorFinal,
          status_nfe:              "devolvida",
          status:                  "pago",
        } as any)
        .eq("id", input.vendaId)

      if (errUpd) throw new Error("Erro ao atualizar venda: " + errUpd.message)

      const { criarLancamento: criarLanc1 } = await import("@/lib/financeiro/actions")
      await criarLanc1({
        organizacao_id:   input.orgId,
        data_competencia: new Date().toISOString().substring(0, 10),
        descricao:        `Estorno devolução parcial — Venda ${input.vendaId.substring(0, 8)}`,
        tipo:             "debito",
        valor:            quantidadeKg * valorUnitario,
      } as any)

    } else {
      const { error: errUpd } = await supabase
        .from("vendas_externas")
        .update({ status: "pago" } as any)
        .eq("id", input.vendaId)

      if (errUpd) throw new Error("Erro ao atualizar venda: " + errUpd.message)
    }

    const { criarLancamento } = await import("@/lib/financeiro/actions")
    await criarLancamento({
      organizacao_id:   input.orgId,
      data_competencia: new Date().toISOString().substring(0, 10),
      descricao:        `Recebimento venda — ${input.vendaId.substring(0, 8)}`,
      tipo:             "credito",
      valor:            valorFinal,
    } as any)

    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro desconhecido" }
  }
}

export async function marcarVendaEntregueAction(
  vendaId: string,
  orgId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from("vendas_externas")
    .update({ status: "entregue" } as any)
    .eq("id", vendaId)
    .eq("organizacao_id", orgId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function listarDevolucoesAction(orgId: string) {
  const supabase = createAdminClient()
  const { data, error } = await (supabase as any)
    .from("vendas_externas_devolucoes")
    .select(`
      *,
      vendas_externas (
        id, quantidade_kg, valor_bruto, status,
        lotes (codigo),
        compradores (nome_razao_social)
      )
    `)
    .eq("organizacao_id", orgId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data ?? []
}
