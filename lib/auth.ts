'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

export async function getUsuarioLogado() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Admin client garante que RLS não bloqueia a leitura do próprio perfil
  const admin = createAdminClient()
  const { data: usuario, error } = await admin
    .from('usuarios')
    .select('id, organizacao_id, role, funcoes, nome_completo, email')
    .eq('id', user.id)
    .single()

  if (error || !usuario) redirect('/login')
  return usuario
}

export async function getOrganizacaoId(): Promise<string> {
  const usuario = await getUsuarioLogado()
  if (!usuario.organizacao_id) throw new Error('Organização não encontrada')
  return usuario.organizacao_id
}
