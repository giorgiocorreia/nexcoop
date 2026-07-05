import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { podeGerenciarLoja } from '@/lib/permissoes'
import ContaCorrenteClient from './ContaCorrenteClient'

export default async function ContaCorrentePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('organizacao_id, role, funcoes')
    .eq('id', user.id)
    .single()

  if (!usuario?.organizacao_id) redirect('/login')

  const isGerente = podeGerenciarLoja({
    role: usuario.role,
    funcoes: (usuario.funcoes ?? []) as string[],
  })

  if (!isGerente) redirect('/loja')

  const admin = createAdminClient()
  const { data: org } = await admin
    .from('organizacoes')
    .select('modulos_ativos')
    .eq('id', usuario.organizacao_id)
    .single()

  const modulos = (org?.modulos_ativos ?? []) as string[]
  const temComercializacao = modulos.includes('comercializacao')

  return (
    <ContaCorrenteClient
      orgId={usuario.organizacao_id}
      temComercializacao={temComercializacao}
    />
  )
}