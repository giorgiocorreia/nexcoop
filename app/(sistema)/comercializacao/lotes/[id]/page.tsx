import { buscarLote, listarEntregasDoLote, listarEntregasDisponiveis, listarCompradores } from '../actions'
import LoteDetalhe from './LoteDetalhe'

export default async function LoteDetalhePage({ params }: { params: { id: string } }) {
  const [lote, entregasDoLote, entregasDisponiveis, compradores] = await Promise.all([
    buscarLote(params.id),
    listarEntregasDoLote(params.id),
    listarEntregasDisponiveis(),
    listarCompradores(),
  ])

  return (
    <LoteDetalhe
      lote={lote}
      entregasDoLote={entregasDoLote}
      entregasDisponiveis={entregasDisponiveis}
      compradores={compradores}
    />
  )
}
