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

    const authUsers = authRes.data?.users ?? []
    const confirmedIds = new Set(
      authUsers.filter(u => u.email_confirmed_at).map(u => u.id)
    )

    const todosUsuarios = (usersRes.data ?? []) as Usuario[]
    funcoes = (funcoesRes.data ?? []) as FuncaoDisponivel[]

    // Pendentes: ativo:false e e-mail ainda não confirmado no Auth
    pendentes = todosUsuarios
      .filter(u => !u.ativo && !confirmedIds.has(u.id))
      .map(u => ({
        id: u.id,
        email: u.email ?? '',
        nome_completo: u.nome_completo,
        funcoes: (u.funcoes ?? []) as string[],
        vinculo: u.vinculo ?? null,
        invited_at: (u as any).created_at ?? '',
      }))

    const pendentesIds = new Set(pendentes.map(p => p.id))
    usuarios = todosUsuarios.filter(u => !pendentesIds.has(u.id))
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
