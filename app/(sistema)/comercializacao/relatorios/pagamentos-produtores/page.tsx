import { redirect } from 'next/navigation'
import { getUsuarioLogado } from '@/lib/auth'
import PagamentosProdutoresClient from './PagamentosProdutoresClient'

export default async function PagamentosProdutoresPage() {
  const usuario = await getUsuarioLogado()
  if (!usuario) redirect('/login')
  if (!usuario.organizacao_id) redirect('/login')

  return <PagamentosProdutoresClient />
}
