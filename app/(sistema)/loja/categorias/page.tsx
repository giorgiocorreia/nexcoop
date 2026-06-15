import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { podeGerenciarLoja } from '@/lib/permissoes'
import { listarCategorias } from '@/lib/loja/actions'
import CategoriasClient from './CategoriasClient'

export const metadata = { title: 'Categorias — Loja | NexCoop' }

export default async function CategoriasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('funcoes, role')
    .eq('id', user.id)
    .single()

  const up = { role: usuario?.role ?? '', funcoes: (usuario?.funcoes ?? []) as string[] }
  if (!podeGerenciarLoja(up)) redirect('/loja/produtos')

  const { data: categorias } = await listarCategorias()

  return <CategoriasClient categorias={categorias ?? []} />
}
