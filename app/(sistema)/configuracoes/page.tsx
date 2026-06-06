import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOrgContext } from '@/lib/supabase/impersonation'
import { redirect } from 'next/navigation'
import { isAdmin } from '@/lib/permissoes'
import ConfiguracoesForm from './ConfiguracoesForm'
import type { Organizacao, PerfilCaptacao, Usuario, FuncaoDisponivel } from '@/types/database'
import type { UsuarioPendente } from './usuarios/page'

export const metadata = { title: 'Configurações — NexCoop' }

export default async function ConfiguracoesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!usuario) redirect('/login')

  const superAdmin = usuario.role === 'super_admin'
  if (!usuario.organizacao_id && !superAdmin) redirect('/dashboard')

  const ctx = await getOrgContext()
  const orgId = ctx?.orgId ?? null

  let org: Organizacao | null = null
  let perfilCaptacao: PerfilCaptacao | null = null
  let usuarios: Usuario[] = []
  let funcoes: FuncaoDisponivel[] = []
  let pendentes: UsuarioPendente[] = []

  if (orgId) {
    const db = ctx!.supabase

    const [orgRes, perfilRes] = await Promise.all([
      db.from('organizacoes').select('*').eq('id', orgId).single(),
      db.from('perfil_captacao').select('*').eq('organizacao_id', orgId).maybeSingle(),
    ])
    org = orgRes.data ?? null
    perfilCaptacao = perfilRes.data ?? null

    if (isAdmin(usuario) || superAdmin) {
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
      console.log('[ConfiguracoesPage] usuarios encontrados:', usuarios.length, usuarios.map(u => u.email))
      funcoes  = (funcoesRes.data ?? []) as FuncaoDisponivel[]

      const authUsers = authRes.data?.users ?? []
      const usuariosIds = new Set(usuarios.map(u => u.id))

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
    }
  }

  return (
    <Suspense fallback={null}>
      <ConfiguracoesForm
        org={org}
        isSuperAdmin={superAdmin}
        perfilCaptacao={perfilCaptacao}
        usuario={usuario as Usuario}
        usuarios={usuarios}
        pendentes={pendentes}
        funcoes={funcoes}
      />
    </Suspense>
  )
}
