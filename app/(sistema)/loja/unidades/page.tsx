import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { podeGerenciarLoja } from '@/lib/permissoes'
import UnidadesClient from './UnidadesClient'

export default async function UnidadesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('organizacao_id, role, funcoes')
    .eq('id', user.id)
    .single()

  if (!usuario?.organizacao_id) redirect('/login')
  if (!podeGerenciarLoja({ role: usuario.role, funcoes: (usuario.funcoes ?? []) as string[] }))
    redirect('/loja')

  const admin = createAdminClient()
  const { data: unidades } = await admin
    .from('loja_unidades')
    .select('*')
    .eq('org_id', usuario.organizacao_id)
    .order('nome')

  return (
    <UnidadesClient
      orgId={usuario.organizacao_id as string}
      unidades={unidades ?? []}
    />
  )
}
