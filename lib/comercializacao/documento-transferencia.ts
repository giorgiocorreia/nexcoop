'use server'

// Dados para o "documento de transferência interna" — venda de lote para empresa
// do próprio cooperado, sem emissão de NF-e pela cooperativa (tipo_documento =
// 'transferencia_interna'). Documento sem valor fiscal, só controle interno.

import { createAdminClient } from '@/lib/supabase/admin'

export interface DadosDocumentoTransferencia {
  venda: {
    id:             string
    data_venda:     string
    quantidade_kg:  number
    preco_kg:       number
    valor_bruto:    number
    observacoes:    string | null
  }
  organizacao: {
    nome: string
    cnpj: string
  }
  lote: {
    codigo:      string
    safra_ano:   number | null
    produtos:    string[]
  }
  comprador: {
    nome: string
    cnpj: string | null
  }
}

export async function buscarDadosDocumentoTransferencia(vendaId: string): Promise<DadosDocumentoTransferencia> {
  const adminClient = createAdminClient()

  const { data: venda, error } = await adminClient
    .from('vendas_externas')
    .select(`
      id, organizacao_id, data_venda, quantidade_kg, preco_kg, valor_bruto, observacoes, tipo_documento,
      compradores(nome, cnpj),
      lotes(codigo, produto_descricao, safras(ano), lote_itens(produtos(nome)))
    `)
    .eq('id', vendaId)
    .single()

  if (error || !venda) throw new Error('Venda não encontrada')
  if ((venda as any).tipo_documento !== 'transferencia_interna') {
    throw new Error('Esta venda não é uma transferência interna')
  }

  const { data: org, error: orgErr } = await adminClient
    .from('organizacoes')
    .select('nome, cnpj')
    .eq('id', venda.organizacao_id)
    .single()

  if (!org) throw new Error('Organização não encontrada: ' + orgErr?.message)

  const loteData = (venda as any).lotes
  const compradorData = (venda as any).compradores

  const loteItens = Array.isArray(loteData?.lote_itens) ? loteData.lote_itens : []
  const nomesProdutos = loteItens
    .map((li: any) => li?.produtos?.nome)
    .filter((n: unknown): n is string => typeof n === 'string' && n.length > 0)
  const produtos = nomesProdutos.length > 0
    ? nomesProdutos
    : [loteData?.produto_descricao ?? 'Não informado']

  return {
    venda: {
      id:            venda.id,
      data_venda:    venda.data_venda,
      quantidade_kg: Number(venda.quantidade_kg),
      preco_kg:      Number(venda.preco_kg),
      valor_bruto:   Number(venda.valor_bruto),
      observacoes:   venda.observacoes ?? null,
    },
    organizacao: {
      nome: org.nome,
      cnpj: org.cnpj ?? '',
    },
    lote: {
      codigo:    loteData?.codigo ?? '—',
      safra_ano: loteData?.safras?.ano ?? null,
      produtos,
    },
    comprador: {
      nome: compradorData?.nome ?? 'Comprador não identificado',
      cnpj: compradorData?.cnpj ?? null,
    },
  }
}
