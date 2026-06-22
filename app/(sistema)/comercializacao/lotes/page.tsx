import { listarLotes } from './actions'
import LotesLista from './LotesLista'

export default async function LotesPage() {
  const lotes = await listarLotes()
  return <LotesLista lotes={lotes ?? []} />
}
