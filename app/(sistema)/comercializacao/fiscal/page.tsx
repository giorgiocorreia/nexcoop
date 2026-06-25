import { redirect } from 'next/navigation'
import { getUsuarioLogado } from '@/lib/auth'
import FiscalHubClient from './FiscalHubClient'

export default async function FiscalNfePage() {
  const usuario = await getUsuarioLogado()
  if (!usuario) redirect('/login')

  if (!usuario.organizacao_id) redirect('/login')
  return <FiscalHubClient orgId={usuario.organizacao_id} />
}
