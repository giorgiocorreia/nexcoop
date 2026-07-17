'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { traduzirErro } from '@/lib/utils/erros'
import { createAdminClient } from '@/lib/supabase/admin'
import { orgTemModulo, podeGerenciarLoja } from '@/lib/permissoes'
import type { LojaFornecedor, LojaProduto, LojaLote, LojaCompra, LojaTipoMovimento } from '@/types/database'

async function getCtx() {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) throw new Error('Não autenticado')
  const admin = createAdminClient()
  const { data: usuario } = await admin
    .from('usuarios')
    .select('id, organizacao_id')
    .eq('id', user.id)
    .single()
  if (!usuario?.organizacao_id) throw new Error('Usuário sem organização')
  return { supabase: admin, usuarioId: user.id, orgId: usuario.organizacao_id as string }
}

// ── Fornecedores ──────────────────────────────────────────────────────────────

export async function listarFornecedores() {
  try {
    const { supabase, orgId } = await getCtx()
    const { data, error } = await supabase
      .from('loja_fornecedores')
      .select('*')
      .eq('org_id', orgId)
      .order('nome')
    if (error) return { error: traduzirErro(error.message) }
    return { data: data as LojaFornecedor[] }
  } catch (e) {
    return { error: String(e) }
  }
}

export async function criarFornecedor(
  dados: Pick<LojaFornecedor, 'nome' | 'cnpj' | 'telefone' | 'email'>
) {
  try {
    const { supabase, orgId } = await getCtx()
    const { data, error } = await supabase
      .from('loja_fornecedores')
      .insert({ ...dados, org_id: orgId, ativo: true })
      .select()
      .single()
    if (error) return { error: traduzirErro(error.message) }
    revalidatePath('/loja/fornecedores')
    revalidatePath('/loja')
    return { data: data as LojaFornecedor }
  } catch (e) {
    return { error: String(e) }
  }
}

export async function atualizarFornecedor(
  id: string,
  dados: Partial<Pick<LojaFornecedor, 'nome' | 'cnpj' | 'telefone' | 'email' | 'ativo'>>
) {
  try {
    const { supabase } = await getCtx()
    const { data, error } = await supabase
      .from('loja_fornecedores')
      .update(dados)
      .eq('id', id)
      .select()
      .single()
    if (error) return { error: traduzirErro(error.message) }
    revalidatePath('/loja/fornecedores')
    revalidatePath('/loja/produtos')
    return { data: data as LojaFornecedor }
  } catch (e) {
    return { error: String(e) }
  }
}

export async function toggleFornecedorAtivo(id: string, ativo: boolean) {
  try {
    const { supabase } = await getCtx()
    const { error } = await supabase
      .from('loja_fornecedores')
      .update({ ativo })
      .eq('id', id)
    if (error) return { error: traduzirErro(error.message) }
    revalidatePath('/loja/fornecedores')
    return { ok: true }
  } catch (e) {
    return { error: String(e) }
  }
}

export async function excluirFornecedor(id: string) {
  try {
    const { supabase, orgId } = await getCtx()
    const { data: fornecedor } = await supabase
      .from('loja_fornecedores')
      .select('org_id')
      .eq('id', id)
      .single()
    if (!fornecedor) return { error: 'Fornecedor não encontrado.' }
    if ((fornecedor as { org_id: string }).org_id !== orgId) return { error: 'Sem permissão.' }
    const { error } = await supabase.from('loja_fornecedores').delete().eq('id', id)
    if (error) return { error: traduzirErro(error.message) }
    revalidatePath('/loja/fornecedores')
    revalidatePath('/loja')
    return { ok: true }
  } catch (e) {
    return { error: String(e) }
  }
}

// ── Produtos ──────────────────────────────────────────────────────────────────

export type LojaProdutoComFornecedor = LojaProduto & {
  loja_fornecedores: { nome: string } | null
}

export async function listarProdutos() {
  try {
    const { supabase, orgId } = await getCtx()
    const { data, error } = await supabase
      .from('loja_produtos')
      .select('*, loja_fornecedores(nome)')
      .eq('org_id', orgId)
      .order('nome')
    if (error) return { error: traduzirErro(error.message) }
    return { data: data as unknown as LojaProdutoComFornecedor[] }
  } catch (e) {
    return { error: String(e) }
  }
}

export async function getProduto(id: string) {
  try {
    const { supabase, orgId } = await getCtx()
    const { data, error } = await supabase
      .from('loja_produtos')
      .select('*, loja_fornecedores(nome)')
      .eq('id', id)
      .eq('org_id', orgId)
      .single()
    if (error) return { error: traduzirErro(error.message) }
    return { data: data as unknown as LojaProdutoComFornecedor }
  } catch (e) {
    return { error: String(e) }
  }
}

export async function listarProdutosCriticos() {
  try {
    const { supabase, orgId } = await getCtx()
    const { data, error } = await supabase
      .from('loja_produtos')
      .select('*')
      .eq('org_id', orgId)
      .eq('ativo', true)
      .not('estoque_minimo', 'is', null)
    if (error) return { error: traduzirErro(error.message) }
    const criticos = (data ?? []).filter(
      (p) => p.estoque_minimo !== null && p.estoque_atual < p.estoque_minimo
    )
    return { data: criticos as LojaProduto[] }
  } catch (e) {
    return { error: String(e) }
  }
}

export async function getPosicaoEstoque(produtoId: string) {
  try {
    const { supabase, orgId } = await getCtx()
    const { data: produto, error: errProd } = await supabase
      .from('loja_produtos')
      .select('estoque_atual, estoque_minimo')
      .eq('id', produtoId)
      .eq('org_id', orgId)
      .single()
    if (errProd) return { error: traduzirErro(errProd.message) }

    const { data: lotes, error: errLotes } = await supabase
      .from('loja_lotes')
      .select('*')
      .eq('produto_id', produtoId)
      .eq('org_id', orgId)
      .gt('quantidade_atual', 0)
      .order('data_validade', { ascending: true })
    if (errLotes) return { error: traduzirErro(errLotes.message) }

    return {
      data: {
        estoque_atual:  produto?.estoque_atual ?? 0,
        estoque_minimo: produto?.estoque_minimo ?? null,
        lotes:          (lotes ?? []) as LojaLote[],
      },
    }
  } catch (e) {
    return { error: String(e) }
  }
}

export async function criarProduto(
  dados: Pick<LojaProduto, 'nome' | 'categoria' | 'unidade' | 'preco_normal' | 'desconto_cooperado' | 'desconto_cooperado_pct' | 'estoque_minimo' | 'fornecedor_id' | 'ncm' | 'cfop_saida'>
) {
  try {
    const { supabase, orgId } = await getCtx()
    const { data, error } = await supabase
      .from('loja_produtos')
      .insert({ ...dados, org_id: orgId, estoque_atual: 0, ativo: true })
      .select()
      .single()
    if (error) return { error: traduzirErro(error.message) }
    revalidatePath('/loja/produtos')
    revalidatePath('/loja')
    return { data: data as LojaProduto }
  } catch (e) {
    return { error: String(e) }
  }
}

export async function atualizarProduto(
  id: string,
  dados: Partial<Pick<LojaProduto, 'nome' | 'categoria' | 'unidade' | 'preco_normal' | 'desconto_cooperado' | 'desconto_cooperado_pct' | 'estoque_minimo' | 'fornecedor_id' | 'ativo' | 'ncm' | 'cfop_saida'>>
) {
  try {
    const { supabase } = await getCtx()
    const { data, error } = await supabase
      .from('loja_produtos')
      .update(dados)
      .eq('id', id)
      .select()
      .single()
    if (error) return { error: traduzirErro(error.message) }
    revalidatePath('/loja/produtos')
    return { data: data as LojaProduto }
  } catch (e) {
    return { error: String(e) }
  }
}

export async function toggleProdutoAtivo(id: string, ativo: boolean) {
  try {
    const { supabase } = await getCtx()
    const { error } = await supabase
      .from('loja_produtos')
      .update({ ativo })
      .eq('id', id)
    if (error) return { error: traduzirErro(error.message) }
    revalidatePath('/loja/produtos')
    return { ok: true }
  } catch (e) {
    return { error: String(e) }
  }
}

export async function excluirProduto(id: string) {
  try {
    const { supabase, orgId } = await getCtx()
    const { data: produto } = await supabase
      .from('loja_produtos')
      .select('org_id')
      .eq('id', id)
      .single()
    if (!produto) return { error: 'Produto não encontrado.' }
    if ((produto as { org_id: string }).org_id !== orgId) return { error: 'Sem permissão.' }
    const { error } = await supabase.from('loja_produtos').delete().eq('id', id)
    if (error) return { error: traduzirErro(error.message) }
    revalidatePath('/loja/produtos')
    revalidatePath('/loja')
    return { ok: true }
  } catch (e) {
    return { error: String(e) }
  }
}

// ── Categorias ────────────────────────────────────────────────────────────────

export async function listarCategorias() {
  try {
    const { supabase, orgId } = await getCtx()
    const { data, error } = await supabase
      .from('loja_produtos')
      .select('categoria')
      .eq('org_id', orgId)
      .not('categoria', 'is', null)
    if (error) return { error: traduzirErro(error.message) }

    const counts: Record<string, number> = {}
    for (const p of data ?? []) {
      if (p.categoria) counts[p.categoria] = (counts[p.categoria] ?? 0) + 1
    }
    const cats = Object.entries(counts)
      .map(([nome, total]) => ({ nome, total }))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    return { data: cats }
  } catch (e) {
    return { error: String(e) }
  }
}

export async function renomearCategoria(oldName: string, newName: string) {
  try {
    const { supabase, orgId } = await getCtx()
    const { error } = await supabase
      .from('loja_produtos')
      .update({ categoria: newName.trim() })
      .eq('org_id', orgId)
      .eq('categoria', oldName)
    if (error) return { error: traduzirErro(error.message) }
    revalidatePath('/loja/categorias')
    revalidatePath('/loja/produtos')
    return { ok: true }
  } catch (e) {
    return { error: String(e) }
  }
}

// ── Compras ───────────────────────────────────────────────────────────────────

async function verificarPermissaoGerente(supabase: ReturnType<typeof createAdminClient>, usuarioId: string) {
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('funcoes, role, organizacoes(modulos_ativos)')
    .eq('id', usuarioId)
    .single()
  const orgRaw = (usuario as any)?.organizacoes
  const org = Array.isArray(orgRaw) ? orgRaw[0] : orgRaw
  if (!orgTemModulo(org?.modulos_ativos, 'loja')) return 'Módulo loja não ativo.'
  const up = { role: usuario?.role ?? '', funcoes: ((usuario as any)?.funcoes ?? []) as string[] }
  if (!podeGerenciarLoja(up)) return 'Sem permissão.'
  return null
}

export async function registrarCompra(
  orgId: string,
  operadorId: string,
  compra: {
    fornecedor_id: string
    data_compra: string
    numero_nf?: string
    valor_frete: number
    outros_custos_valor: number
    outros_custos_descricao?: string
    observacoes?: string
    status_nfe?: 'sem_chave' | 'sem_nota'
    itens: {
      produto_id: string
      quantidade: number
      preco_unitario: number
      numero_lote?: string
      data_validade?: string
    }[]
  }
) {
  try {
    const { supabase, orgId: ctxOrgId, usuarioId } = await getCtx()
    if (ctxOrgId !== orgId || usuarioId !== operadorId) return { error: 'Sem permissão.' }
    const permErr = await verificarPermissaoGerente(supabase, usuarioId)
    if (permErr) return { error: permErr }

    const admin = createAdminClient()

    const valor_total_mercadorias = compra.itens.reduce(
      (sum, item) => sum + item.quantidade * item.preco_unitario, 0
    )
    const total_geral = valor_total_mercadorias + compra.valor_frete + compra.outros_custos_valor

    const { data: compraData, error: errCompra } = await admin
      .from('loja_compras')
      .insert({
        org_id: orgId,
        fornecedor_id: compra.fornecedor_id,
        usuario_id: operadorId,
        numero_nf: compra.numero_nf ?? null,
        data_compra: compra.data_compra,
        valor_frete: compra.valor_frete,
        outros_custos_valor: compra.outros_custos_valor,
        outros_custos_descricao: compra.outros_custos_descricao ?? null,
        observacoes: compra.observacoes ?? null,
        status_nfe:  compra.status_nfe ?? 'sem_chave',
        total: total_geral,
      })
      .select('id')
      .single()
    if (errCompra) return { error: traduzirErro(errCompra.message) }
    const compra_id = (compraData as { id: string }).id

    for (const item of compra.itens) {
      const valor_item = item.quantidade * item.preco_unitario
      const frete_rateado = valor_total_mercadorias > 0
        ? compra.valor_frete * (valor_item / valor_total_mercadorias)
        : 0
      const outros_rateado = valor_total_mercadorias > 0
        ? compra.outros_custos_valor * (valor_item / valor_total_mercadorias)
        : 0
      const preco_custo_final = item.preco_unitario + (frete_rateado + outros_rateado) / item.quantidade

      const { error: errItem } = await admin
        .from('loja_compra_itens')
        .insert({
          compra_id,
          produto_id: item.produto_id,
          quantidade: item.quantidade,
          preco_custo: preco_custo_final,
          numero_lote: item.numero_lote ?? null,
          data_validade: item.data_validade ?? null,
          subtotal: valor_item,
        })
      if (errItem) return { error: traduzirErro(errItem.message) }

      const { error: errLote } = await admin
        .from('loja_lotes')
        .insert({
          org_id: orgId,
          produto_id: item.produto_id,
          numero_lote: item.numero_lote ?? null,
          data_validade: item.data_validade ?? null,
          quantidade_entrada: item.quantidade,
          quantidade_atual: item.quantidade,
          preco_custo: preco_custo_final,
        })
      if (errLote) return { error: traduzirErro(errLote.message) }

      const { error: errMov } = await admin
        .from('loja_estoque_movimentos')
        .insert({
          org_id: orgId,
          produto_id: item.produto_id,
          tipo: 'entrada',
          quantidade: item.quantidade,
          motivo: 'compra NF ' + (compra.numero_nf ?? 'sem NF'),
          referencia_id: compra_id,
        })
      if (errMov) return { error: traduzirErro(errMov.message) }

      const { data: prodAtual } = await admin
        .from('loja_produtos')
        .select('estoque_atual')
        .eq('id', item.produto_id)
        .eq('org_id', orgId)
        .single()

      const { error: errProd } = await admin
        .from('loja_produtos')
        .update({ estoque_atual: ((prodAtual as any)?.estoque_atual ?? 0) + item.quantidade })
        .eq('id', item.produto_id)
        .eq('org_id', orgId)
      if (errProd) return { error: traduzirErro(errProd.message) }
    }

    try {
      const { data: fornecedor } = await admin
        .from('loja_fornecedores')
        .select('nome')
        .eq('id', compra.fornecedor_id)
        .single()

      const { criarLancamento } = await import('@/lib/financeiro/actions')
      await criarLancamento({
        organizacao_id: orgId,
        tipo: 'despesa',
        status: 'pago',
        descricao: `Compra Loja — ${fornecedor?.nome ?? 'Fornecedor'}${compra.numero_nf ? ` — NF ${compra.numero_nf}` : ''}`,
        valor: total_geral,
        data_competencia: compra.data_compra,
        data_pagamento: compra.data_compra,
        numero_documento: compra_id.slice(0, 8),
        observacoes: compra.observacoes ?? `Entrada de estoque — compra #${compra_id.slice(0, 8)}`,
        usuario_id: operadorId,
      })
    } catch (e) {
      console.error('[financeiro] Erro ao criar lançamento compra loja:', e)
    }

    revalidatePath('/loja/compras')
    revalidatePath('/loja/estoque')
    revalidatePath('/loja')
    revalidatePath('/financeiro')
    return { data: { id: compra_id } }
  } catch (e) {
    return { error: String(e) }
  }
}

export async function ajusteEstoque(
  orgId: string,
  operadorId: string,
  produto_id: string,
  quantidade_contada: number,
  motivo: string
) {
  try {
    const { supabase, orgId: ctxOrgId, usuarioId } = await getCtx()
    if (ctxOrgId !== orgId || usuarioId !== operadorId) return { error: 'Sem permissão.' }
    const permErr = await verificarPermissaoGerente(supabase, usuarioId)
    if (permErr) return { error: permErr }

    const admin = createAdminClient()

    const { data: produto } = await admin
      .from('loja_produtos')
      .select('estoque_atual')
      .eq('id', produto_id)
      .eq('org_id', orgId)
      .single()
    if (!produto) return { error: 'Produto não encontrado.' }

    const estoque_atual = (produto as any).estoque_atual ?? 0
    const diferenca = quantidade_contada - estoque_atual

    const { error: errMov } = await admin
      .from('loja_estoque_movimentos')
      .insert({
        org_id: orgId,
        produto_id,
        tipo: 'inventario',
        quantidade: Math.abs(diferenca),
        motivo,
        referencia_id: null,
      })
    if (errMov) return { error: traduzirErro(errMov.message) }

    const { error: errProd } = await admin
      .from('loja_produtos')
      .update({ estoque_atual: quantidade_contada })
      .eq('id', produto_id)
      .eq('org_id', orgId)
    if (errProd) return { error: traduzirErro(errProd.message) }

    revalidatePath('/loja/estoque')
    revalidatePath('/loja/estoque/ajuste')
    return { ok: true, diferenca }
  } catch (e) {
    return { error: String(e) }
  }
}

export async function listarCompras(filtros?: {
  fornecedor_id?: string
  data_inicio?: string
  data_fim?: string
}) {
  try {
    const { supabase, orgId } = await getCtx()
    let query = supabase
      .from('loja_compras')
      .select('*, loja_fornecedores(nome)')
      .eq('org_id', orgId)
      .order('data_compra', { ascending: false })
    if (filtros?.fornecedor_id) query = query.eq('fornecedor_id', filtros.fornecedor_id)
    if (filtros?.data_inicio)   query = query.gte('data_compra', filtros.data_inicio)
    if (filtros?.data_fim)      query = query.lte('data_compra', filtros.data_fim)
    const { data, error } = await query
    if (error) return { error: traduzirErro(error.message) }
    return { data: data as unknown as (LojaCompra & { loja_fornecedores: { nome: string } | null })[] }
  } catch (e) {
    return { error: String(e) }
  }
}

export async function getCompra(compraId: string) {
  try {
    const { supabase, orgId } = await getCtx()
    const { data: compra, error: errCompra } = await supabase
      .from('loja_compras')
      .select('*, loja_fornecedores(nome)')
      .eq('id', compraId)
      .eq('org_id', orgId)
      .single()
    if (errCompra) return { error: traduzirErro(errCompra.message) }

    const { data: itens, error: errItens } = await supabase
      .from('loja_compra_itens')
      .select('*, loja_produtos(nome, unidade)')
      .eq('compra_id', compraId)
    if (errItens) return { error: traduzirErro(errItens.message) }

    const c = compra as any
    const valor_total_mercadorias = (itens ?? []).reduce((sum: number, i: any) => sum + (i.subtotal ?? 0), 0)

    const fornecedorRaw = c.loja_fornecedores
    const fornecedor_nome = Array.isArray(fornecedorRaw) ? fornecedorRaw[0]?.nome ?? '' : fornecedorRaw?.nome ?? ''

    const itensComRateio = (itens ?? []).map((item: any) => {
      const valor_item = item.subtotal ?? 0
      const frete_rateado = valor_total_mercadorias > 0
        ? c.valor_frete * (valor_item / valor_total_mercadorias)
        : 0
      const outros_rateado = valor_total_mercadorias > 0
        ? c.outros_custos_valor * (valor_item / valor_total_mercadorias)
        : 0
      return {
        ...item,
        produto_nome: item.loja_produtos?.nome ?? '',
        produto_unidade: item.loja_produtos?.unidade ?? 'unidade',
        frete_rateado,
        outros_rateado,
        custo_final_unitario: item.preco_custo ?? 0,
      }
    })

    return { data: { compra: { ...c, fornecedor_nome }, itens: itensComRateio } }
  } catch (e) {
    return { error: String(e) }
  }
}

export async function listarMovimentacoes(filtros?: {
  produto_id?: string
  tipo?: LojaTipoMovimento
  data_inicio?: string
  data_fim?: string
}) {
  try {
    const { supabase, orgId } = await getCtx()
    let query = supabase
      .from('loja_estoque_movimentos')
      .select('*, loja_produtos(nome)')
      .eq('org_id', orgId)
      .order('criado_em', { ascending: false })
    if (filtros?.produto_id) query = query.eq('produto_id', filtros.produto_id)
    if (filtros?.tipo)        query = query.eq('tipo', filtros.tipo)
    if (filtros?.data_inicio) query = query.gte('criado_em', filtros.data_inicio)
    if (filtros?.data_fim)    query = query.lte('criado_em', filtros.data_fim)
    const { data, error } = await query
    if (error) return { error: traduzirErro(error.message) }
    return { data: data as unknown as ({ loja_produtos: { nome: string } | null } & Record<string, unknown>)[] }
  } catch (e) {
    return { error: String(e) }
  }
}

export async function getDashboardEstoque() {
  try {
    const { supabase, orgId } = await getCtx()
    const hoje    = new Date().toISOString().split('T')[0]
    const em30    = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const ha30    = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const [
      { count: total_skus },
      { data: produtosEstoque },
      { data: lotesRaw },
      { data: lotesValor },
      { data: movRecentes },
      { data: prodSemMov },
    ] = await Promise.all([
      supabase.from('loja_produtos').select('*', { count: 'exact', head: true }).eq('org_id', orgId).eq('ativo', true),
      supabase.from('loja_produtos').select('estoque_atual, estoque_minimo').eq('org_id', orgId).eq('ativo', true).not('estoque_minimo', 'is', null),
      supabase.from('loja_lotes').select('*, loja_produtos(nome)').eq('org_id', orgId).gt('quantidade_atual', 0).gte('data_validade', hoje).lte('data_validade', em30).order('data_validade', { ascending: true }).limit(5),
      supabase.from('loja_lotes').select('quantidade_atual, preco_custo').eq('org_id', orgId).gt('quantidade_atual', 0),
      supabase.from('loja_estoque_movimentos').select('produto_id').eq('org_id', orgId).eq('tipo', 'saida_venda').gte('criado_em', ha30),
      supabase.from('loja_produtos').select('*').eq('org_id', orgId).eq('ativo', true).gt('estoque_atual', 0).limit(50),
    ])

    const qtd_criticos = (produtosEstoque ?? []).filter(
      (p: any) => p.estoque_minimo != null && p.estoque_atual < p.estoque_minimo
    ).length

    const valor_total_estoque = (lotesValor ?? []).reduce(
      (sum: number, l: any) => sum + (l.quantidade_atual ?? 0) * (l.preco_custo ?? 0), 0
    )

    const hoje_ms = Date.now()
    const proximos_vencimentos = (lotesRaw ?? []).map((l: any) => ({
      ...l,
      produto_nome: l.loja_produtos?.nome ?? '',
      dias_restantes: l.data_validade
        ? Math.ceil((new Date(l.data_validade + 'T12:00:00').getTime() - hoje_ms) / 86400000)
        : 0,
    }))

    const comVenda = new Set((movRecentes ?? []).map((m: any) => m.produto_id))
    const sem_movimento = (prodSemMov ?? [])
      .filter((p: any) => !comVenda.has(p.id))
      .slice(0, 5)
      .map((p: any) => ({ ...p, dias_sem_movimento: 30 }))

    return {
      data: {
        total_skus: total_skus ?? 0,
        valor_total_estoque,
        qtd_criticos,
        proximos_vencimentos,
        sem_movimento,
      }
    }
  } catch (e) {
    return { error: String(e) }
  }
}

// ─── PDV ────────────────────────────────────────────────────────────────────

import { registrarLog } from '@/lib/audit/logger'
import { podeAutorizarDescontoExtra } from '@/lib/permissoes'
import type {
  ItemCarrinho,
  LojaTipoCliente,
  PagamentoVenda,
  CooperadoIdentificado,
  ResultadoFinalizarVenda,
  ResultadoValidarSenha,
  EstadoCaixa,
} from '@/lib/loja/types'

// ── 1. Abrir Caixa ──────────────────────────────────────────────────────────

export async function abrirCaixaLoja(
  orgId: string,
  usuarioId: string
): Promise<{ caixaId: string; valorAbertura: number } | { error: string }> {
  const admin = createAdminClient()

  const { data: aberto } = await admin
    .from('loja_caixas')
    .select('id')
    .eq('org_id', orgId)
    .eq('usuario_id', usuarioId)
    .eq('status', 'aberto')
    .maybeSingle()

  if (aberto) return { error: 'Você já possui um caixa aberto.' }

  // Continuidade travada: valor de abertura nunca é digitado — é sempre o
  // saldo sob responsabilidade do usuário calculado pelo sistema (herda do
  // fechamento anterior + qualquer aporte/sangria/transferência posterior).
  const { getSaldoResponsabilidadeLoja } = await import('@/lib/tesouraria/saldo-responsabilidade')
  const resp = await getSaldoResponsabilidadeLoja(orgId, usuarioId)
  const valorAbertura = resp.saldo_atual_especie

  const { data, error } = await admin
    .from('loja_caixas')
    .insert({ org_id: orgId, usuario_id: usuarioId, valor_abertura: valorAbertura, status: 'aberto', aberto_em: new Date().toISOString() })
    .select('id')
    .single()

  if (error || !data) return { error: 'Erro ao abrir caixa.' }

  await registrarLog({ org_id: orgId, usuario_id: usuarioId, modulo: 'loja', acao: 'loja_caixa_aberto', dados_depois: { caixa_id: data.id, valor_abertura: valorAbertura } })

  return { caixaId: data.id, valorAbertura }
}

// ── 2. Buscar Cooperado por CPF ──────────────────────────────────────────────

export async function buscarCooperadoPorCPF(
  orgId: string,
  cpf: string
): Promise<CooperadoIdentificado | null> {
  const admin = createAdminClient()
  const cpfLimpo = cpf.replace(/\D/g, '')

  const { data: org } = await admin
    .from('organizacoes')
    .select('modulos_ativos')
    .eq('id', orgId)
    .single()

  const temComercializacao = (org?.modulos_ativos ?? []).includes('comercializacao')

  const { data, error } = await admin
    .from('cooperados')
    .select('id, nome_completo, cpf, usuario_id')
    .eq('organizacao_id', orgId)
    .eq('cpf', cpfLimpo)
    .eq('status', 'ativo')
    .maybeSingle()

  if (!data) return null

  // Busca saldo via produtor vinculado ao cooperado
  let saldoFinanceiro = 0
  let produtorId = ''
  if (temComercializacao) {
    const { data: produtor } = await admin
      .from('produtores')
      .select('id, contas_produtor(saldo_financeiro)')
      .eq('cooperado_id', data.id)
      .eq('organizacao_id', orgId)
      .maybeSingle()

    produtorId = (produtor?.id as string) ?? ''
    const conta = Array.isArray((produtor as any)?.contas_produtor)
      ? (produtor as any).contas_produtor[0]
      : (produtor as any)?.contas_produtor
    saldoFinanceiro = conta?.saldo_financeiro ?? 0
  }

  return {
    cooperado_id: data.id as string,
    produtor_id: produtorId,
    nome: data.nome_completo as string,
    saldo_financeiro: saldoFinanceiro,
    tem_conta_corrente: temComercializacao,
  }
}

// ── 3. Buscar Cooperados por Nome ou CPF ────────────────────────────────────

export async function buscarCooperadosPorNomeOuCPF(
  orgId: string,
  termo: string
): Promise<CooperadoIdentificado[]> {
  const admin = createAdminClient()
  const termoLimpo = termo.trim()
  const cpfLimpo = termoLimpo.replace(/\D/g, '')

  const { data: org } = await admin
    .from('organizacoes')
    .select('modulos_ativos')
    .eq('id', orgId)
    .single()

  const temComercializacao = (org?.modulos_ativos ?? []).includes('comercializacao')

  let query = admin
    .from('cooperados')
    .select('id, nome_completo, cpf, usuario_id')
    .eq('organizacao_id', orgId)
    .eq('status', 'ativo')
    .limit(8)

  if (cpfLimpo.length === 11) {
    query = query.eq('cpf', cpfLimpo)
  } else {
    query = query.ilike('nome_completo', `%${termoLimpo}%`)
  }

  const { data, error } = await query
  if (error || !data) return []

  const resultados: CooperadoIdentificado[] = []

  for (const cooperado of data) {
    let saldoFinanceiro = 0
    let produtorId = ''
    if (temComercializacao) {
      const { data: produtor } = await admin
        .from('produtores')
        .select('id, contas_produtor(saldo_financeiro)')
        .eq('cooperado_id', cooperado.id)
        .eq('organizacao_id', orgId)
        .maybeSingle()

      produtorId = (produtor?.id as string) ?? ''
      const conta = Array.isArray((produtor as any)?.contas_produtor)
        ? (produtor as any).contas_produtor[0]
        : (produtor as any)?.contas_produtor
      saldoFinanceiro = conta?.saldo_financeiro ?? 0
    }

    resultados.push({
      cooperado_id: cooperado.id as string,
      produtor_id: produtorId,
      nome: cooperado.nome_completo as string,
      saldo_financeiro: saldoFinanceiro,
      tem_conta_corrente: temComercializacao,
    })
  }

  return resultados
}

// ── 4. Validar Senha do Autorizador ─────────────────────────────────────────

export async function validarSenhaAutorizador(
  orgId: string,
  senha: string
): Promise<ResultadoValidarSenha> {
  const admin = createAdminClient()

  const { data: usuariosOrg } = await admin
    .from('usuarios')
    .select('id, nome_completo, funcoes, role')
    .eq('organizacao_id', orgId)
    .eq('ativo', true)

  if (!usuariosOrg) return { valido: false }

  const autorizadores = usuariosOrg.filter(u => podeAutorizarDescontoExtra({ role: u.role ?? '', funcoes: u.funcoes ?? [] }))

  for (const autorizador of autorizadores) {
    const { data: authData } = await admin.auth.admin.getUserById(autorizador.id)
    if (!authData?.user?.email) continue

    const { error } = await admin.auth.signInWithPassword({ email: authData.user.email, password: senha })
    if (!error) {
      return { valido: true, autorizador_id: autorizador.id, nome: autorizador.nome_completo ?? '' }
    }
  }

  return { valido: false }
}

// ── 4. Finalizar Venda ───────────────────────────────────────────────────────

export async function finalizarVenda(
  orgId: string,
  operadorId: string,
  caixaId: string,
  venda: {
    cooperado_id?: string
    tipo_cliente: LojaTipoCliente
    total: number
    desconto_total?: number
    pago_especie: number
    pago_pix: number
    pago_cartao?: number
    pago_conta?: number
    tipo_cartao?: string | null
    cartao_nsu?: string
    cartao_autorizacao?: string
    pix_identificador?: string
  },
  itens: ItemCarrinho[]
): Promise<ResultadoFinalizarVenda | { error: string }> {
  const admin = createAdminClient()

  // 1. Insere loja_vendas
  const tipoClienteValido = venda.tipo_cliente === 'cooperado' ? 'cooperado' : 'externo'

  const { data: vendaData, error: errVenda } = await admin
    .from('loja_vendas')
    .insert({
      org_id: orgId,
      caixa_id: caixaId,
      cooperado_id: venda.cooperado_id ?? null,
      tipo_cliente: tipoClienteValido,
      canal: 'presencial',
      status: 'concluida',
      total: venda.total,
      desconto_total: venda.desconto_total ?? 0,
      pago_especie: venda.pago_especie,
      pago_pix: venda.pago_pix,
      pago_cartao: venda.pago_cartao ?? 0,
      pago_saldo: venda.pago_conta ?? 0,
      tipo_cartao: venda.tipo_cartao ?? null,
      cartao_nsu: venda.cartao_nsu || null,
      cartao_autorizacao: venda.cartao_autorizacao || null,
      pix_identificador: venda.pix_identificador || null,
    })
    .select('id')
    .single()

  if (errVenda || !vendaData) return { error: 'Erro ao registrar venda.' }

  const vendaId = vendaData.id

  // 2. Insere itens + baixa FIFO por item
  for (const item of itens) {
    await admin.from('loja_venda_itens').insert({
      venda_id: vendaId,
      produto_id: item.produto.id,
      quantidade: item.quantidade,
      preco_unitario: item.preco_unitario,
      subtotal: item.subtotal,
    })

    // Baixa FIFO
    let qtdRestante = item.quantidade

    const { data: lotes } = await admin
      .from('loja_lotes')
      .select('id, quantidade_atual')
      .eq('produto_id', item.produto.id)
      .gt('quantidade_atual', 0)
      .order('data_validade', { ascending: true })

    for (const lote of lotes ?? []) {
      if (qtdRestante <= 0) break
      const usar = Math.min(lote.quantidade_atual, qtdRestante)

      await admin.from('loja_lotes').update({ quantidade_atual: lote.quantidade_atual - usar }).eq('id', lote.id)
      await admin.from('loja_estoque_movimentos').insert({
        org_id: orgId,
        produto_id: item.produto.id,
        lote_id: lote.id,
        tipo: 'saida_venda',
        quantidade: usar,
        referencia_id: vendaId,
        criado_em: new Date().toISOString(),
      })

      qtdRestante -= usar
    }

    await admin
      .from('loja_produtos')
      .update({ estoque_atual: item.produto.estoque_atual - item.quantidade })
      .eq('id', item.produto.id)
  }

  // 3. Débito em conta corrente
  if ((venda.pago_conta ?? 0) > 0 && venda.cooperado_id) {
    const { data: produtor } = await admin
      .from('produtores')
      .select('id')
      .eq('cooperado_id', venda.cooperado_id)
      .eq('organizacao_id', orgId)
      .maybeSingle()

    const { data: contaData } = await admin
      .from('contas_produtor')
      .select('id')
      .eq('organizacao_id', orgId)
      .eq('produtor_id', produtor?.id ?? '')
      .maybeSingle()

    if (contaData) {
      // Lança o débito no razão. O trigger trg_atualizar_saldos_conta debita
      // contas_produtor.saldo_financeiro (-= ABS(valor_financeiro)) no INSERT de
      // 'compra_loja', então NÃO atualizamos o saldo aqui — seria dupla escrita.
      // valor_financeiro é sempre magnitude positiva; o tipo define o sinal.
      const { error: eMov } = await admin.from('movimentacoes_conta').insert({
        organizacao_id: orgId,
        conta_id: contaData.id,
        usuario_id: operadorId,
        tipo: 'compra_loja',
        valor_financeiro: venda.pago_conta ?? 0,
        referencia_id: vendaId,
        referencia_tipo: 'venda_loja',
        observacoes: `Compra na Loja — Venda #${vendaId.slice(-6).toUpperCase()}`,
      })
      if (eMov) console.error('[loja] Erro ao lançar débito em conta (compra_loja):', eMov)
    }
  }

  await registrarLog({ org_id: orgId, usuario_id:operadorId, modulo: 'loja', acao: 'loja_venda_finalizada', dados_depois: { venda_id: vendaId, total: venda.total } })

  try {
    const { criarLancamento } = await import('@/lib/financeiro/actions')
    await criarLancamento({
      organizacao_id: orgId,
      tipo: 'receita',
      status: 'pago',
      descricao: `Venda Loja #${vendaId.slice(0, 8)} — ${new Date().toLocaleDateString('pt-BR')}`,
      valor: Number(venda.total),
      data_competencia: new Date().toISOString().split('T')[0],
      data_pagamento: new Date().toISOString().split('T')[0],
      numero_documento: vendaId.slice(0, 8),
      cooperado_id: venda.cooperado_id ?? null,
      observacoes: `Venda finalizada no PDV`,
      usuario_id: operadorId,
    })
  } catch (e) {
    console.error('[financeiro] Erro ao criar lançamento venda loja:', e)
  }

  return { vendaId }
}

// ── 5. Cancelar Venda ────────────────────────────────────────────────────────

export async function cancelarVenda(
  orgId: string,
  vendaId: string,
  operadorId: string
): Promise<{ ok: boolean } | { error: string }> {
  const admin = createAdminClient()

  const { data: venda } = await admin
    .from('loja_vendas')
    .select('id, cooperado_id, pago_especie, pago_pix, total')
    .eq('id', vendaId)
    .eq('org_id', orgId)
    .single()

  if (!venda) return { error: 'Venda não encontrada.' }

  // Estorna movimentos de estoque
  const { data: movimentos } = await admin
    .from('loja_estoque_movimentos')
    .select('id, produto_id, lote_id, quantidade')
    .eq('referencia_id', vendaId)
    .eq('tipo', 'saida_venda')

  for (const mov of movimentos ?? []) {
    const { data: lote } = await admin.from('loja_lotes').select('quantidade_atual').eq('id', mov.lote_id as string).single()
    if (lote) await admin.from('loja_lotes').update({ quantidade_atual: lote.quantidade_atual + mov.quantidade }).eq('id', mov.lote_id as string)

    const { data: prod } = await admin.from('loja_produtos').select('estoque_atual').eq('id', mov.produto_id).single()
    if (prod) await admin.from('loja_produtos').update({ estoque_atual: prod.estoque_atual + mov.quantidade }).eq('id', mov.produto_id)

    await admin.from('loja_estoque_movimentos').insert({
      org_id: orgId,
      produto_id: mov.produto_id,
      lote_id: mov.lote_id,
      tipo: 'entrada' as const,
      quantidade: mov.quantidade,
      referencia_id: vendaId,
      criado_em: new Date().toISOString(),
    })
  }

  // Estorna conta corrente se havia débito
  const { data: movConta } = await admin
    .from('movimentacoes_conta')
    .select('id, conta_id, valor_financeiro')
    .eq('referencia_id', vendaId)
    .eq('tipo', 'compra_loja')
    .maybeSingle()

  if (movConta) {
    const { data: conta } = await admin.from('contas_produtor').select('saldo_financeiro').eq('id', movConta.conta_id).single()
    if (conta) {
      const valorEstorno = Math.abs(movConta.valor_financeiro as number)
      const novoSaldo = conta.saldo_financeiro + valorEstorno
      const { error: eEstorno } = await admin.from('movimentacoes_conta').insert({
        organizacao_id: orgId,
        conta_id: movConta.conta_id,
        usuario_id: operadorId,
        tipo: 'estorno' as const,
        valor_financeiro: valorEstorno,
        referencia_id: vendaId,
        referencia_tipo: 'estorno_venda',
        observacoes: `Estorno — Venda cancelada #${vendaId.slice(-6).toUpperCase()}`,
      })
      if (eEstorno) console.error('[loja] Erro ao lançar estorno em conta:', eEstorno)
      // O trigger trg_atualizar_saldos_conta NÃO mexe em saldo_financeiro para
      // tipo 'estorno' (só recalcula saldo de produto), então o crédito de volta
      // é aplicado aqui por UPDATE direto.
      await admin.from('contas_produtor').update({ saldo_financeiro: novoSaldo }).eq('id', movConta.conta_id)
    }
  }

  try {
    const { data: lancamento } = await admin
      .from('lancamentos')
      .select('id, status')
      .eq('organizacao_id', orgId)
      .eq('numero_documento', vendaId.slice(0, 8))
      .eq('tipo', 'receita')
      .maybeSingle()

    if (lancamento && lancamento.status !== 'cancelado') {
      const { editarLancamento } = await import('@/lib/financeiro/actions')
      await editarLancamento(lancamento.id, orgId, operadorId, {
        status: 'cancelado',
        observacoes: `Estornado — venda loja cancelada (${vendaId.slice(0, 8)})`,
      })
    }
  } catch (e) {
    console.error('[financeiro] Erro ao estornar lançamento venda loja:', e)
  }

  await admin.from('loja_vendas').update({ status: 'cancelada' }).eq('id', vendaId)
  await registrarLog({ org_id: orgId, usuario_id:operadorId, modulo: 'loja', acao: 'loja_venda_cancelada', dados_depois: { venda_id: vendaId } })

  revalidatePath('/financeiro')
  return { ok: true }
}

// ── 4b. Validar senha pra transferência entre caixas ────────────────────────
// Mesmo mecanismo de validarSenhaAutorizador (tenta a senha contra candidatos
// até achar quem bate), mas a lista de candidatos inclui também o atendente
// dono do caixa de origem — mesmo que ele não seja admin/gerente_loja. Se o
// dono da origem for o próprio usuário logado, a própria senha dele já cai
// nessa lista, sem precisar de admin (regra confirmada com o Giorgio).
export async function validarSenhaParaTransferencia(
  orgId: string,
  senha: string,
  atendenteOrigemId: string
): Promise<ResultadoValidarSenha> {
  const admin = createAdminClient()

  const { data: usuariosOrg } = await admin
    .from('usuarios')
    .select('id, nome_completo, funcoes, role')
    .eq('organizacao_id', orgId)
    .eq('ativo', true)

  if (!usuariosOrg) return { valido: false }

  const candidatos = usuariosOrg.filter(u =>
    podeAutorizarDescontoExtra({ role: u.role ?? '', funcoes: u.funcoes ?? [] }) || u.id === atendenteOrigemId
  )

  for (const candidato of candidatos) {
    const { data: authData } = await admin.auth.admin.getUserById(candidato.id)
    if (!authData?.user?.email) continue

    const { error } = await admin.auth.signInWithPassword({ email: authData.user.email, password: senha })
    if (!error) {
      return { valido: true, autorizador_id: candidato.id, nome: candidato.nome_completo ?? '' }
    }
  }

  return { valido: false }
}

// ── 6. Registrar Sangria ─────────────────────────────────────────────────────

export async function registrarSangriaLoja(
  orgId: string,
  caixaId: string,
  tipo: 'aporte' | 'sangria',
  valor: number,
  autorizado_por: string,
  executado_por: string,
  observacoes?: string,
  // Transferência: em vez de aporte em dinheiro solto, puxa de uma sessão de
  // caixa da Comercialização OU de outro caixa da própria Loja (outro
  // atendente) — autorização já validada pelo chamador via
  // validarSenhaParaTransferencia. Só válido com tipo='aporte'.
  origem?: { modulo: 'comercializacao' | 'loja'; atendente_origem_id: string }
): Promise<{ ok: boolean } | { error: string }> {
  const admin = createAdminClient()

  if (origem?.modulo === 'loja' && origem.atendente_origem_id === executado_por) {
    return { error: 'Não é possível transferir do seu próprio caixa da Loja pra ele mesmo.' }
  }

  let referenciaTransferenciaId: string | null = null

  if (origem && tipo === 'aporte' && origem.modulo === 'comercializacao') {
    const { getSaldoResponsabilidadeComercializacao } = await import('@/lib/tesouraria/saldo-responsabilidade')
    const saldoOrigem = await getSaldoResponsabilidadeComercializacao(orgId, origem.atendente_origem_id)
    if (!saldoOrigem.sessao_id) {
      return { error: 'Esse atendente não tem caixa aberto nem fechado na Comercialização.' }
    }
    if (saldoOrigem.saldo_atual_especie < valor) {
      return { error: `Saldo insuficiente no caixa da Comercialização desse atendente (disponível: R$ ${saldoOrigem.saldo_atual_especie.toFixed(2)}).` }
    }

    referenciaTransferenciaId = crypto.randomUUID()

    const { error: errSangriaComercial } = await admin
      .from('aportes_sangrias')
      .insert({
        organizacao_id: orgId,
        sessao_caixa_id: saldoOrigem.sessao_id,
        tipo: 'sangria',
        valor,
        autorizado_por,
        executado_por,
        observacoes: observacoes ?? 'Transferência para o caixa da Loja',
        origem_transferencia: 'loja',
        referencia_transferencia_id: referenciaTransferenciaId,
      } as any)
    if (errSangriaComercial) return { error: 'Erro ao debitar o caixa da Comercialização: ' + errSangriaComercial.message }
  } else if (origem && tipo === 'aporte' && origem.modulo === 'loja') {
    // Mesmo módulo: puxa de outro caixa da própria Loja (outro atendente).
    const { getSaldoResponsabilidadeLoja } = await import('@/lib/tesouraria/saldo-responsabilidade')
    const saldoOrigem = await getSaldoResponsabilidadeLoja(orgId, origem.atendente_origem_id)
    if (!saldoOrigem.caixa_id) {
      return { error: 'Esse atendente não tem caixa aberto nem fechado na Loja.' }
    }
    if (saldoOrigem.saldo_atual_especie < valor) {
      return { error: `Saldo insuficiente no caixa desse atendente (disponível: R$ ${saldoOrigem.saldo_atual_especie.toFixed(2)}).` }
    }

    referenciaTransferenciaId = crypto.randomUUID()

    const { error: errSangriaOutroCaixa } = await (admin as any)
      .from('loja_sangrias')
      .insert({
        org_id: orgId,
        caixa_id: saldoOrigem.caixa_id,
        tipo: 'sangria',
        valor,
        autorizado_por,
        executado_por,
        observacoes: observacoes ?? 'Transferência entre atendentes da Loja',
        origem_transferencia: 'loja',
        referencia_transferencia_id: referenciaTransferenciaId,
      })
    if (errSangriaOutroCaixa) return { error: 'Erro ao debitar o caixa do outro atendente: ' + errSangriaOutroCaixa.message }
  }

  const { error } = await (admin as any).from('loja_sangrias').insert({
    org_id: orgId,
    caixa_id: caixaId,
    tipo,
    valor,
    autorizado_por,
    executado_por,
    observacoes: observacoes ?? null,
    created_at: new Date().toISOString(),
    ...(referenciaTransferenciaId
      ? { origem_transferencia: origem?.modulo, referencia_transferencia_id: referenciaTransferenciaId }
      : {}),
  })

  if (error) {
    if (referenciaTransferenciaId) {
      if (origem?.modulo === 'comercializacao') {
        await admin.from('aportes_sangrias').delete().eq('referencia_transferencia_id', referenciaTransferenciaId)
      } else if (origem?.modulo === 'loja') {
        await admin.from('loja_sangrias').delete().eq('referencia_transferencia_id', referenciaTransferenciaId)
      }
    }
    return { error: 'Erro ao registrar sangria.' }
  }

  await registrarLog({ org_id: orgId, usuario_id:executado_por, modulo: 'loja', acao: 'loja_sangria', dados_depois: { tipo, valor, caixa_id: caixaId, autorizado_por } })

  return { ok: true }
}

// Lista, por usuário da org, o caixa aberto (se houver) ou o fechado mais
// recente — popula o seletor "de qual atendente" na transferência da
// Comercialização pra Loja.
export async function listarAtendentesComCaixaLoja(orgId: string) {
  const admin = createAdminClient()
  const { data: caixas } = await admin
    .from('loja_caixas')
    .select('id, usuario_id, status, usuarios!loja_caixas_usuario_id_fkey(nome_completo)')
    .eq('org_id', orgId)
    .order('aberto_em', { ascending: false })

  const porUsuario = new Map<string, { usuario_id: string; nome: string; caixa_id: string; status: 'aberto' | 'fechado' }>()
  for (const c of caixas ?? []) {
    if (porUsuario.has(c.usuario_id)) continue
    const nome = (c as any).usuarios?.nome_completo ?? '—'
    porUsuario.set(c.usuario_id, {
      usuario_id: c.usuario_id,
      nome,
      caixa_id: c.id,
      status: c.status === 'aberto' ? 'aberto' : 'fechado',
    })
  }
  return Array.from(porUsuario.values())
}

// ── 7. Fechar Caixa ──────────────────────────────────────────────────────────

export interface ResumoFechamento {
  caixa_id:             string
  aberto_em:            string
  fechado_em:           string
  valor_abertura:       number
  total_vendas:         number
  total_especie:        number
  total_pix:            number
  total_cartao_debito:  number
  total_cartao_credito: number
  total_saldo:          number
  total_sangrias:       number
  total_aportes:        number
  saldo_final_especie:  number
  qtd_vendas:           number
  vendas_pix:           { id: string; num: string; valor: number; identificador: string | null; nome_pagador: string | null }[]
}

export async function fecharCaixaLoja(
  orgId: string,
  caixaId: string,
  operadorId: string,
  forcarComoAdmin?: boolean
): Promise<{ ok: boolean; resumo: ResumoFechamento } | { error: string }> {
  const admin = createAdminClient()

  const { data: vendas } = await admin
    .from('loja_vendas')
    .select('id, total, pago_especie, pago_pix, pago_cartao, pago_saldo, tipo_cartao, pix_identificador, pix_nome_pagador, status')
    .eq('caixa_id', caixaId)
    .eq('org_id', orgId)

  const vendasConcluidas = (vendas ?? []).filter(v => v.status !== 'cancelada')
  const totalVendas = vendasConcluidas.reduce((s, v) => s + (v.total ?? 0), 0)
  const totalEspecie       = vendasConcluidas.reduce((s, v) => s + (v.pago_especie ?? 0), 0)
  const totalPix           = vendasConcluidas.reduce((s, v) => s + (v.pago_pix ?? 0), 0)
  const totalCartaoDebito  = vendasConcluidas.filter(v => v.tipo_cartao === 'debito').reduce((s, v) => s + (v.pago_cartao ?? 0), 0)
  const totalCartaoCredito = vendasConcluidas.filter(v => v.tipo_cartao === 'credito').reduce((s, v) => s + (v.pago_cartao ?? 0), 0)
  const totalSaldo         = vendasConcluidas.reduce((s, v) => s + (v.pago_saldo ?? 0), 0)
  const vendasPix          = vendasConcluidas
    .filter(v => (v.pago_pix ?? 0) > 0)
    .map(v => ({
      id:            v.id,
      num:           `V-${v.id.slice(-6).toUpperCase()}`,
      valor:         Number(v.pago_pix),
      identificador: (v as any).pix_identificador ?? null,
      nome_pagador:  (v as any).pix_nome_pagador ?? null,
    }))

  const { data: sangriasRaw } = await (admin as any)
    .from('loja_sangrias')
    .select('tipo, valor')
    .eq('caixa_id', caixaId)
    .eq('org_id', orgId)

  const sangrias = (sangriasRaw ?? []) as { tipo: string; valor: number | null }[]
  const totalSangrias = sangrias.filter(s => s.tipo === 'sangria').reduce((acc, v) => acc + (v.valor ?? 0), 0)
  const totalAportes = sangrias.filter(s => s.tipo === 'aporte').reduce((acc, v) => acc + (v.valor ?? 0), 0)

  const { data: caixaData } = await admin
    .from('loja_caixas')
    .select('valor_abertura, aberto_em')
    .eq('id', caixaId)
    .single()

  const valorAbertura = caixaData?.valor_abertura ?? 0
  const saldoFinalEspecie = valorAbertura + totalEspecie + totalAportes - totalSangrias

  const resumo: ResumoFechamento = {
    caixa_id:             caixaId,
    aberto_em:            caixaData?.aberto_em ?? new Date().toISOString(),
    fechado_em:           new Date().toISOString(),
    valor_abertura:       valorAbertura,
    total_vendas:         totalVendas,
    total_especie:        totalEspecie,
    total_pix:            totalPix,
    total_cartao_debito:  totalCartaoDebito,
    total_cartao_credito: totalCartaoCredito,
    total_saldo:          totalSaldo,
    total_sangrias:       totalSangrias,
    total_aportes:        totalAportes,
    saldo_final_especie:  saldoFinalEspecie,
    qtd_vendas:           vendasConcluidas.length,
    vendas_pix:           vendasPix,
  }

  let updateQuery = admin
    .from('loja_caixas')
    .update({
      status:              'fechado',
      fechado_em:          new Date().toISOString(),
      valor_fechamento:    totalVendas,
      total_especie:       totalEspecie,
      total_pix:           totalPix,
      total_cartao:        totalCartaoDebito + totalCartaoCredito,
      total_saldo:         totalSaldo,
      total_sangrias:      totalSangrias,
      total_aportes:       totalAportes,
      saldo_final_especie: saldoFinalEspecie,
      status_conferencia:  'aguardando',
    })
    .eq('id', caixaId)

  if (!forcarComoAdmin) {
    updateQuery = updateQuery.eq('usuario_id', operadorId)
  }

  const { error } = await updateQuery

  if (error) {
    console.error('[fecharCaixa] Supabase error:', JSON.stringify(error))
    return { error: error.message || 'Erro ao fechar caixa.' }
  }

  await registrarLog({
    org_id: orgId,
    usuario_id: operadorId,
    modulo: 'loja',
    acao: 'loja_caixa_fechado',
    dados_depois: { caixa_id: caixaId, total_vendas: totalVendas },
  })

  return { ok: true, resumo }
}

// Registro de auditoria da contagem física — chamado pelo modal de fechamento
// DEPOIS que o caixa já foi fechado (fecharCaixaLoja já calculou e persistiu
// saldo_final_especie; isso aqui só anota o que o operador contou de verdade,
// pra o admin comparar depois na conferência). Nunca recalcula nada.
export async function registrarContagemFisicaLoja(
  caixaId: string,
  dados: { valor_fisico_especie: number; valor_fisico_debito: number; valor_fisico_credito: number }
): Promise<{ ok: boolean } | { error: string }> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('loja_caixas')
    .update({
      valor_fisico_especie: dados.valor_fisico_especie,
      valor_fisico_debito: dados.valor_fisico_debito,
      valor_fisico_credito: dados.valor_fisico_credito,
    })
    .eq('id', caixaId)
  if (error) return { error: error.message }
  return { ok: true }
}

// ── 8. Conferir Caixa ────────────────────────────────────────────────────────

export async function conferirCaixa(
  orgId: string,
  caixaId: string,
  conferidoPor: string,
  dados: {
    status_conferencia: 'conferido' | 'divergente'
    valor_fisico_especie: number
    valor_fisico_debito: number
    valor_fisico_credito: number
    observacao_conferencia?: string
  }
): Promise<{ ok: boolean } | { error: string }> {
  const admin = createAdminClient()

  const { data: caixa } = await admin
    .from('loja_caixas')
    .select('org_id, status, status_conferencia')
    .eq('id', caixaId)
    .single()

  if (!caixa) return { error: 'Caixa não encontrado.' }
  if ((caixa as any).org_id !== orgId) return { error: 'Sem permissão.' }
  if ((caixa as any).status !== 'fechado') return { error: 'Caixa ainda não foi fechado.' }

  const { error } = await admin
    .from('loja_caixas')
    .update({
      status_conferencia:     dados.status_conferencia,
      valor_fisico_especie:   dados.valor_fisico_especie,
      valor_fisico_debito:    dados.valor_fisico_debito,
      valor_fisico_credito:   dados.valor_fisico_credito,
      observacao_conferencia: dados.observacao_conferencia ?? null,
      conferido_por:          conferidoPor,
      conferido_em:           new Date().toISOString(),
    })
    .eq('id', caixaId)

  if (error) return { error: error.message }

  await registrarLog({
    org_id: orgId,
    usuario_id: conferidoPor,
    modulo: 'loja',
    acao: 'loja_caixa_conferido',
    dados_depois: { caixa_id: caixaId, status: dados.status_conferencia },
  })

  return { ok: true }
}

// ── Cancelar Compra ──────────────────────────────────────────────────────────

export async function cancelarCompra(
  orgId: string,
  compraId: string,
  operadorId: string
): Promise<{ ok: boolean } | { error: string }> {
  const admin = createAdminClient()

  const { data: compra } = await admin
    .from('loja_compras')
    .select('id, org_id, observacoes, numero_nf')
    .eq('id', compraId)
    .single()

  if (!compra) return { error: 'Compra não encontrada.' }
  if ((compra as any).org_id !== orgId) return { error: 'Sem permissão.' }
  if (((compra as any).observacoes ?? '').startsWith('[CANCELADA')) return { error: 'Esta compra já foi cancelada.' }

  const { data: itens } = await admin
    .from('loja_compra_itens')
    .select('produto_id, quantidade, numero_lote')
    .eq('compra_id', compraId)

  if (!itens || itens.length === 0) return { error: 'Itens da compra não encontrados.' }

  for (const item of itens as any[]) {
    let loteQuery = admin
      .from('loja_lotes')
      .select('id, quantidade_atual')
      .eq('org_id', orgId)
      .eq('produto_id', item.produto_id)
      .order('criado_em', { ascending: false })

    if (item.numero_lote) {
      loteQuery = loteQuery.eq('numero_lote', item.numero_lote)
    }

    const { data: lotes } = await loteQuery.limit(1)
    const lote = lotes?.[0]

    if (lote) {
      const novaQtd = Math.max(0, (lote as any).quantidade_atual - item.quantidade)
      await admin.from('loja_lotes').update({ quantidade_atual: novaQtd }).eq('id', (lote as any).id)
    }

    await admin.from('loja_estoque_movimentos').insert({
      org_id: orgId,
      produto_id: item.produto_id,
      tipo: 'saida_manual',
      quantidade: item.quantidade,
      motivo: `cancelamento de compra${(compra as any).numero_nf ? ' NF ' + (compra as any).numero_nf : ''}`,
      referencia_id: compraId,
    })

    const { data: prod } = await admin
      .from('loja_produtos')
      .select('estoque_atual')
      .eq('id', item.produto_id)
      .eq('org_id', orgId)
      .single()

    if (prod) {
      await admin
        .from('loja_produtos')
        .update({ estoque_atual: Math.max(0, (prod as any).estoque_atual - item.quantidade) })
        .eq('id', item.produto_id)
        .eq('org_id', orgId)
    }
  }

  const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  const obsAnterior = (compra as any).observacoes ? ` | ${(compra as any).observacoes}` : ''
  await admin
    .from('loja_compras')
    .update({ observacoes: `[CANCELADA em ${agora}]${obsAnterior}` })
    .eq('id', compraId)

  await registrarLog({
    org_id: orgId,
    usuario_id: operadorId,
    modulo: 'loja',
    acao: 'loja_compra_cancelada',
    dados_depois: { compra_id: compraId },
  })

  revalidatePath('/loja/compras')
  revalidatePath(`/loja/compras/${compraId}`)
  revalidatePath('/loja/estoque')

  return { ok: true }
}
