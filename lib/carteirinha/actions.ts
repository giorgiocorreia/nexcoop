'use server'

// Server actions de emissão/revogação da carteirinha de identificação do
// filiado. Fase 1: só o caminho de dados — sem UI ainda (fase 3 chama estas
// funções a partir da tela de admin do cooperado).

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { isAdmin } from '@/lib/permissoes'
import { traduzirErro } from '@/lib/utils/erros'
import { gerarCodigoCarteirinha, LIMITE_LOTE } from '@/lib/carteirinha/carteirinha-utils'

type ResultadoAction<T = undefined> = { data?: T; error?: string }

// Confere autenticação + permissão de admin (regra 7: só via lib/permissoes.ts)
// e devolve a organização do usuário logado. createClient() só pra
// auth.getUser(); o resto (leitura de usuarios) já passa por admin — mesmo
// padrão de lib/cooperados/actions.ts (regra 2 do CLAUDE.md).
async function verificarAdminDaOrg(): Promise<{ userId: string; organizacaoId: string }> {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const admin = createAdminClient()
  const { data: usuario } = await admin
    .from('usuarios')
    .select('role, funcoes, organizacao_id')
    .eq('id', user.id)
    .single()
  if (!usuario) throw new Error('Usuário não encontrado')
  if (!isAdmin(usuario)) throw new Error('Sem permissão: requer função admin')
  if (!usuario.organizacao_id) throw new Error('Usuário sem organização vinculada')

  return { userId: user.id, organizacaoId: usuario.organizacao_id as string }
}

// Confirma que o cooperado pertence à mesma org do admin logado — nunca
// confiar só no id vindo do client.
async function confirmarCooperadoDaOrg(cooperadoId: string, organizacaoId: string): Promise<boolean> {
  const admin = createAdminClient()
  const { data: cooperado } = await admin
    .from('cooperados')
    .select('id, organizacao_id')
    .eq('id', cooperadoId)
    .single()
  return !!cooperado && cooperado.organizacao_id === organizacaoId
}

export async function emitirCarteirinha(
  cooperadoId: string,
  validaAte?: string
): Promise<ResultadoAction<{ id: string; codigo: string }>> {
  try {
    const { userId, organizacaoId } = await verificarAdminDaOrg()

    if (!(await confirmarCooperadoDaOrg(cooperadoId, organizacaoId))) {
      return { error: 'Cooperado não encontrado nesta organização.' }
    }

    const admin = createAdminClient()
    const codigo = gerarCodigoCarteirinha()
    const { data, error } = await admin
      .from('cooperado_carteirinhas')
      .insert({
        organizacao_id: organizacaoId,
        cooperado_id: cooperadoId,
        codigo,
        valida_ate: validaAte ?? null,
        emitida_por: userId,
      })
      .select('id, codigo')
      .single()

    if (error) {
      // Índice único parcial (uq_carteirinha_ativa_por_cooperado) barra 2ª
      // via sem revogar a 1ª antes — mensagem acionável em vez do erro cru
      // de constraint do Postgres.
      if (error.code === '23505') {
        return { error: 'Este cooperado já tem uma carteirinha ativa. Revogue-a antes de emitir uma nova via.' }
      }
      return { error: traduzirErro(error.message) }
    }

    revalidatePath('/cooperados')
    return { data: { id: data.id as string, codigo: data.codigo as string } }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro inesperado.' }
  }
}

// Emite carteirinha para vários cooperados de uma vez (tela de Cooperados).
// Sem isto a emissão era uma-a-uma na ficha de cada pessoa, o que inviabiliza
// entregar carteirinha pra uma associação inteira (Giorgio, 24/07/2026).
//
// Quem JÁ tem carteirinha ativa é PULADO, nunca reemitido: reemitir geraria
// um código novo e invalidaria silenciosamente o cartão que a pessoa já tem
// no bolso. Segunda via continua sendo ato individual e consciente, na ficha.
export async function emitirCarteirinhasEmLote(
  cooperadoIds: string[],
  validaAte?: string
): Promise<ResultadoAction<{ emitidas: number; jaTinham: number; falhas: number }>> {
  try {
    const { userId, organizacaoId } = await verificarAdminDaOrg()

    if (cooperadoIds.length === 0) return { error: 'Nenhum cooperado selecionado.' }
    if (cooperadoIds.length > LIMITE_LOTE) {
      return { error: `Selecione no máximo ${LIMITE_LOTE} por vez.` }
    }

    const admin = createAdminClient()

    // Uma query só pra saber quem é mesmo da org — evita N verificações.
    const { data: daOrg } = await admin
      .from('cooperados')
      .select('id')
      .eq('organizacao_id', organizacaoId)
      .in('id', cooperadoIds)

    const idsValidos = (daOrg ?? []).map(c => c.id as string)
    if (idsValidos.length === 0) {
      return { error: 'Nenhum cooperado válido nesta organização.' }
    }

    // Quem já tem via ativa (revogada_em null) sai da lista de emissão.
    const { data: jaAtivas } = await admin
      .from('cooperado_carteirinhas')
      .select('cooperado_id')
      .eq('organizacao_id', organizacaoId)
      .is('revogada_em', null)
      .in('cooperado_id', idsValidos)

    const comCarteirinha = new Set((jaAtivas ?? []).map(c => c.cooperado_id as string))
    const aEmitir = idsValidos.filter(id => !comCarteirinha.has(id))

    if (aEmitir.length === 0) {
      return { data: { emitidas: 0, jaTinham: comCarteirinha.size, falhas: 0 } }
    }

    const linhas = aEmitir.map(cooperadoId => ({
      organizacao_id: organizacaoId,
      cooperado_id: cooperadoId,
      codigo: gerarCodigoCarteirinha(),
      valida_ate: validaAte ?? null,
      emitida_por: userId,
    }))

    const { data: inseridas, error } = await admin
      .from('cooperado_carteirinhas')
      .insert(linhas)
      .select('id')

    if (error) return { error: traduzirErro(error.message) }

    const emitidas = (inseridas ?? []).length
    revalidatePath('/cooperados')
    return {
      data: {
        emitidas,
        jaTinham: comCarteirinha.size,
        falhas: aEmitir.length - emitidas,
      },
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro inesperado.' }
  }
}

export async function revogarCarteirinha(carteirinhaId: string, motivo: string): Promise<ResultadoAction> {
  try {
    const { organizacaoId } = await verificarAdminDaOrg()
    const admin = createAdminClient()

    const { data: carteirinha } = await admin
      .from('cooperado_carteirinhas')
      .select('id, organizacao_id, revogada_em')
      .eq('id', carteirinhaId)
      .single()
    if (!carteirinha || carteirinha.organizacao_id !== organizacaoId) {
      return { error: 'Carteirinha não encontrada nesta organização.' }
    }
    if (carteirinha.revogada_em) {
      return { error: 'Esta carteirinha já está revogada.' }
    }

    const { error } = await admin
      .from('cooperado_carteirinhas')
      .update({ revogada_em: new Date().toISOString(), motivo_revogacao: motivo })
      .eq('id', carteirinhaId)

    if (error) return { error: traduzirErro(error.message) }

    revalidatePath('/cooperados')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro inesperado.' }
  }
}

export async function reemitirCarteirinha(
  cooperadoId: string,
  motivo: string,
  validaAte?: string
): Promise<ResultadoAction<{ id: string; codigo: string }>> {
  try {
    const { userId, organizacaoId } = await verificarAdminDaOrg()

    if (!(await confirmarCooperadoDaOrg(cooperadoId, organizacaoId))) {
      return { error: 'Cooperado não encontrado nesta organização.' }
    }

    const admin = createAdminClient()

    // Revoga a via ativa (se existir) ANTES do insert — senão a nova via
    // colide com o índice único parcial (regra da migration 089).
    const { data: ativa } = await admin
      .from('cooperado_carteirinhas')
      .select('id, via')
      .eq('cooperado_id', cooperadoId)
      .is('revogada_em', null)
      .maybeSingle()

    if (ativa) {
      const { error: erroRevogacao } = await admin
        .from('cooperado_carteirinhas')
        .update({ revogada_em: new Date().toISOString(), motivo_revogacao: motivo })
        .eq('id', ativa.id)
      if (erroRevogacao) return { error: traduzirErro(erroRevogacao.message) }
    }

    const codigo = gerarCodigoCarteirinha()
    const { data, error } = await admin
      .from('cooperado_carteirinhas')
      .insert({
        organizacao_id: organizacaoId,
        cooperado_id: cooperadoId,
        codigo,
        via: (ativa?.via ?? 0) + 1,
        valida_ate: validaAte ?? null,
        emitida_por: userId,
      })
      .select('id, codigo')
      .single()

    if (error) {
      if (error.code === '23505') {
        return { error: 'Falha ao emitir a nova via. Tente novamente.' }
      }
      return { error: traduzirErro(error.message) }
    }

    revalidatePath('/cooperados')
    return { data: { id: data.id as string, codigo: data.codigo as string } }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro inesperado.' }
  }
}
