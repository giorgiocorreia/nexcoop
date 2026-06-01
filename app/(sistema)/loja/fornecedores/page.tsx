import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import FornecedoresLista from './FornecedoresLista'
import type { LojaFornecedor } from '@/types/database'

export const metadata = { title: 'Fornecedores — Loja | NextCoop' }

export default async function FornecedoresPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: fornecedores, error } = await supabase
    .from('loja_fornecedores')
    .select('*')
    .order('nome')

  if (error) console.error('Erro ao buscar fornecedores:', error.message)

  return <FornecedoresLista fornecedores={(fornecedores ?? []) as LojaFornecedor[]} />
}
