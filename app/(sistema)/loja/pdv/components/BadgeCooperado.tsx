'use client'

import type { CooperadoIdentificado } from '@/lib/loja/types'
import { fmtReal } from '@/lib/comercializacao/fmt'

interface Props {
  cooperado: CooperadoIdentificado
  onRemover: () => void
}

export default function BadgeCooperado({ cooperado, onRemover }: Props) {
  return (
    <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>
            Cooperado identificado
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#14532d' }}>{cooperado.nome}</div>
        </div>
        <button onClick={onRemover} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 18, lineHeight: 1, padding: 0 }} title="Remover cooperado">x</button>
      </div>
      {cooperado.tem_conta_corrente && (
        <div style={{ marginTop: 8, padding: '6px 10px', background: '#dcfce7', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#15803d' }}>Saldo em conta corrente</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#14532d' }}>{fmtReal(cooperado.saldo_financeiro)}</span>
        </div>
      )}
    </div>
  )
}
