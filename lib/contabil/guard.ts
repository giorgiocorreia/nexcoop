/**
 * Guarda de acesso do módulo Contábil.
 *
 * PROBLEMA QUE ISTO RESOLVE
 * As actions de `lib/contabil/actions.ts` são `'use server'` — ou seja,
 * endpoints HTTP públicos — e recebiam `orgId` como parâmetro vindo da UI,
 * usando `createAdminClient()` (RLS desligada) sem checar nada. A validação
 * feita nas pages (`getOrgContext`) protegia apenas o render: bastava trocar
 * o UUID no POST para ler ou escrever a contabilidade de outra organização.
 *
 * REGRA
 * O `orgId` recebido da UI é ALEGAÇÃO, nunca verdade. Aqui a org é
 * re-derivada do request (sessão / cookie de parceiro, via `getOrgContext`,
 * que revalida o vínculo no banco a cada request) e o valor alegado é
 * apenas conferido contra ela.
 *
 * NOTA — `modulos_ativos` deliberadamente NÃO é checado
 * Hoje nenhuma organização tem 'contabil' em `organizacoes.modulos_ativos`
 * (COOPAIBI = ['loja'], ANPC = ['cooperados','financeiro',...]), embora as
 * duas usem o módulo e a Contabahia tenha `modulos_acesso = ['contabil',...]`.
 * Ligar a checagem aqui derrubaria o contábil das duas orgs no deploy.
 * Corrigir o dado é decisão de produto — item separado, ver PLANO_CONTABIL.md.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/supabase/impersonation'
import { registrarLog } from '@/lib/audit/logger'
import type { Database } from '@/types/database'

type TabelaPublica = keyof Database['public']['Tables']

export interface CtxContabil {
  /** Admin client (RLS off) — legítimo porque o orgId abaixo já foi provado. */
  supabase: ReturnType<typeof createAdminClient>
  /** Org REAL do request. Use este, nunca o parâmetro vindo da UI. */
  orgId: string
  usuarioId: string
  /** Contador de escritório entrando via cookie `parceiro_org_id`. */
  isParceiro: boolean
  /** Só para parceiro — `modulos_acesso` revalidado neste request. */
  modulosPermitidos: string[]
  /** Pode escriturar/fechar. Falso para conselho fiscal (leitura). */
  podeEscrever: boolean
}

/** Funções com poder de escrita no contábil. */
const FUNCOES_ESCRITA = ['admin', 'contador', 'contador_aux']
/**
 * Somente leitura. Conselho fiscal tem atribuição legal de examinar livros e
 * balancetes (Lei 5.764/71, art. 56) — vê demonstrações, não escritura.
 */
const FUNCOES_LEITURA = [...FUNCOES_ESCRITA, 'conselho_fiscal']

class ContabilForbidden extends Error {
  constructor(msg: string) {
    super(msg)
    this.name = 'ContabilForbidden'
  }
}

async function resolver(orgIdAlegado?: string): Promise<CtxContabil> {
  const ctx = await getOrgContext()
  if (!ctx) throw new ContabilForbidden('Não autenticado.')

  // Divergência entre o que a UI mandou e a org real do request é sinal de
  // manipulação — auditar antes de recusar.
  if (orgIdAlegado && orgIdAlegado !== ctx.orgId) {
    registrarLog({
      org_id: ctx.orgId,
      usuario_id: ctx.usuarioId,
      acao: 'acesso_negado',
      modulo: 'contabil',
      descricao: 'orgId divergente do contexto do request',
      dados_depois: { org_alegada: orgIdAlegado, org_real: ctx.orgId },
    }).catch(e => console.error('[audit]', e))
    throw new ContabilForbidden('Organização inválida para este usuário.')
  }

  const admin = createAdminClient()
  const modulos = ctx.modulosPermitidos ?? []
  const isParceiro = modulos.length > 0

  // Parceiro não tem linha em `usuarios`; a autorização dele é o vínculo
  // já revalidado por getOrgContext (que exige 'contabil' em modulos_acesso).
  if (isParceiro) {
    return {
      supabase: admin,
      orgId: ctx.orgId,
      usuarioId: ctx.usuarioId,
      isParceiro: true,
      modulosPermitidos: modulos,
      podeEscrever: true,
    }
  }

  const { data: usuario } = await admin
    .from('usuarios')
    .select('role, funcoes, ativo')
    .eq('id', ctx.usuarioId)
    .maybeSingle()

  // super_admin (inclusive em impersonation) passa sempre.
  const isSuper = usuario?.role === 'super_admin' || ctx.isImpersonating
  const funcoes: string[] = Array.isArray(usuario?.funcoes) ? usuario!.funcoes : []

  if (!isSuper && usuario?.ativo === false) {
    throw new ContabilForbidden('Usuário inativo.')
  }
  if (!isSuper && !funcoes.some(f => FUNCOES_LEITURA.includes(f))) {
    throw new ContabilForbidden('Sem permissão para o módulo contábil.')
  }

  return {
    supabase: admin,
    orgId: ctx.orgId,
    usuarioId: ctx.usuarioId,
    isParceiro: false,
    modulosPermitidos: modulos,
    podeEscrever: isSuper || funcoes.some(f => FUNCOES_ESCRITA.includes(f)),
  }
}

/** Leitura do contábil (relatórios, consultas). */
export async function requireContabil(orgIdAlegado?: string): Promise<CtxContabil> {
  return resolver(orgIdAlegado)
}

/** Escrita (escriturar, classificar, fechar exercício, importar). */
export async function requireContabilEscrita(orgIdAlegado?: string): Promise<CtxContabil> {
  const ctx = await resolver(orgIdAlegado)
  if (!ctx.podeEscrever) {
    registrarLog({
      org_id: ctx.orgId,
      usuario_id: ctx.usuarioId,
      acao: 'acesso_negado',
      modulo: 'contabil',
      descricao: 'tentativa de escrita sem permissão (somente leitura)',
    }).catch(e => console.error('[audit]', e))
    throw new ContabilForbidden('Seu perfil tem acesso somente leitura ao contábil.')
  }
  return ctx
}

/**
 * `extrato_itens` é a única tabela do contábil sem coluna de organização —
 * o vínculo é indireto, via `extratos_bancarios.org_id`.
 */
export async function assertItemExtratoDaOrg(ctx: CtxContabil, itemId: string): Promise<void> {
  if (!itemId) throw new ContabilForbidden('Registro inválido.')

  const { data, error } = await ctx.supabase
    .from('extrato_itens')
    .select('id, extrato:extrato_id(org_id)')
    .eq('id', itemId)
    .maybeSingle()

  if (error) throw new Error(error.message)

  const orgDaLinha = (data as any)?.extrato?.org_id
  if (!data || orgDaLinha !== ctx.orgId) {
    registrarLog({
      org_id: ctx.orgId,
      usuario_id: ctx.usuarioId,
      acao: 'acesso_negado',
      modulo: 'contabil',
      descricao: 'item de extrato de outra organização',
      dados_depois: { item_id: itemId, org_da_linha: orgDaLinha ?? null },
    }).catch(e => console.error('[audit]', e))
    throw new ContabilForbidden('Registro não pertence à sua organização.')
  }
}

/**
 * Para actions que recebem só o id de uma linha (sem orgId): confere que a
 * linha pertence à org do request antes de escrever nela.
 */
export async function assertLinhaDaOrg(
  ctx: CtxContabil,
  tabela: TabelaPublica,
  id: string,
  colunaOrg = 'org_id',
): Promise<void> {
  if (!id) throw new ContabilForbidden('Registro inválido.')

  const { data, error } = await ctx.supabase
    .from(tabela)
    .select(colunaOrg)
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(error.message)

  const orgDaLinha = (data as Record<string, unknown> | null)?.[colunaOrg]
  if (!data || orgDaLinha !== ctx.orgId) {
    registrarLog({
      org_id: ctx.orgId,
      usuario_id: ctx.usuarioId,
      acao: 'acesso_negado',
      modulo: 'contabil',
      descricao: `registro de outra organização (${tabela})`,
      dados_depois: { tabela, id, org_da_linha: orgDaLinha ?? null },
    }).catch(e => console.error('[audit]', e))
    throw new ContabilForbidden('Registro não pertence à sua organização.')
  }
}

// ── ESCRITÓRIO DO CONTADOR ───────────────────────────────────────────────────
// As actions de escritório rodam no painel do PRÓPRIO contador, onde não há
// cookie `parceiro_org_id` (ele é limpo ao voltar ao escritório) nem
// `organizacao_id` em `usuarios`. Logo `getOrgContext` devolve null e os
// guards acima não servem: aqui a pergunta não é "de qual org é o dado?", e
// sim "este escritório é do usuário autenticado?".

/** Id do usuário autenticado, sem exigir vínculo com organização. */
async function usuarioAutenticado(): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new ContabilForbidden('Não autenticado.')
  return user.id
}

/** Confere que o `usuarioId` recebido da UI é o do próprio autenticado. */
export async function requireProprioUsuario(usuarioId: string): Promise<string> {
  const autenticado = await usuarioAutenticado()
  if (!usuarioId || usuarioId !== autenticado) {
    registrarLog({
      usuario_id: autenticado,
      acao: 'acesso_negado',
      modulo: 'contabil',
      descricao: 'usuarioId alheio em action de escritório',
      dados_depois: { usuario_alegado: usuarioId, usuario_real: autenticado },
    }).catch(e => console.error('[audit]', e))
    throw new ContabilForbidden('Operação permitida apenas no próprio cadastro.')
  }
  return autenticado
}

/** Confere que o escritório pertence ao usuário autenticado. */
export async function requireEscritorioProprio(escritorioId: string) {
  const autenticado = await usuarioAutenticado()
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('contador_org')
    .select('escritorio_id')
    .eq('usuario_id', autenticado)
    .eq('escritorio_id', escritorioId)
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!escritorioId || !data) {
    registrarLog({
      usuario_id: autenticado,
      acao: 'acesso_negado',
      modulo: 'contabil',
      descricao: 'escritório de outro contador',
      dados_depois: { escritorio_id: escritorioId },
    }).catch(e => console.error('[audit]', e))
    throw new ContabilForbidden('Escritório não pertence a este usuário.')
  }

  return { supabase: admin, usuarioId: autenticado }
}
