import { createClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/supabase/impersonation'
import { redirect } from 'next/navigation'
import { isAdmin, isSuperAdmin } from '@/lib/permissoes'
import type { FuncaoDisponivel, Usuario } from '@/types/database'
import UsuariosGestao from './UsuariosGestao'

export const metadata = { title: 'Usuários — NexCoop' }

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

  if (orgId) {
    const db = ctx!.supabase
    const [usersRes, funcoesRes] = await Promise.all([
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
    ])
    usuarios = (usersRes.data ?? []) as Usuario[]
    funcoes  = (funcoesRes.data ?? []) as FuncaoDisponivel[]
  }

  return (
    <UsuariosGestao
      usuarios={usuarios}
      funcoes={funcoes}
      usuarioAtualId={user.id}
      isSuperAdmin={isSuperAdmin(usuarioAtual)}
    />
  )
}
