"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { getUsuarioLogado } from "@/lib/auth"

export type { DadosDevolucao } from "./devolucao-xml"

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
  const usuario = await getUsuarioLogado()

  try {
    const { data: venda, error: errVenda } = await supabase
      .from("vendas_externas")
      .select("*")
      .eq("id", input.vendaId)
      .single()

    if (errVenda || !venda) throw new Error("Venda não encontrada")
    if (venda.status !== "entregue") throw new Error("Venda não está com status entregue")

    // Comprador paga o peso RECEBIDO: quebras de peso registradas reduzem o
    // valor do recebimento (a cooperativa absorve — ver migration 069).
    const { data: quebras } = await (supabase as any)
      .from("vendas_quebras_peso")
      .select("valor_total")
      .eq("venda_id", input.vendaId)
    const totalQuebras = (quebras ?? []).reduce(
      (soma: number, q: any) => soma + Number(q.valor_total ?? 0), 0
    )

    let quantidadeFinal = venda.quantidade_kg
    let valorFinal      = Math.max(0, Math.round((venda.valor_bruto - totalQuebras) * 100) / 100)

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
      valorFinal      = Math.max(0, Math.round((quantidadeFinal * valorUnitario - totalQuebras) * 100) / 100)

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

      const { criarLancamento: criarLancEstorno } = await import("@/lib/financeiro/actions")
      const valorEstorno = Math.round(quantidadeKg * valorUnitario * 100) / 100
      await criarLancEstorno({
        organizacao_id:   input.orgId,
        tipo:             "despesa",
        status:           "pago",
        data_competencia: new Date().toISOString().substring(0, 10),
        data_pagamento:   new Date().toISOString().substring(0, 10),
        descricao:        `Ajuste devolução parcial — Venda ${input.vendaId.substring(0, 8)}`,
        valor:            valorEstorno,
        numero_documento: input.vendaId.substring(0, 8),
        observacoes:      chaveNfeDevolucao ? `NF-e devolução: ${chaveNfeDevolucao}` : undefined,
        usuario_id:       usuario.id,
        usuario_email:    usuario.email ?? undefined,
      })

    } else {
      const { error: errUpd } = await supabase
        .from("vendas_externas")
        .update({ status: "pago" } as any)
        .eq("id", input.vendaId)

      if (errUpd) throw new Error("Erro ao atualizar venda: " + errUpd.message)
    }

    await supabase.from("lotes").update({ status: "pago" } as any).eq("id", venda.lote_id).eq("organizacao_id", input.orgId)

    const { criarLancamento } = await import("@/lib/financeiro/actions")
    await criarLancamento({
      organizacao_id:   input.orgId,
      tipo:             "receita",
      status:           "pago",
      data_competencia: new Date().toISOString().substring(0, 10),
      data_pagamento:   new Date().toISOString().substring(0, 10),
      descricao:        `Recebimento venda — ${input.vendaId.substring(0, 8)}`,
      valor:            valorFinal,
      numero_documento: input.vendaId.substring(0, 8),
      usuario_id:       usuario.id,
      usuario_email:    usuario.email ?? undefined,
    })

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
