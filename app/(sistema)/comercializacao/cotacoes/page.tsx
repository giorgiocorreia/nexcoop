import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
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

  const funcoes = (usuario?.funcoes ?? []) as string[]
  const podeRegistrar = funcoes.includes('admin') ||
    funcoes.includes('financeiro') ||
    funcoes.includes('tecnico') ||
    funcoes.includes('caixa_cacau')

  return <CotacoesClient podeRegistrar={podeRegistrar} />
}
