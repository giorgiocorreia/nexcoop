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
      id, tipo, valor, observacoes, created_at,
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

  return {
    sessao,
    movimentacoes: movimentacoes ?? [],
    aportes: aportes ?? [],
    totaisPorProduto: Object.values(totaisPorProduto).map(t => ({
      nome: t.nome,
      unidade: t.unidade,
      total_kg: t.total_kg,
      num_produtores: t.produtores.size
    }))
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