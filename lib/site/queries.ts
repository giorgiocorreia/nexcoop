// Consultas server-side do módulo Site (público). Sempre createAdminClient —
// regra 2 do CLAUDE.md: as páginas públicas do site são servidas pro
// visitante anônimo, não passam pelo cliente auth do navegador. Nunca
// importar isto num client component. (Sem pacote "server-only" — não é
// dependência do projeto; createAdminClient já usa a service_role key, que
// só existe em runtime de servidor.)

import { createAdminClient } from '@/lib/supabase/admin'
import type { SiteConfig, SiteConteudo, Organizacao } from '@/types/database'

export async function buscarSiteConfigPorSlug(slug: string): Promise<SiteConfig | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('site_config')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()
  return (data as SiteConfig | null) ?? null
}

export async function buscarOrganizacao(orgId: string): Promise<Organizacao | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('organizacoes')
    .select('*')
    .eq('id', orgId)
    .maybeSingle()
  return (data as Organizacao | null) ?? null
}

export interface CotacaoVitrine {
  produto_id:          string
  produto_nome:        string
  unidade:             string
  preco_cooperado:     number
  preco_externo:       number
  vigente_a_partir_de: string
}

// Cotação ativa por produto da org (uma linha por produto, a mais recente
// vigente). Segue o padrão documentado em docs/SCHEMA.md:
// vigente_a_partir_de <= now() ORDER BY vigente_a_partir_de DESC.
export async function buscarCotacoesVitrine(orgId: string): Promise<CotacaoVitrine[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('cotacoes')
    .select('produto_id, preco_cooperado, preco_externo, vigente_a_partir_de, produtos(nome, unidade)')
    .eq('organizacao_id', orgId)
    .lte('vigente_a_partir_de', new Date().toISOString())
    .order('vigente_a_partir_de', { ascending: false })
    .limit(50)
  if (error || !data) return []

  // Uma cotação por produto — a primeira ocorrência já é a mais recente
  // porque a query veio ordenada DESC.
  const vistos = new Set<string>()
  const resultado: CotacaoVitrine[] = []
  for (const linha of data as unknown as Array<{
    produto_id: string
    preco_cooperado: number
    preco_externo: number
    vigente_a_partir_de: string
    produtos: { nome: string; unidade: string } | null
  }>) {
    if (vistos.has(linha.produto_id)) continue
    vistos.add(linha.produto_id)
    resultado.push({
      produto_id:          linha.produto_id,
      produto_nome:        linha.produtos?.nome ?? 'Produto',
      unidade:             linha.produtos?.unidade ?? 'un',
      preco_cooperado:     linha.preco_cooperado,
      preco_externo:       linha.preco_externo,
      vigente_a_partir_de: linha.vigente_a_partir_de,
    })
  }
  return resultado
}

export interface ProdutoVitrine {
  id:                     string
  nome:                   string
  categoria:              string | null
  unidade:                string
  preco_normal:           number
  desconto_cooperado:     boolean
  desconto_cooperado_pct: number | null
}

// Produtos ativos da Loja — substitui o loja.php do site antigo (que lia de
// um MySQL próprio com cadastro duplicado).
export async function buscarProdutosLojaVitrine(orgId: string): Promise<ProdutoVitrine[]> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('loja_produtos')
    .select('id, nome, categoria, unidade, preco_normal, desconto_cooperado, desconto_cooperado_pct, ativo')
    .eq('org_id', orgId)
    .eq('ativo', true)
    .order('nome')
    .limit(24)
  return (data as unknown as ProdutoVitrine[] | null) ?? []
}

export async function buscarConteudosPorTipo(
  orgId: string,
  tipo: SiteConteudo['tipo']
): Promise<SiteConteudo[]> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('site_conteudos')
    .select('*')
    .eq('organizacao_id', orgId)
    .eq('tipo', tipo)
    .eq('ativo', true)
    .order('ordem', { ascending: true })
  return (data as SiteConteudo[] | null) ?? []
}
