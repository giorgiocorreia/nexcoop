'use server'

// Quebra de peso: cacau vendido "quente" perde peso até o destino. O
// comprador paga pelo peso RECEBIDO, não pelo peso faturado na NF-e — a
// cooperativa absorve a diferença. Esta action registra a quebra numa venda
// já confirmada/entregue e reduz o valor a receber do lançamento financeiro
// vinculado (contas a receber), sem tocar em quantidade_kg/valor_bruto da
// venda (que seguem a NF-e emitida) nem em resultado_safra_snapshot.

import { createAdminClient } from '@/lib/supabase/admin'
import { getUsuarioLogado } from '@/lib/auth'
import { editarLancamento } from '@/lib/financeiro/actions'
import { revalidatePath } from 'next/cache'

export interface RegistrarQuebraPesoInput {
  vendaId:      string
  quantidadeKg: number
  motivo?:      string
}

export async function registrarQuebraPeso(input: RegistrarQuebraPesoInput) {
  try {
    const usuario = await getUsuarioLogado()
    const orgId = usuario.organizacao_id as string
    if (!orgId) return { error: 'Organização não encontrada.' }

    const quantidadeKg = Number(input.quantidadeKg)
    if (!quantidadeKg || quantidadeKg <= 0) {
      return { error: 'Informe uma quantidade de quebra maior que zero.' }
    }

    const supabase = createAdminClient()

    const { data: venda, error: errVenda } = await supabase
      .from('vendas_externas')
      .select('id, lote_id, quantidade_kg, quantidade_kg_devolvida, preco_kg, status, lancamento_id')
      .eq('id', input.vendaId)
      .eq('organizacao_id', orgId)
      .single()

    if (errVenda || !venda) return { error: 'Venda não encontrada.' }

    // status real gravado no banco usa 'pago' (ver lib/comercializacao/devolucao.ts),
    // divergente do type StatusVendaExterna ('paga') — comparar como string solta.
    const statusVenda = venda.status as string
    if (statusVenda === 'pago' || statusVenda === 'paga') {
      return { error: 'Venda já paga — registre a quebra antes de informar o pagamento.' }
    }
    if (statusVenda !== 'confirmada' && statusVenda !== 'entregue') {
      return { error: 'Só é possível registrar quebra de peso em vendas confirmadas ou entregues.' }
    }

    // Saldo restante = quantidade faturada - devoluções já processadas -
    // quebras já registradas anteriormente para esta venda.
    const { data: quebrasExistentes, error: errQuebras } = await supabase
      .from('vendas_quebras_peso')
      .select('quantidade_kg')
      .eq('venda_id', input.vendaId)

    if (errQuebras) return { error: 'Erro ao consultar quebras existentes: ' + errQuebras.message }

    const totalQuebrasKg = (quebrasExistentes ?? []).reduce((acc, q: any) => acc + Number(q.quantidade_kg), 0)
    const saldoRestante = Number(venda.quantidade_kg) - Number(venda.quantidade_kg_devolvida ?? 0) - totalQuebrasKg

    if (quantidadeKg > saldoRestante + 1e-6) {
      return { error: `Quantidade informada (${quantidadeKg} kg) excede o saldo restante da venda (${saldoRestante.toFixed(3)} kg).` }
    }

    const precoKg = Number(venda.preco_kg)
    const valorQuebra = Math.round(quantidadeKg * precoKg * 100) / 100

    // Se há lançamento vinculado, valida o status ANTES de gravar a quebra —
    // evita ficar com quebra registrada sem conseguir refletir no financeiro.
    let lancamentoAtual: { id: string; valor: number; observacoes: string | null } | null = null
    if (venda.lancamento_id) {
      const { data: lancamento, error: errLanc } = await supabase
        .from('lancamentos')
        .select('id, valor, status, observacoes')
        .eq('id', venda.lancamento_id)
        .single()

      if (errLanc || !lancamento) {
        return { error: 'Lançamento financeiro vinculado à venda não foi encontrado.' }
      }
      if (lancamento.status === 'pago') {
        return { error: 'Lançamento financeiro já foi pago — registre a quebra antes de informar o pagamento.' }
      }
      lancamentoAtual = { id: lancamento.id, valor: Number(lancamento.valor), observacoes: lancamento.observacoes }
    }

    const { data: quebra, error: errInsert } = await supabase
      .from('vendas_quebras_peso')
      .insert({
        organizacao_id: orgId,
        venda_id:        input.vendaId,
        quantidade_kg:   quantidadeKg,
        valor_unitario:  precoKg,
        motivo:          input.motivo || null,
      } as any)
      .select()
      .single()

    if (errInsert) return { error: 'Erro ao registrar quebra: ' + errInsert.message }

    let avisoLancamento: string | undefined

    if (lancamentoAtual) {
      const novoValor = Math.max(0, Math.round((lancamentoAtual.valor - valorQuebra) * 100) / 100)
      const nota = `Quebra de peso: -${quantidadeKg} kg (R$ ${valorQuebra.toFixed(2)})${input.motivo ? ` — ${input.motivo}` : ''}`
      const novasObservacoes = lancamentoAtual.observacoes
        ? `${lancamentoAtual.observacoes}\n${nota}`
        : nota

      await editarLancamento(lancamentoAtual.id, orgId, usuario.id, {
        valor:        novoValor,
        observacoes:  novasObservacoes,
      })
    } else {
      avisoLancamento = 'Quebra registrada, mas esta venda não tem lançamento financeiro vinculado — nenhum valor a receber foi ajustado.'
    }

    if (venda.lote_id) revalidatePath(`/comercializacao/lotes/${venda.lote_id}`)

    return {
      success: true,
      quebra,
      saldoRestante: Math.round((saldoRestante - quantidadeKg) * 100) / 100,
      avisoLancamento,
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro desconhecido ao registrar quebra de peso.' }
  }
}
