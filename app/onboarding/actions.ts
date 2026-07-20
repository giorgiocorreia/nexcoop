'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getUsuarioLogado } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import type { TipoOrganizacao } from '@/types/database'

export interface ConcluirOnboardingInput {
  tipo:     TipoOrganizacao
  cnpj:     string
  telefone: string
  cidade:   string
  estado:   string
}

/**
 * Conclui o onboarding da organização do usuário logado.
 *
 * Antes o formulário atualizava `organizacoes` direto do browser, sob RLS. A
 * policy de organizacoes depende de `auth_org_id()`, que não existe no banco
 * (mesma função proibida pela regra 1 do CLAUDE.md), então o UPDATE voltava com
 * zero linhas e o operador via "Não foi possível salvar. Verifique suas
 * permissões" sem ter como resolver. Write org-level é caso de
 * createAdminClient por regra do projeto (regra 2) — a autorização é feita aqui,
 * no servidor: só admin da própria organização conclui o onboarding dela.
 */
export async function concluirOnboarding(
  input: ConcluirOnboardingInput
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const usuario = await getUsuarioLogado()

  if (!usuario.organizacao_id) {
    return { ok: false, erro: 'Organização não encontrada. Contate o suporte.' }
  }

  const funcoes = (usuario.funcoes ?? []) as string[]
  const podeConcluir =
    usuario.role === 'super_admin' ||
    usuario.role === 'org_admin' ||
    funcoes.includes('admin')

  if (!podeConcluir) {
    return { ok: false, erro: 'Apenas um administrador da organização pode concluir o cadastro.' }
  }

  if (!input.cidade.trim() || !input.estado) {
    return { ok: false, erro: 'Cidade e estado são obrigatórios.' }
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('organizacoes')
    .update({
      tipo:                 input.tipo,
      cnpj:                 input.cnpj.replace(/\D/g, '') || null,
      telefone:             input.telefone.trim() || null,
      cidade:               input.cidade.trim(),
      estado:               input.estado,
      onboarding_concluido: true,
    })
    .eq('id', usuario.organizacao_id)
    .select('id')

  if (error) {
    return { ok: false, erro: `Erro ao salvar: ${error.message}` }
  }
  if (!data || data.length === 0) {
    return { ok: false, erro: 'Organização não encontrada. Contate o suporte.' }
  }

  revalidatePath('/dashboard')
  return { ok: true }
}
