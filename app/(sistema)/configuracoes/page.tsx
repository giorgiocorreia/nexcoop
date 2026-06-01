import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/supabase/impersonation'
import { redirect } from 'next/navigation'
import { isAdmin } from '@/lib/permissoes'
import ConfiguracoesForm from './ConfiguracoesForm'
import type { Organizacao, PerfilCaptacao, Usuario, FuncaoDisponivel } from '@/types/database'

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

  // Resolve org_id: impersonation cookie tem prioridade sobre organizacao_id do usuário
  const ctx = await getOrgContext()
  const orgId = ctx?.orgId ?? null

  let org: Organizacao | null = null
  let perfilCaptacao: PerfilCaptacao | null = null
  let usuarios: Usuario[] = []
  let funcoes: FuncaoDisponivel[] = []

  if (orgId) {
    const db = ctx!.supabase

    const [orgRes, perfilRes] = await Promise.all([
      db.from('organizacoes').select('*').eq('id', orgId).single(),
      db.from('perfil_captacao').select('*').eq('organizacao_id', orgId).maybeSingle(),
    ])
    org = orgRes.data ?? null
    perfilCaptacao = perfilRes.data ?? null

    if (isAdmin(usuario) || superAdmin) {
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
  }

  return (
    <Suspense fallback={null}>
      <ConfiguracoesForm
        org={org}
        isSuperAdmin={superAdmin}
        perfilCaptacao={perfilCaptacao}
        usuario={usuario as Usuario}
        usuarios={usuarios}
        funcoes={funcoes}
      />
    </Suspense>
  )
}
