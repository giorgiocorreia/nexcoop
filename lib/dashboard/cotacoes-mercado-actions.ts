'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getUsuarioLogado } from '@/lib/auth'
import { registrarCotacao } from '@/lib/comercializacao/cotacoes.actions'
import type { CotacaoMercadoExterno, ConfigPrecosSugeridos } from '@/types/database'

export async function getCotacaoMercadoAtual(): Promise<{
  cepea: CotacaoMercadoExterno | null
  iceNy: CotacaoMercadoExterno | null
}> {
  const supabase = createAdminClient()
  const [{ data: cepea }, { data: iceNy }] = await Promise.all([
    supabase
      .from('cotacoes_mercado_externo')
      .select('*')
      .eq('produto', 'cacau')
      .eq('fonte', 'cepea')
      .order('data_referencia', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('cotacoes_mercado_externo')
      .select('*')
      .eq('produto', 'cacau')
      .eq('fonte', 'ice_ny')
      .order('data_referencia', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])
  return {
    cepea: cepea as CotacaoMercadoExterno | null,
    iceNy: iceNy as CotacaoMercadoExterno | null,
  }
}

export async function getTendencia7dias(): Promise<CotacaoMercadoExterno[]> {
  const supabase = createAdminClient()
  const dataLimite = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]
  const { data } = await supabase
    .from('cotacoes_mercado_externo')
    .select('*')
    .eq('produto', 'cacau')
    .gte('data_referencia', dataLimite)
    .order('data_referencia', { ascending: true })
  return (data ?? []) as CotacaoMercadoExterno[]
}

export async function getConfigPrecosSugeridos(): Promise<
  (ConfigPrecosSugeridos & { produto: { id: string; nome: string } }) | null
> {
  const usuario = await getUsuarioLogado()
  const orgId = usuario.organizacao_id
  if (!orgId) return null

  const supabase = createAdminClient()

  const { data: config } = await supabase
    .from('config_precos_sugeridos')
    .select('*, produto:produto_id(id, nome)')
    .eq('organizacao_id', orgId)
    .eq('ativo', true)
    .limit(1)
    .maybeSingle()

  if (config) {
    return config as unknown as ConfigPrecosSugeridos & { produto: { id: string; nome: string } }
  }

  // Nenhuma config: tenta detectar produto de cacau automaticamente
  const { data: produto } = await supabase
    .from('produtos')
    .select('id, nome')
    .eq('organizacao_id', orgId)
    .ilike('nome', '%cacau%')
    .eq('ativo', true)
    .limit(1)
    .maybeSingle()

  if (!produto) return null

  return {
    id: '',
    organizacao_id: orgId,
    produto_id: produto.id,
    percentual_cooperado: 95,
    percentual_externo: 90,
    ativo: true,
    updated_at: new Date().toISOString(),
    produto: { id: produto.id, nome: produto.nome },
  }
}

export async function salvarConfigPrecosSugeridos(params: {
  produto_id: string
  percentual_cooperado: number
  percentual_externo: number
}) {
  const usuario = await getUsuarioLogado()
  const orgId = usuario.organizacao_id
  if (!orgId) throw new Error('Organização não encontrada')

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('config_precos_sugeridos')
    .upsert(
      {
        organizacao_id: orgId,
        produto_id: params.produto_id,
        percentual_cooperado: params.percentual_cooperado,
        percentual_externo: params.percentual_externo,
        ativo: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'organizacao_id,produto_id' }
    )
  if (error) throw new Error(error.message)
}

export async function aplicarCotacaoSugerida(params: {
  produto_id: string
  preco_cooperado: number
  preco_externo: number
}) {
  await registrarCotacao({
    produto_id: params.produto_id,
    vigente_a_partir_de: new Date().toISOString(),
    preco_cooperado: params.preco_cooperado,
    preco_externo: params.preco_externo,
    observacoes: 'Aplicado pelo card de cotação do mercado',
  })
}