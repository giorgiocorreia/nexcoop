import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOrgContext } from '@/lib/supabase/impersonation'
import { redirect } from 'next/navigation'
import { isAdmin, isSuperAdmin } from '@/lib/permissoes'
import type { FuncaoDisponivel, Usuario } from '@/types/database'
import UsuariosGestao from './UsuariosGestao'

export const metadata = { title: 'Usuários — NexCoop' }

export interface UsuarioPendente {
  id: string
  email: string
  nome_completo: string
  funcoes: string[]
  vinculo: string | null
  invited_at: string
}

export default async function UsuariosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuarioAtual } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!usuarioAtual) redirect('/login')
  if (!isAdmin(usuarioAtual) && !isSuperAdmin(usuarioAtual)) redirect('/configuracoes')

  const ctx = await getOrgContext()
  const orgId = ctx?.orgId ?? null

  let usuarios: Usuario[] = []
  let funcoes: FuncaoDisponivel[] = []
  let pendentes: UsuarioPendente[] = []

  if (orgId) {
    const db = ctx!.supabase
    const admin = createAdminClient()

    const [usersRes, funcoesRes, authRes] = await Promise.all([
      db
        .from('usuarios')
        .select('*')
        .eq('organizacao_id', orgId)
        .order('nome_completo'),
      db
        .from('funcoes_disponiveis')
        .select('*')
        .or(`organizacao_id.is.null,organizacao_id.eq.${orgId}`)
        .order('nome'),
      admin.auth.admin.listUsers({ perPage: 1000 }),
    ])

    usuarios = (usersRes.data ?? []) as Usuario[]
    funcoes  = (funcoesRes.data ?? []) as FuncaoDisponivel[]

    const authUsers = authRes.data?.users ?? []
    const usuariosIds = new Set(usuarios.map(u => u.id))

    console.log('[DEBUG pendentes] total authUsers:', authUsers.length)
    console.log('[DEBUG pendentes] orgId:', orgId)
    authUsers.forEach(u => {
      if (u.invited_at) {
        console.log('[DEBUG pendentes] convidado:', u.email, {
          invited_at: u.invited_at,
          email_confirmed_at: u.email_confirmed_at,
          inUsuarios: usuariosIds.has(u.id),
          org_metadata: u.user_metadata?.organizacao_id,
          org_match: u.user_metadata?.organizacao_id === orgId,
        })
      }
    })

    pendentes = authUsers
      .filter(u =>
        u.invited_at &&
        !u.email_confirmed_at &&
        !usuariosIds.has(u.id) &&
        u.user_metadata?.organizacao_id === orgId
      )
      .map(u => ({
        id: u.id,
        email: u.email ?? '',
        nome_completo: u.user_metadata?.nome_completo ?? u.email ?? '',
        funcoes: u.user_metadata?.funcoes ?? [],
        vinculo: u.user_metadata?.vinculo ?? null,
        invited_at: u.invited_at!,
      }))

    console.log('[DEBUG pendentes] resultado final:', pendentes.length)
  }

  return (
    <UsuariosGestao
      usuarios={usuarios}
      pendentes={pendentes}
      funcoes={funcoes}
      usuarioAtualId={user.id}
      isSuperAdmin={isSuperAdmin(usuarioAtual)}
    />
  )
}
