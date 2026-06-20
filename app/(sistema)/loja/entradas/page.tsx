import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { temModulo } from '@/lib/org'
import { podeGerenciarLoja } from '@/lib/permissoes'
import EntradasNFeClient from './EntradasNFeClient'

export const metadata = { title: 'Entradas NF-e — Loja | NexCoop' }

export default async function EntradasNFePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('organizacao_id, funcoes, role, organizacoes(modulos_ativos)')
    .eq('id', user.id)
    .single()

  const orgRaw = (usuario as any)?.organizacoes
  const org    = Array.isArray(orgRaw) ? orgRaw[0] : orgRaw
  if (!temModulo(org?.modulos_ativos, 'loja')) redirect('/dashboard')

  const up = { role: usuario?.role ?? '', funcoes: ((usuario as any)?.funcoes ?? []) as string[] }
  if (!podeGerenciarLoja(up)) redirect('/loja')

  const orgId = (usuario as any)?.organizacao_id as string

  return <EntradasNFeClient orgId={orgId} />
}
