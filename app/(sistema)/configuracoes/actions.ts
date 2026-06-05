'use server'

import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { isAdmin, isSuperAdmin } from '@/lib/permissoes'
import type { TipoOrganizacao } from '@/types/database'

export interface SalvarOrgInput {
  email: string
  telefone: string
  site: string
  cep: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  estado: string
  nome: string
  nome_curto: string
  tipo: TipoOrganizacao
  cnpj: string
  data_fundacao: string
  registro_juceb: string
}

export async function salvarOrganizacao(input: SalvarOrgInput): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const { data: usuarioAtual } = await supabase.from('usuarios').select('*').eq('id', user.id).single()
  if (!usuarioAtual) return { error: 'Usuário não encontrado.' }
  if (!isAdmin(usuarioAtual) && !isSuperAdmin(usuarioAtual)) return { error: 'Sem permissão.' }

  // Resolve orgId: cookie de impersonation tem prioridade sobre organizacao_id do usuário
  let orgId: string | null = usuarioAtual.organizacao_id
  if (!orgId && isSuperAdmin(usuarioAtual)) {
    const cookieStore = await cookies()
    orgId = cookieStore.get('impersonating_org')?.value ?? null
  }
  if (!orgId) return { error: 'Organização não encontrada.' }

  const n = (s: string) => s.trim() || null

  const payload: Record<string, unknown> = {
    email:       n(input.email),
    telefone:    n(input.telefone),
    site:        n(input.site),
    cep:         input.cep.replace(/\D/g, '') || null,
    logradouro:  n(input.logradouro),
    numero:      n(input.numero),
    complemento: n(input.complemento),
    bairro:      n(input.bairro),
  }

  // cidade e estado têm NOT NULL — só atualiza se não estiverem vazios
  if (input.cidade.trim()) payload.cidade = input.cidade.trim()
  if (input.estado)        payload.estado = input.estado

  if (isSuperAdmin(usuarioAtual)) {
    payload.nome         = input.nome.trim()
    payload.nome_curto   = n(input.nome_curto)
    payload.tipo         = input.tipo
    payload.cnpj         = input.cnpj.replace(/\D/g, '') || null
    payload.data_fundacao  = input.data_fundacao || null
    payload.registro_juceb = n(input.registro_juceb)
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('organizacoes')
    .update(payload)
    .eq('id', orgId)

  if (error) return { error: error.message }
  return {}
}

export async function salvarPerfilUsuario(dados: {
  nome_completo: string
  telefone: string | null
}): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('usuarios')
    .update({
      nome_completo: dados.nome_completo.trim(),
      telefone: dados.telefone?.trim() || null,
    })
    .eq('id', user.id)

  if (error) return { error: error.message }
  return {}
}

export async function salvarAvatarUrl(avatarUrl: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('usuarios')
    .update({ avatar_url: avatarUrl })
    .eq('id', user.id)

  if (error) return { error: error.message }
  return {}
}

export async function atualizarLogoOrg(
  organizacaoId: string,
  logoUrl: string,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const { data: usuarioAtual } = await supabase.from('usuarios').select('*').eq('id', user.id).single()
  if (!usuarioAtual) return { error: 'Usuário não encontrado.' }
  if (!isAdmin(usuarioAtual) && !isSuperAdmin(usuarioAtual)) return { error: 'Sem permissão.' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('organizacoes')
    .update({ logo_url: logoUrl })
    .eq('id', organizacaoId)

  if (error) return { error: error.message }
  return {}
}

// ── Migração Supabase Storage ─────────────────────────────────────────────────
// Executar no Supabase SQL Editor (uma única vez):
//
// insert into storage.buckets (id, name, public)
//   values ('logos-orgs', 'logos-orgs', true)
//   on conflict (id) do nothing;
//
// create policy "Admin pode fazer upload da logo da sua org"
//   on storage.objects for insert
//   with check (
//     bucket_id = 'logos-orgs'
//     and auth.uid() in (
//       select u.id from usuarios u
//       where u.organizacao_id = split_part(name, '/', 1)::uuid
//         and 'admin' = any(u.funcoes)
//     )
//   );
// ─────────────────────────────────────────────────────────────────────────────

export async function alterarEmail(
  novoEmail: string,
  senhaAtual: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return { error: 'Não autenticado.' }

  // Valida a senha atual antes de qualquer alteração
  const { error: signErr } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: senhaAtual,
  })
  if (signErr) return { error: 'Senha incorreta.' }

  const admin = createAdminClient()

  // Atualiza e-mail no Auth imediatamente, sem enviar confirmação para nenhum lado
  // (a prova de identidade é a senha, não o link de e-mail)
  const { error: authErr } = await admin.auth.admin.updateUserById(user.id, {
    email: novoEmail.trim(),
    email_confirm: true,
  })
  if (authErr) return { error: authErr.message }

  // Mantém a coluna email da tabela usuarios sincronizada com auth.users
  await admin.from('usuarios').update({ email: novoEmail.trim() }).eq('id', user.id)

  return {}
}
