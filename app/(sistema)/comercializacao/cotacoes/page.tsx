import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/permissoes'
import CotacoesClient from './CotacoesClient'

export default async function CotacoesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('role, funcoes')
    .eq('id', user.id)
    .single()

  const up = { role: usuario?.role ?? '', funcoes: (usuario?.funcoes ?? []) as string[] }
  const podeRegistrar = isAdmin(up)

  return <CotacoesClient podeRegistrar={podeRegistrar} />
}
