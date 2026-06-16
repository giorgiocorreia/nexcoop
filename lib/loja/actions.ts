'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { traduzirErro } from '@/lib/utils/erros'
import { createAdminClient } from '@/lib/supabase/admin'
import { orgTemModulo, podeGerenciarLoja } from '@/lib/permissoes'
import type { LojaFornecedor, LojaProduto, LojaLote, LojaCompra, LojaTipoMovimento } from '@/types/database'

async function getCtx() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('id, organizacao_id')
    .eq('id', user.id)
    .single()
  if (!usuario?.organizacao_id) throw new Error('Usuário sem organização')
  return { supabase, usuarioId: user.id, orgId: usuario.organizacao_id as string }
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
  dados: Pick<LojaProduto, 'nome' | 'categoria' | 'unidade' | 'preco_normal' | 'desconto_cooperado' | 'desconto_cooperado_pct' | 'estoque_minimo' | 'fornecedor_id'>
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
  dados: Partial<Pick<LojaProduto, 'nome' | 'categoria' | 'unidade' | 'preco_normal' | 'desconto_cooperado' | 'desconto_cooperado_pct' | 'estoque_minimo' | 'fornecedor_id' | 'ativo'>>
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

async function verificarPermissaoGerente(supabase: Awaited<ReturnType<typeof createClient>>, usuarioId: string) {
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

    revalidatePath('/loja/compras')
    revalidatePath('/loja/estoque')
    revalidatePath('/loja')
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
  usuarioId: string,
  valorAbertura: number
): Promise<{ caixaId: string } | { error: string }> {
  const admin = createAdminClient()

  const { data: aberto } = await admin
    .from('loja_caixas')
    .select('id')
    .eq('org_id', orgId)
    .eq('status', 'aberto')
    .maybeSingle()

  if (aberto) return { error: 'Já existe um caixa aberto para esta organização.' }

  const { data, error } = await admin
    .from('loja_caixas')
    .insert({ org_id: orgId, usuario_id: usuarioId, valor_abertura: valorAbertura, status: 'aberto', aberto_em: new Date().toISOString() })
    .select('id')
    .single()

  if (error || !data) return { error: 'Erro ao abrir caixa.' }

  await registrarLog({ org_id: orgId, usuario_id: usuarioId, modulo: 'loja', acao: 'loja_caixa_aberto', dados_depois: { caixa_id: data.id, valor_abertura: valorAbertura } })

  return { caixaId: data.id }
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

  console.log('[buscarCooperadoPorCPF] cpfLimpo:', cpfLimpo, 'data:', data, 'error:', error)

  if (!data) return null

  // Busca saldo via produtor vinculado ao cooperado
  let saldoFinanceiro = 0
  if (temComercializacao) {
    const { data: produtor } = await admin
      .from('produtores')
      .select('id, contas_produtor(saldo_financeiro)')
      .eq('cooperado_id', data.id)
      .eq('organizacao_id', orgId)
      .maybeSingle()

    const conta = Array.isArray((produtor as any)?.contas_produtor)
      ? (produtor as any).contas_produtor[0]
      : (produtor as any)?.contas_produtor
    saldoFinanceiro = conta?.saldo_financeiro ?? 0
  }

  return {
    cooperado_id: data.id as string,
    produtor_id: data.id as string,
    nome: data.nome_completo as string,
    saldo_financeiro: saldoFinanceiro,
    tem_conta_corrente: temComercializacao,
  }
}

// ── 3. Validar Senha do Autorizador ─────────────────────────────────────────

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
    pago_conta?: number
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
      pago_especie: venda.pago_especie,
      pago_pix: venda.pago_pix,
      pago_cartao: 0,
      pago_saldo: venda.pago_conta ?? 0,
    })
    .select('id')
    .single()

  if (errVenda) console.error('[finalizarVenda] erro insert loja_vendas:', errVenda)

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
      .select('id, saldo_financeiro')
      .eq('organizacao_id', orgId)
      .eq('produtor_id', produtor?.id ?? '')
      .maybeSingle()

    if (contaData) {
      const novoSaldo = contaData.saldo_financeiro - (venda.pago_conta ?? 0)
      await admin.from('movimentacoes_conta').insert({
        organizacao_id: orgId,
        conta_id: contaData.id,
        tipo: 'compra_loja',
        valor: -(venda.pago_conta ?? 0),
        saldo_apos: novoSaldo,
        descricao: `Compra na Loja — Venda #${vendaId.slice(-6).toUpperCase()}`,
        criado_em: new Date().toISOString(),
      })
      await admin.from('contas_produtor').update({ saldo_financeiro: novoSaldo }).eq('id', contaData.id)
    }
  }

  await registrarLog({ org_id: orgId, usuario_id:operadorId, modulo: 'loja', acao: 'loja_venda_finalizada', dados_depois: { venda_id: vendaId, total: venda.total } })

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
    .select('id, conta_id, valor')
    .eq('referencia_id', vendaId)
    .eq('tipo', 'compra_loja')
    .maybeSingle()

  if (movConta) {
    const { data: conta } = await admin.from('contas_produtor').select('saldo_financeiro').eq('id', movConta.conta_id).single()
    if (conta) {
      const novoSaldo = conta.saldo_financeiro + Math.abs(movConta.valor as number)
      await admin.from('movimentacoes_conta').insert({
        organizacao_id: orgId,
        conta_id: movConta.conta_id,
        tipo: 'estorno' as const,
        valor: Math.abs(movConta.valor as number),
        saldo_apos: novoSaldo,
        descricao: `Estorno — Venda cancelada #${vendaId.slice(-6).toUpperCase()}`,
        criado_em: new Date().toISOString(),
      })
      await admin.from('contas_produtor').update({ saldo_financeiro: novoSaldo }).eq('id', movConta.conta_id)
    }
  }

  await admin.from('loja_vendas').update({ status: 'cancelada' }).eq('id', vendaId)
  await registrarLog({ org_id: orgId, usuario_id:operadorId, modulo: 'loja', acao: 'loja_venda_cancelada', dados_depois: { venda_id: vendaId } })

  return { ok: true }
}

// ── 6. Registrar Sangria ─────────────────────────────────────────────────────

export async function registrarSangriaLoja(
  orgId: string,
  caixaId: string,
  tipo: 'aporte' | 'sangria',
  valor: number,
  autorizado_por: string,
  executado_por: string,
  observacoes?: string
): Promise<{ ok: boolean } | { error: string }> {
  const admin = createAdminClient()

  const { error } = await (admin as any).from('loja_sangrias').insert({
    org_id: orgId,
    caixa_id: caixaId,
    tipo,
    valor,
    autorizado_por,
    executado_por,
    observacoes: observacoes ?? null,
    created_at: new Date().toISOString(),
  })

  if (error) return { error: 'Erro ao registrar sangria.' }

  await registrarLog({ org_id: orgId, usuario_id:executado_por, modulo: 'loja', acao: 'loja_sangria', dados_depois: { tipo, valor, caixa_id: caixaId, autorizado_por } })

  return { ok: true }
}

// ── 7. Fechar Caixa ──────────────────────────────────────────────────────────

export interface ResumoFechamento {
  caixa_id: string
  aberto_em: string
  fechado_em: string
  valor_abertura: number
  total_vendas: number
  total_especie: number
  total_pix: number
  total_sangrias: number
  total_aportes: number
  saldo_final_especie: number
  qtd_vendas: number
}

export async function fecharCaixaLoja(
  orgId: string,
  caixaId: string,
  operadorId: string
): Promise<{ ok: boolean; resumo: ResumoFechamento } | { error: string }> {
  const admin = createAdminClient()

  const { data: vendas } = await admin
    .from('loja_vendas')
    .select('total, pago_especie, pago_pix, status')
    .eq('caixa_id', caixaId)
    .eq('org_id', orgId)

  const vendasConcluidas = (vendas ?? []).filter(v => v.status !== 'cancelada')
  const totalVendas = vendasConcluidas.reduce((s, v) => s + (v.total ?? 0), 0)
  const totalEspecie = vendasConcluidas.reduce((s, v) => s + (v.pago_especie ?? 0), 0)
  const totalPix = vendasConcluidas.reduce((s, v) => s + (v.pago_pix ?? 0), 0)

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
    caixa_id: caixaId,
    aberto_em: caixaData?.aberto_em ?? new Date().toISOString(),
    fechado_em: new Date().toISOString(),
    valor_abertura: valorAbertura,
    total_vendas: totalVendas,
    total_especie: totalEspecie,
    total_pix: totalPix,
    total_sangrias: totalSangrias,
    total_aportes: totalAportes,
    saldo_final_especie: saldoFinalEspecie,
    qtd_vendas: vendasConcluidas.length,
  }

  const { error } = await admin
    .from('loja_caixas')
    .update({
      status: 'fechado',
      fechado_em: resumo.fechado_em,
      valor_fechamento: totalVendas,
      total_especie: totalEspecie,
      total_pix: totalPix,
    })
    .eq('id', caixaId)

  if (error) return { error: 'Erro ao fechar caixa.' }

  await registrarLog({
    org_id: orgId,
    usuario_id: operadorId,
    modulo: 'loja',
    acao: 'loja_caixa_fechado',
    dados_depois: { caixa_id: caixaId, total_vendas: totalVendas },
  })

  return { ok: true, resumo }
}
