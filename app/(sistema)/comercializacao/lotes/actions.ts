'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getOrganizacaoId, getUsuarioLogado } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function listarLotes() {
  const orgId = await getOrganizacaoId()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('lotes')
    .select(`
      *,
      safras(ano, descricao),
      vendas_externas(id, status_nfe, numero_nfe)
    `)
    .eq('organizacao_id', orgId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data
}

export async function listarEntregasDisponiveis() {
  const orgId = await getOrganizacaoId()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('movimentacoes_conta')
    .select(`
      *,
      contas_produtor(
        produtor_id,
        produtores(nome, cpf, cooperado_id)
      ),
      produtos(nome, unidade, fator_saca, ncm, cfop_saida_interna, cfop_saida_interestadual, cst_icms, cst_pis, cst_cofins)
    `)
    .eq('organizacao_id', orgId)
    .eq('tipo', 'entrega')
    .is('lote_id', null)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  const entregas = data ?? []
  if (entregas.length === 0) return []

  // Buscar cotação mais recente <= data de cada entrega
  const resultado = await Promise.all(entregas.map(async (e) => {
    const isCooperado = !!(e.contas_produtor as any)?.produtores?.cooperado_id

    const { data: cotacao } = await supabase
      .from('cotacoes')
      .select('preco_externo, preco_cooperado, vigente_a_partir_de')
      .eq('organizacao_id', orgId)
      .eq('produto_id', e.produto_id ?? '')
      .lte('vigente_a_partir_de', new Date().toISOString())
      .order('vigente_a_partir_de', { ascending: false })
      .limit(1)
      .maybeSingle()

    const cotacaoDia = cotacao
      ? (isCooperado ? Number(cotacao.preco_cooperado) : Number(cotacao.preco_externo))
      : null

    return {
      ...e,
      cotacao_dia: cotacaoDia,
      cotacao_vigente_a_partir_de: cotacao?.vigente_a_partir_de ?? null,
      is_cooperado: isCooperado,
    }
  }))

  return resultado
}

export async function listarEntregasDoLote(loteId: string) {
  const orgId = await getOrganizacaoId()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('movimentacoes_conta')
    .select(`
      *,
      contas_produtor(
        produtor_id,
        produtores(nome, cpf, cooperado_id)
      ),
      produtos(nome, unidade, fator_saca)
    `)
    .eq('organizacao_id', orgId)
    .eq('tipo', 'entrega')
    .eq('lote_id', loteId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  const entregas = data ?? []
  if (entregas.length === 0) return []

  // Buscar cotação mais recente <= data de cada entrega
  const resultado = await Promise.all(entregas.map(async (e) => {
    const isCooperado = !!(e.contas_produtor as any)?.produtores?.cooperado_id

    const { data: cotacao } = await supabase
      .from('cotacoes')
      .select('preco_externo, preco_cooperado, vigente_a_partir_de')
      .eq('organizacao_id', orgId)
      .eq('produto_id', e.produto_id ?? '')
      .lte('vigente_a_partir_de', new Date().toISOString())
      .order('vigente_a_partir_de', { ascending: false })
      .limit(1)
      .maybeSingle()

    const cotacaoDia = cotacao
      ? (isCooperado ? Number(cotacao.preco_cooperado) : Number(cotacao.preco_externo))
      : null

    return {
      ...e,
      cotacao_dia: cotacaoDia,
      cotacao_vigente_a_partir_de: cotacao?.vigente_a_partir_de ?? null,
      is_cooperado: isCooperado,
    }
  }))

  return resultado
}

export async function iniciarLote(produtoDescricao: string, safraId: string) {
  const orgId = await getOrganizacaoId()
  const supabase = createAdminClient()

  const { data: ultimoLote } = await supabase
    .from('lotes')
    .select('codigo')
    .eq('organizacao_id', orgId)
    .order('codigo', { ascending: false })
    .limit(1)
    .maybeSingle()

  const proximoNumero = ultimoLote
    ? String(parseInt(ultimoLote.codigo, 10) + 1).padStart(3, '0')
    : '001'

  const { data: lote, error } = await supabase
    .from('lotes')
    .insert({
      organizacao_id:    orgId,
      codigo:            proximoNumero,
      produto_descricao: produtoDescricao,
      safra_id:          safraId,
      peso_total_kg:     0,
      status:            'rascunho',
    } as any)
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/comercializacao/lotes')
  return lote
}

export async function confirmarComposicaoLote(
  loteId: string,
  idsIncluidos: string[]
) {
  const orgId = await getOrganizacaoId()
  const supabase = createAdminClient()

  // 1. Desvincular todas que já estavam neste lote
  await supabase
    .from('movimentacoes_conta')
    .update({ lote_id: null } as any)
    .eq('lote_id', loteId)
    .eq('organizacao_id', orgId)

  // 2. Vincular apenas as selecionadas
  if (idsIncluidos.length > 0) {
    const { error } = await supabase
      .from('movimentacoes_conta')
      .update({ lote_id: loteId } as any)
      .in('id', idsIncluidos)
      .eq('organizacao_id', orgId)
    if (error) throw new Error(error.message)
  }

  // 3. Recalcular peso_total_kg
  const { data: entregas } = await supabase
    .from('movimentacoes_conta')
    .select('quantidade_produto')
    .eq('lote_id', loteId)
    .eq('organizacao_id', orgId)

  const pesoTotal = (entregas ?? []).reduce((acc, e) => acc + (e.quantidade_produto ?? 0), 0)

  // 4. Atualizar peso e promover status para 'aberto'
  const { error: errUpdate } = await supabase
    .from('lotes')
    .update({ peso_total_kg: pesoTotal, status: 'aberto' } as any)
    .eq('id', loteId)
    .eq('organizacao_id', orgId)

  if (errUpdate) throw new Error(errUpdate.message)

  revalidatePath(`/comercializacao/lotes/${loteId}`)
}

export async function fecharLote(loteId: string) {
  const orgId = await getOrganizacaoId()
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('lotes')
    .update({
      status:          'em_venda',
      data_fechamento: new Date().toISOString().split('T')[0],
    } as any)
    .eq('id', loteId)
    .eq('organizacao_id', orgId)

  if (error) throw new Error(error.message)
  revalidatePath(`/comercializacao/lotes/${loteId}`)
}

export async function buscarLote(loteId: string) {
  const orgId = await getOrganizacaoId()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('lotes')
    .select(`
      *,
      safras(ano, descricao),
      lote_itens(produto_id, peso_kg, produtos(nome, unidade, fator_saca, ncm, cfop_saida_interna, cfop_saida_interestadual, cst_icms, cst_pis, cst_cofins)),
      vendas_externas(id, status, status_nfe, chave_nfe, numero_nfe, serie_nfe, xml_nfe, quantidade_kg, quantidade_kg_devolvida, preco_kg, valor_bruto, tipo_documento, lancamento_id, vendas_quebras_peso(id, quantidade_kg, valor_unitario, valor_total, motivo, criado_em))
    `)
    .eq('id', loteId)
    .eq('organizacao_id', orgId)
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function listarCompradores() {
  const orgId = await getOrganizacaoId()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('compradores')
    .select('*')
    .eq('organizacao_id', orgId)
    .eq('ativo', true)
    .order('nome')

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function criarVendaExterna(input: {
  loteId: string
  compradorId: string
  dataVenda: string
  quantidadeKg: number
  precoKg: number
  observacoes?: string
  tipoDocumento?: 'nfe_saida' | 'transferencia_interna'
}) {
  const orgId = await getOrganizacaoId()
  const usuario = await getUsuarioLogado()
  const supabase = createAdminClient()

  const { data: lote } = await supabase
    .from('lotes')
    .select('safra_id, codigo')
    .eq('id', input.loteId)
    .single()

  if (!lote) throw new Error('Lote não encontrado.')

  const { data: org } = await supabase
    .from('organizacoes')
    .select('taxa_comercializacao')
    .eq('id', orgId)
    .maybeSingle()

  const taxa = (org as any)?.taxa_comercializacao ?? 3
  const tipoDocumento = input.tipoDocumento ?? 'nfe_saida'

  const { data, error } = await supabase
    .from('vendas_externas')
    .insert({
      organizacao_id:           orgId,
      safra_id:                 lote.safra_id,
      lote_id:                  input.loteId,
      comprador_id:             input.compradorId,
      data_venda:               input.dataVenda,
      quantidade_kg:            input.quantidadeKg,
      preco_kg:                 input.precoKg,
      taxa_comercializacao_pct: taxa,
      status:                   'rascunho',
      // status_nfe explícito — nunca depender do DEFAULT da coluna (histórico:
      // migration 054 mudou o CHECK e quebrou o default antigo 'pendente', ver migration 070).
      status_nfe:               tipoDocumento === 'transferencia_interna' ? null : 'rascunho',
      observacoes:              input.observacoes ?? null,
      tipo_documento:           tipoDocumento,
    } as any)
    .select()
    .single()

  if (error) throw new Error(error.message)

  // Transferência interna: o comprador é a empresa do próprio cooperado e emite
  // a NF-e por fora. Não há fluxo Focus NFe nem espera de autorização — cria o
  // lançamento financeiro na hora e avança o status direto para 'confirmada'
  // (mesmo estado alcançado pelo fluxo de NF-e após autorização, ver
  // lib/focusnfe/emitir-nfe-saida.ts).
  if (tipoDocumento === 'transferencia_interna') {
    const valorTotal = Number((input.quantidadeKg * input.precoKg).toFixed(2))

    try {
      const { data: comprador } = await supabase
        .from('compradores')
        .select('nome')
        .eq('id', input.compradorId)
        .maybeSingle()

      const { criarLancamento } = await import('@/lib/financeiro/actions')
      const lancamento = await criarLancamento({
        organizacao_id:   orgId,
        tipo:             'receita' as any,
        status:           'pendente' as any,
        descricao:        `Transferência interna — ${comprador?.nome ?? 'Comprador'} — Lote ${lote.codigo}`,
        valor:            valorTotal,
        data_competencia: input.dataVenda,
        numero_documento: `TRANSF-${data.id.slice(0, 8)}`,
        observacoes:      'Venda sem emissão de NF-e pela cooperativa — comprador emite a NF-e por fora.',
        usuario_id:       usuario.id,
        usuario_email:    usuario.email ?? undefined,
      })

      await supabase
        .from('vendas_externas')
        .update({ lancamento_id: lancamento.id, status: 'confirmada' } as any)
        .eq('id', data.id)
        .eq('status', 'rascunho')
    } catch (e) {
      console.error('[comercializacao] Erro ao criar lançamento de transferência interna:', e)
      throw new Error('Venda registrada, mas houve erro ao criar o lançamento financeiro. Contate o suporte.')
    }
  }

  revalidatePath(`/comercializacao/lotes/${input.loteId}`)

  const { data: vendaFinal } = await supabase
    .from('vendas_externas')
    .select('*')
    .eq('id', data.id)
    .single()

  return vendaFinal ?? data
}

export async function adicionarEntregaAoLote(loteId: string, movimentacaoId: string, cotacaoValor: number) {
  const orgId = await getOrganizacaoId()
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('movimentacoes_conta')
    .update({ lote_id: loteId } as any)
    .eq('id', movimentacaoId)
    .eq('organizacao_id', orgId)

  if (error) throw new Error(error.message)

  // Recalcular peso_total_kg do lote
  const { data: entregas } = await supabase
    .from('movimentacoes_conta')
    .select('quantidade_produto')
    .eq('lote_id', loteId)
    .eq('organizacao_id', orgId)

  const pesoTotal = (entregas ?? []).reduce((acc, e) => acc + (e.quantidade_produto ?? 0), 0)

  await supabase
    .from('lotes')
    .update({ peso_total_kg: pesoTotal } as any)
    .eq('id', loteId)
    .eq('organizacao_id', orgId)

  revalidatePath(`/comercializacao/lotes/${loteId}`)
}

export async function listarSafras() {
  const orgId = await getOrganizacaoId()
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('safras')
    .select('id, ano, descricao')
    .eq('organizacao_id', orgId)
    .order('ano', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}
