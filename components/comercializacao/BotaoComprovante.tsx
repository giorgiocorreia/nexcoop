'use client'

import { useState } from 'react'
import { emitirComprovante } from '@/lib/comercializacao/notas'

interface Props {
  movimentacao_id: string
  nota_id_inicial?: string
  numero_inicial?: number
}

export function BotaoComprovante({ movimentacao_id, nota_id_inicial, numero_inicial }: Props) {
  const [loading, setLoading] = useState(false)
  const [notaId, setNotaId] = useState<string | null>(nota_id_inicial || null)
  const [numero, setNumero] = useState<number | null>(numero_inicial || null)
  const [erro, setErro] = useState<string | null>(null)

  async function handleEmitir() {
    setLoading(true)
    setErro(null)
    try {
      const result = await emitirComprovante(movimentacao_id)
      setNotaId(result.nota_id)
      setNumero(result.numero)
      window.open(`/api/comercializacao/comprovante/${result.nota_id}`, '_blank')
    } catch {
      setErro('Erro ao emitir comprovante')
    } finally {
      setLoading(false)
    }
  }

  function handleBaixar() {
    if (notaId) window.open(`/api/comercializacao/comprovante/${notaId}`, '_blank')
  }

  if (notaId) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, color: '#92400e', fontWeight: 600 }}>
          Nº {String(numero).padStart(6, '0')}
        </span>
        <button
          onClick={handleBaixar}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '4px 10px', borderRadius: 6,
            border: '1px solid #92400e', background: 'white',
            color: '#92400e', fontSize: 12, fontWeight: 600,
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
          border: '1px solid #d4a57a', background: loading ? '#f5e6d8' : '#fef3c7',
          color: '#92400e', fontSize: 12, fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
        {loading ? 'Gerando...' : 'Comprovante'}
      </button>
      {erro && <span style={{ fontSize: 10, color: '#dc2626' }}>{erro}</span>}
    </div>
  )
}
