import { redirect } from 'next/navigation'
import { getUsuarioLogado } from '@/lib/auth'
import SaidasCaixaClient from './SaidasCaixaClient'

export default async function SaidasCaixaPage() {
  const usuario = await getUsuarioLogado()
  if (!usuario) redirect('/login')
  if (!usuario.organizacao_id) redirect('/login')

  return <SaidasCaixaClient />
}
