'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import type { PlanoOrganizacao, TipoOrganizacao } from '@/types/database'

export interface CriarOrgInput {
  nome: string
  nome_curto: string
  cnpj: string
  tipo: TipoOrganizacao
  plano: PlanoOrganizacao
  cidade: string
  estado: string
  email: string
  telefone: string
  admin_nome: string
  admin_email: string
  admin_senha: string
}

export async function criarOrganizacao(input: CriarOrgInput): Promise<{ error?: string; orgId?: string }> {
  const supabase = createAdminClient()

  // 1. Criar organização
  const { data: org, error: orgError } = await supabase
    .from('organizacoes')
    .insert({
      nome: input.nome.trim(),
      nome_curto: input.nome_curto.trim() || null,
      cnpj: input.cnpj.trim() || null,
      tipo: input.tipo,
      plano: input.plano,
      cidade: input.cidade.trim(),
      estado: input.estado,
      email: input.email.trim() || null,
      telefone: input.telefone.trim() || null,
      ativo: true,
      // Este formulário já coleta tipo, cnpj, telefone, cidade e estado — os
      // mesmos campos do /onboarding. Sem esta flag a org caía no onboarding
      // pedindo de novo exatamente o que o admin acabou de preencher.
      onboarding_concluido: true,
    })
    .select('id')
    .single()

  if (orgError) return { error: `Erro ao criar organização: ${orgError.message}` }

  // 2. Criar usuário no Supabase Auth (admin API)
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: input.admin_email.trim(),
    password: input.admin_senha,
    email_confirm: true,
    user_metadata: { nome_completo: input.admin_nome.trim() },
  })

  if (authError) {
    await supabase.from('organizacoes').delete().eq('id', org.id)
    return { error: `Erro ao criar usuário: ${authError.message}` }
  }

  // 3. Gravar o perfil do admin em `usuarios`.
  // Antes era UPDATE, confiando no trigger handle_new_user (001) ter criado a
  // linha no signup. Em produção o trigger não está criando: o UPDATE não
  // achava linha nenhuma, o Postgres não trata isso como erro, e a org nascia
  // sem nenhum usuário — quem logava caía num sistema sem nome e com a sidebar
  // vazia (sem `funcoes`, nenhum item de menu é montado). Upsert funciona nos
  // dois cenários: cria quando o trigger não criou, completa quando criou.
  const { error: userError } = await supabase
    .from('usuarios')
    .upsert({
      id: authData.user.id,
      email: input.admin_email.trim(),
      organizacao_id: org.id,
      role: 'org_admin',
      funcoes: ['admin'],
      vinculo: 'diretoria',
      nome_completo: input.admin_nome.trim(),
      ativo: true,
    }, { onConflict: 'id' })

  if (userError) {
    return { error: `Organização criada, mas erro ao configurar usuário: ${userError.message}` }
  }

  // Sem perfil não há acesso útil (sidebar vazia) — confirma antes de dar OK.
  const { data: perfil } = await supabase
    .from('usuarios')
    .select('id, funcoes')
    .eq('id', authData.user.id)
    .maybeSingle()

  if (!perfil) {
    return { error: 'Organização criada, mas o perfil do administrador não foi gravado. Verifique o usuário antes de usar a organização.' }
  }

  return { orgId: org.id }
}
