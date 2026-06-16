'use client'

import { Btn } from '@/components/ui/Btn'

interface Props {
  vendaId: string
  onNovaVenda: () => void
}

export default function ModalComprovante({ vendaId, onNovaVenda }: Props) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 36, width: 360, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', textAlign: 'center' }}>
        <i className="ti ti-circle-check" style={{ fontSize: 48, color: '#1D9E75', display: 'block', marginBottom: 12 }} />
        <div style={{ fontSize: 20, fontWeight: 800, color: '#14532d', marginBottom: 8 }}>Venda registrada!</div>
        <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 28 }}>
          Venda <strong>#{vendaId.slice(-6).toUpperCase()}</strong> concluida com sucesso.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Btn icone="ti-printer" onClick={() => { window.open(`/api/loja/comprovante/${vendaId}`, '_blank'); onNovaVenda() }}
            style={{ justifyContent: 'center', background: '#E07B30', color: '#fff', border: '1.5px solid #E07B30', width: '100%' }}>
            Imprimir comprovante
          </Btn>
          <Btn icone="ti-shopping-cart" variante="cinza" onClick={onNovaVenda}
            style={{ justifyContent: 'center', width: '100%' }}>
            Nova venda
          </Btn>
        </div>
      </div>
    </div>
  )
}
