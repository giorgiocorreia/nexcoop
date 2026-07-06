'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getUsuarioLogado } from '@/lib/auth'

export async function listarSessoesFechadas(mes?: number, ano?: number) {
  const usuario = await getUsuarioLogado()
  const supabase = createAdminClient()

  let query = supabase
    .from('sessoes_caixa')
    .select(`
      id, data, hora_abertura, hora_fechamento,
      saldo_inicial_especie, saldo_final_especie,
      saldo_especie_calculado,
      total_saidas_especie, total_pix,
      total_entradas_pix, total_entradas_cartao,
      observacoes_fechamento, status,
      usuarios(id, nome_completo)
    `)
    .eq('organizacao_id', usuario.organizacao_id as string)
    .eq('status', 'fechada')
    .order('data', { ascending: false })
    .order('hora_abertura', { ascending: false })

  if (mes && ano) {
    const dataInicio = `${ano}-${String(mes).padStart(2, '0')}-01`
    const dataFim = new Date(ano, mes, 0).toISOString().split('T')[0]
    query = query.gte('data', dataInicio).lte('data', dataFim)
  } else if (ano) {
    query = query.gte('data', `${ano}-01-01`).lte('data', `${ano}-12-31`)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}

export async function getDetalheSessao(sessao_id: string) {
  const usuario = await getUsuarioLogado()
  const supabase = createAdminClient()

  // Sessão + operador
  const { data: sessao, error: eSessao } = await supabase
    .from('sessoes_caixa')
    .select(`
      id, data, hora_abertura, hora_fechamento,
      saldo_inicial_especie, saldo_final_especie,
      saldo_especie_calculado, total_saidas_especie, total_pix,
      total_entradas_pix, total_entradas_cartao,
      snapshot_estoque, observacoes_fechamento,
      usuarios(id, nome_completo)
    `)
    .eq('id', sessao_id)
    .eq('organizacao_id', usuario.organizacao_id as string)
    .single()
  if (eSessao) throw new Error(eSessao.message)

  // Movimentações da sessão
  const { data: movimentacoes, error: eMov } = await supabase
    .from('movimentacoes_conta')
    .select(`
      id, tipo, quantidade_produto, valor_financeiro,
      forma_pagamento, observacoes, created_at,
      produtos(nome, unidade),
      contas_produtor(produtor_id, produtores(nome))
    `)
    .eq('sessao_caixa_id', sessao_id)
    .order('created_at', { ascending: true })
  if (eMov) throw new Error(eMov.message)

  // Aportes e sangrias
  const { data: aportes, error: eAportes } = await supabase
    .from('aportes_sangrias')
    .select(`
      id, tipo, valor, forma_pagamento, origem, observacoes, created_at,
      autorizador:autorizado_por(nome_completo),
      executor:executado_por(nome_completo)
    `)
    .eq('sessao_caixa_id', sessao_id)
    .order('created_at', { ascending: true })
  if (eAportes) throw new Error(eAportes.message)

  // Totais por produto
  const totaisPorProduto: Record<string, { nome: string; unidade: string; total_kg: number; produtores: Set<string> }> = {}
  for (const m of (movimentacoes ?? [])) {
    if (m.tipo === 'entrega' && m.quantidade_produto && (m as any).produtos) {
      const pid = (m as any).produtos.nome
      if (!totaisPorProduto[pid]) {
        totaisPorProduto[pid] = {
          nome: (m as any).produtos.nome,
          unidade: (m as any).produtos.unidade,
          total_kg: 0,
          produtores: new Set()
        }
      }
      totaisPorProduto[pid].total_kg += m.quantidade_produto
      const nomeProdutor = (m as any).contas_produtor?.produtores?.nome
      if (nomeProdutor) totaisPorProduto[pid].produtores.add(nomeProdutor)
    }
  }

  // Saídas avulsas — lancamentos vinculados a esta sessão (migration 057)
  const { data: saidasRaw, error: eSaidas } = await supabase
    .from('lancamentos')
    .select('id, descricao, valor, data_competencia, observacoes, criado_em, categoria_id')
    .eq('sessao_caixa_id', sessao_id)
    .order('criado_em', { ascending: true })
  if (eSaidas) throw new Error(eSaidas.message)

  // Resolver nomes das categorias (tabela não tipada — usa cast)
  const categoriaIds = [...new Set((saidasRaw ?? []).map((s: any) => s.categoria_id).filter(Boolean))] as string[]
  const categoriaMap: Record<string, { nome: string; grupo: string | null }> = {}
  if (categoriaIds.length > 0) {
    const { data: cats } = await (supabase as any)
      .from('financeiro_categorias')
      .select('id, nome, grupo')
      .in('id', categoriaIds)
    if (cats) {
      for (const c of cats as any[]) categoriaMap[c.id] = { nome: c.nome, grupo: c.grupo ?? null }
    }
  }

  const saidasAvulsas = (saidasRaw ?? []).map((s: any) => ({
    id: s.id as string,
    descricao: s.descricao as string,
    valor: s.valor as number,
    data_competencia: s.data_competencia as string,
    observacoes: s.observacoes as string | null,
    criado_em: s.criado_em as string,
    categoria: s.categoria_id ? (categoriaMap[s.categoria_id] ?? null) : null as { nome: string; grupo: string | null } | null,
  }))

  return {
    sessao,
    movimentacoes: movimentacoes ?? [],
    aportes: aportes ?? [],
    totaisPorProduto: Object.values(totaisPorProduto).map(t => ({
      nome: t.nome,
      unidade: t.unidade,
      total_kg: t.total_kg,
      num_produtores: t.produtores.size
    })),
    saidasAvulsas,
  }
}

export async function listarOperadoresCaixa() {
  const usuario = await getUsuarioLogado()
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('usuarios')
    .select('id, nome_completo')
    .eq('organizacao_id', usuario.organizacao_id as string)
    .eq('ativo', true)
    .or('funcoes.cs.{admin},funcoes.cs.{caixa_cacau},funcoes.cs.{diario_caixa}')
    .order('nome_completo')
  if (error) throw new Error(error.message)
  return data
}