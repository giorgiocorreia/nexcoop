import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import FinanceiroLista from './FinanceiroLista'

export const metadata = { title: 'Financeiro — NextCoop' }

export default async function FinanceiroPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: lancamentos },
    { data: cooperados },
  ] = await Promise.all([
    supabase
      .from('lancamentos')
      .select('*')
      .order('data_competencia', { ascending: false }),
    supabase
      .from('cooperados')
      .select('id, nome_completo')
      .order('nome_completo'),
  ])

  // Monta mapa cooperado_id → nome para exibição na lista
  const nomeCooperado: Record<string, string> = {}
  for (const c of cooperados ?? []) {
    nomeCooperado[c.id] = c.nome_completo
  }

  return (
    <FinanceiroLista
      lancamentos={lancamentos ?? []}
      nomeCooperado={nomeCooperado}
    />
  )
}
