'use client'

import { useState } from 'react'
import { cancelarCompra } from '@/lib/loja/actions'

interface Props {
  compraId: string
  orgId: string
  usuarioId: string
  cancelada: boolean
}

export default function BotaoCancelarCompra({ compraId, orgId, usuarioId, cancelada }: Props) {
  const [confirmando, setConfirmando] = useState(false)
  const [cancelando, setCancelando]   = useState(false)
  const [erro, setErro]               = useState('')

  if (cancelada) {
    return (
      <span style={{
        fontSize: 12, fontWeight: 600, color: '#dc2626',
        background: '#fef2f2', border: '1px solid #fca5a5',
        padding: '4px 12px', borderRadius: 6,
      }}>
        Cancelada
      </span>
    )
  }

  async function handleCancelar() {
    setCancelando(true)
    setErro('')
    const res = await cancelarCompra(orgId, compraId, usuarioId)
    setCancelando(false)
    if ('error' in res) { setErro(res.error); setConfirmando(false); return }
    setConfirmando(false)
  }

  if (confirmando) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 13, color: '#dc2626', fontWeight: 500 }}>Confirma cancelamento?</span>
        <button
          onClick={handleCancelar}
          disabled={cancelando}
          style={{
            padding: '5px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
            cursor: cancelando ? 'not-allowed' : 'pointer',
            background: '#dc2626', color: '#fff', border: 'none',
          }}
        >
          {cancelando ? 'Cancelando…' : 'Sim, cancelar'}
        </button>
        <button
          onClick={() => setConfirmando(false)}
          disabled={cancelando}
          style={{
            padding: '5px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
            cursor: 'pointer', background: 'transparent', color: '#6b7280',
            border: '1px solid #d1d5db',
          }}
        >
          Não
        </button>
        {erro && <span style={{ fontSize: 12, color: '#dc2626' }}>{erro}</span>}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <button
        onClick={() => setConfirmando(true)}
        style={{
          padding: '5px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
          cursor: 'pointer', background: 'transparent',
          color: '#dc2626', border: '1px solid #fca5a5',
        }}
      >
        Cancelar compra
      </button>
      {erro && <span style={{ fontSize: 12, color: '#dc2626' }}>{erro}</span>}
    </div>
  )
}
