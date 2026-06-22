'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getOrganizacaoId } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function listarLotes() {
  const orgId = await getOrganizacaoId()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('lotes')
    .select(`
      *,
      safras(ano, descricao),
      produtos(nome, unidade, fator_saca)
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
      produtores(nome),
      produtos(nome, unidade, fator_saca, ncm, cfop_saida_interna, cfop_saida_interestadual, cst_icms, cst_pis, cst_cofins)
    `)
    .eq('organizacao_id', orgId)
    .eq('tipo', 'entrega')
    .is('lote_id', null)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function listarEntregasDoLote(loteId: string) {
  const orgId = await getOrganizacaoId()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('movimentacoes_conta')
    .select(`
      *,
      produtores(nome, cpf),
      produtos(nome, unidade, fator_saca)
    `)
    .eq('organizacao_id', orgId)
    .eq('tipo', 'entrega')
    .eq('lote_id', loteId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function gerarLoteAutomatico(produtoDescricao: string) {
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

  const { data: entregas, error: errEntregas } = await supabase
    .from('movimentacoes_conta')
    .select('id, quantidade_produto')
    .eq('organizacao_id', orgId)
    .eq('tipo', 'entrega')
    .is('lote_id', null)

  if (errEntregas) throw new Error(errEntregas.message)
  if (!entregas || entregas.length === 0) throw new Error('Nenhuma entrega disponível para formar lote.')

  const pesoTotal = entregas.reduce((acc, e) => acc + (e.quantidade_produto ?? 0), 0)

  const { data: lote, error: errLote } = await supabase
    .from('lotes')
    .insert({
      organizacao_id:    orgId,
      codigo:            proximoNumero,
      produto_descricao: produtoDescricao,
      peso_total_kg:     pesoTotal,
      status:            'aberto',
    } as any)
    .select()
    .single()

  if (errLote) throw new Error(errLote.message)

  const ids = entregas.map(e => e.id)
  const { error: errUpdate } = await supabase
    .from('movimentacoes_conta')
    .update({ lote_id: lote.id } as any)
    .in('id', ids)

  if (errUpdate) throw new Error(errUpdate.message)

  revalidatePath('/comercializacao/lotes')
  return lote
}

export async function confirmarComposicaoLote(
  loteId: string,
  idsIncluidos: string[],
  idsPreviamenteLigados: string[]
) {
  const orgId = await getOrganizacaoId()
  const supabase = createAdminClient()

  const idsRemovidos  = idsPreviamenteLigados.filter(id => !idsIncluidos.includes(id))
  const idsAdicionados = idsIncluidos.filter(id => !idsPreviamenteLigados.includes(id))

  if (idsRemovidos.length > 0) {
    const { error } = await supabase
      .from('movimentacoes_conta')
      .update({ lote_id: null } as any)
      .in('id', idsRemovidos)
      .eq('organizacao_id', orgId)
    if (error) throw new Error(error.message)
  }

  if (idsAdicionados.length > 0) {
    const { error } = await supabase
      .from('movimentacoes_conta')
      .update({ lote_id: loteId } as any)
      .in('id', idsAdicionados)
      .eq('organizacao_id', orgId)
    if (error) throw new Error(error.message)
  }

  const { data: entregas } = await supabase
    .from('movimentacoes_conta')
    .select('quantidade_produto')
    .eq('lote_id', loteId)
    .eq('organizacao_id', orgId)

  const pesoTotal = (entregas ?? []).reduce((acc, e) => acc + (e.quantidade_produto ?? 0), 0)

  await supabase
    .from('lotes')
    .update({ peso_total_kg: pesoTotal })
    .eq('id', loteId)

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
      produtos(nome, unidade, fator_saca, ncm, cfop_saida_interna, cfop_saida_interestadual, cst_icms, cst_pis, cst_cofins)
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
}) {
  const orgId = await getOrganizacaoId()
  const supabase = createAdminClient()

  const { data: lote } = await supabase
    .from('lotes')
    .select('safra_id')
    .eq('id', input.loteId)
    .single()

  if (!lote) throw new Error('Lote não encontrado.')

  const { data: org } = await supabase
    .from('organizacoes')
    .select('taxa_comercializacao')
    .eq('id', orgId)
    .maybeSingle()

  const taxa = (org as any)?.taxa_comercializacao ?? 3

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
      observacoes:              input.observacoes ?? null,
    } as any)
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath(`/comercializacao/lotes/${input.loteId}`)
  return data
}
