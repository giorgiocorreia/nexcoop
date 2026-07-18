import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { temModulo } from '@/lib/org'
import { podeGerenciarLoja } from '@/lib/permissoes'
import { listarContasAPagarLoja } from '@/lib/loja/actions'
import ContasAPagarLista from './ContasAPagarLista'

export const metadata = { title: 'Contas a pagar — Loja | NexCoop' }

export default async function ContasAPagarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('organizacao_id, funcoes, role, organizacoes(modulos_ativos)')
    .eq('id', user.id)
    .single()

  const orgRaw = (usuario as any)?.organizacoes
  const org = Array.isArray(orgRaw) ? orgRaw[0] : orgRaw
  if (!temModulo(org?.modulos_ativos, 'loja')) redirect('/dashboard')

  const orgId = (usuario as any)?.organizacao_id as string
  const up = { role: usuario?.role ?? '', funcoes: ((usuario as any)?.funcoes ?? []) as string[] }
  if (!podeGerenciarLoja(up)) redirect('/loja')

  const { data: parcelas, error } = await listarContasAPagarLoja(orgId)

  return (
    <ContasAPagarLista
      parcelas={(parcelas ?? []) as any}
      erro={error}
      orgId={orgId}
      usuarioId={user.id}
    />
  )
}
