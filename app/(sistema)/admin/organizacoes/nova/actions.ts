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

  // 3. Atualizar registro criado pelo trigger handle_new_user
  const { error: userError } = await supabase
    .from('usuarios')
    .update({
      organizacao_id: org.id,
      role: 'org_admin',
      funcoes: ['admin'],
      vinculo: 'diretoria',
      nome_completo: input.admin_nome.trim(),
    })
    .eq('id', authData.user.id)

  if (userError) {
    return { error: `Organização criada, mas erro ao configurar usuário: ${userError.message}` }
  }

  return { orgId: org.id }
}
