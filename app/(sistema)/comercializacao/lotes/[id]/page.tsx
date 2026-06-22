import { buscarLote, listarEntregasDoLote, listarEntregasDisponiveis, listarCompradores } from '../actions'
import LoteDetalhe from './LoteDetalhe'

export default async function LoteDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [lote, entregasDoLote, entregasDisponiveis, compradores] = await Promise.all([
    buscarLote(id),
    listarEntregasDoLote(id),
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
