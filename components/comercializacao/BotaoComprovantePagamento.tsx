'use client'

import { useState } from 'react'
import { emitirComprovantePagamento } from '@/lib/comercializacao/comprovantes-pagamento'

interface Props {
  movimentacao_id: string
  comprovante_id_inicial?: string
  numero_inicial?: number
}

export function BotaoComprovantePagamento({ movimentacao_id, comprovante_id_inicial, numero_inicial }: Props) {
  const [loading, setLoading] = useState(false)
  const [comprovanteId, setComprovanteId] = useState<string | null>(comprovante_id_inicial || null)
  const [numero, setNumero] = useState<number | null>(numero_inicial ?? null)
  const [erro, setErro] = useState<string | null>(null)

  async function handleEmitir() {
    setLoading(true)
    setErro(null)
    try {
      const result = await emitirComprovantePagamento(movimentacao_id)
      setComprovanteId(result.comprovante_id)
      setNumero(result.numero)
      window.open(`/api/comercializacao/comprovante-pagamento/${result.comprovante_id}`, '_blank')
    } catch {
      setErro('Erro ao emitir comprovante')
    } finally {
      setLoading(false)
    }
  }

  function handleBaixar() {
    if (comprovanteId) window.open(`/api/comercializacao/comprovante-pagamento/${comprovanteId}`, '_blank')
  }

  if (comprovanteId) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, color: '#166534', fontWeight: 600 }}>
          Pgto N\xBA {String(numero).padStart(6, '0')}
        </span>
        <button
          onClick={handleBaixar}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', borderRadius: 6,
            border: '1px solid #166534', background: 'white',
            color: '#166534', fontSize: 12, fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          PDF
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <button
        onClick={handleEmitir}
        disabled={loading}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '4px 10px', borderRadius: 6,
          border: '1px solid #bbf7d0', background: loading ? '#f0fdf4' : '#dcfce7',
          color: '#166534', fontSize: 12, fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="5" width="20" height="14" rx="2"/>
          <path d="M2 10h20"/>
        </svg>
        {loading ? 'Gerando...' : 'Comprovante pgto'}
      </button>
      {erro && <span style={{ fontSize: 10, color: '#dc2626' }}>{erro}</span>}
    </div>
  )
}
