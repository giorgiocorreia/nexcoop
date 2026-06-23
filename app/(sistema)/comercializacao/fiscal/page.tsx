import { redirect } from 'next/navigation'
import { getUsuarioLogado } from '@/lib/auth'
import { listarNfeSaida, kpisNfeSaida } from './actions'
import FiscalNfeClient from './FiscalNfeClient'

export default async function FiscalNfePage() {
  const usuario = await getUsuarioLogado()
  if (!usuario) redirect('/login')

  const [nfes, kpis] = await Promise.all([
    listarNfeSaida(),
    kpisNfeSaida(),
  ])

  return <FiscalNfeClient nfes={nfes as any} kpis={kpis} usuario={usuario} />
}
