'use server'

// Server actions do painel super_admin para gerenciar módulos ativos e cor da
// marca de uma org existente. Regra 2 do CLAUDE.md: write org-level sempre
// via createAdminClient(), nunca update direto pelo browser client (foi a
// causa do bug do onboarding — ver commits recentes de app/(sistema)/admin).
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUsuarioLogado } from '@/lib/auth'
import { MODULOS_OPCIONAIS, MODULOS } from '@/lib/modulos'

interface Resultado { ok: boolean; erro?: string }

const IDS_BASE = MODULOS.filter(m => m.base).map(m => m.id)

async function exigirSuperAdmin(): Promise<Resultado | null> {
  const usuario = await getUsuarioLogado()
  if (usuario.role !== 'super_admin') {
    return { ok: false, erro: 'Apenas o super admin pode alterar esta configuração.' }
  }
  return null
}

// Atualiza a lista de módulos ativos de uma org: base sempre incluído,
// opcionais conforme os IDs marcados no painel.
export async function atualizarModulosOrg(orgId: string, modulosOpcionaisAtivos: string[]): Promise<Resultado> {
  const negado = await exigirSuperAdmin()
  if (negado) return negado

  const idsValidos = new Set(MODULOS_OPCIONAIS.map(m => m.id))
  const opcionais = modulosOpcionaisAtivos.filter(id => idsValidos.has(id))
  const modulos_ativos = [...new Set([...IDS_BASE, ...opcionais])]

  const admin = createAdminClient()
  const { error } = await admin
    .from('organizacoes')
    .update({ modulos_ativos })
    .eq('id', orgId)

  if (error) return { ok: false, erro: error.message }

  // A Sidebar/middleware leem modulos_ativos a partir da org carregada no
  // layout raiz — sem revalidar o layout inteiro, a mudança só aparece após
  // um reload manual em algumas rotas.
  revalidatePath('/', 'layout')
  return { ok: true }
}

// Atualiza a cor da marca da org. cor=null volta a usar o padrão do tipo
// (ver lib/tema.ts).
export async function atualizarCorOrg(orgId: string, cor: string | null): Promise<Resultado> {
  const negado = await exigirSuperAdmin()
  if (negado) return negado

  const admin = createAdminClient()
  const { error } = await admin
    .from('organizacoes')
    .update({ cor_primaria: cor })
    .eq('id', orgId)

  if (error) return { ok: false, erro: error.message }

  // A cor vive nas CSS vars injetadas no layout raiz — precisa revalidar o
  // layout, não só a página de detalhe da org.
  revalidatePath('/', 'layout')
  return { ok: true }
}
