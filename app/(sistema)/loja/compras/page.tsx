import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { temModulo } from '@/lib/org'
import { podeGerenciarLoja } from '@/lib/permissoes'
import { listarCompras, listarFornecedores } from '@/lib/loja/actions'
import ComprasLista from './ComprasLista'

export const metadata = { title: 'Compras — Loja | NexCoop' }

export default async function ComprasPage({
  searchParams,
}: {
  searchParams: Promise<{ sucesso?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('funcoes, role, organizacoes(modulos_ativos)')
    .eq('id', user.id)
    .single()

  const orgRaw = (usuario as any)?.organizacoes
  const org = Array.isArray(orgRaw) ? orgRaw[0] : orgRaw
  if (!temModulo(org?.modulos_ativos, 'loja')) redirect('/dashboard')

  const up = { role: usuario?.role ?? '', funcoes: ((usuario as any)?.funcoes ?? []) as string[] }
  if (!podeGerenciarLoja(up)) redirect('/loja')

  const [{ data: compras }, { data: fornecedores }] = await Promise.all([
    listarCompras(),
    listarFornecedores(),
  ])

  const params = await searchParams
  const sucesso = params.sucesso === 'compra'

  return (
    <ComprasLista
      compras={compras ?? []}
      fornecedores={fornecedores ?? []}
      sucesso={sucesso}
    />
  )
}
