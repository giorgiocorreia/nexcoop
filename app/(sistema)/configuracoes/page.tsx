import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { isAdmin } from '@/lib/permissoes'
import ConfiguracoesForm from './ConfiguracoesForm'
import type { Organizacao, PerfilCaptacao, Usuario, FuncaoDisponivel } from '@/types/database'

export const metadata = { title: 'Configurações — NextCoop' }

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

  let org: Organizacao | null = null
  let perfilCaptacao: PerfilCaptacao | null = null
  let usuarios: Usuario[] = []
  let funcoes: FuncaoDisponivel[] = []

  if (usuario.organizacao_id) {
    const [orgRes, perfilRes] = await Promise.all([
      supabase.from('organizacoes').select('*').eq('id', usuario.organizacao_id).single(),
      supabase.from('perfil_captacao').select('*').eq('organizacao_id', usuario.organizacao_id).maybeSingle(),
    ])
    org = orgRes.data ?? null
    perfilCaptacao = perfilRes.data ?? null

    if (isAdmin(usuario)) {
      const [usersRes, funcoesRes] = await Promise.all([
        supabase
          .from('usuarios')
          .select('*')
          .eq('organizacao_id', usuario.organizacao_id)
          .order('nome_completo'),
        supabase
          .from('funcoes_disponiveis')
          .select('*')
          .or(`organizacao_id.is.null,organizacao_id.eq.${usuario.organizacao_id}`)
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
