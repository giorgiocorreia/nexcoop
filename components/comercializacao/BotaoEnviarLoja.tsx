'use client'

import { useState } from 'react'
import { enviarEntregaParaLoja } from '@/lib/comercializacao/ponte-loja.actions'

interface Props {
  movimentacao_id: string
  ja_enviado?: boolean
}

export function BotaoEnviarLoja({ movimentacao_id, ja_enviado }: Props) {
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(!!ja_enviado)
  const [erro, setErro] = useState<string | null>(null)

  async function handleEnviar() {
    setLoading(true)
    setErro(null)
    try {
      await enviarEntregaParaLoja(movimentacao_id)
      setEnviado(true)
    } catch (e: any) {
      setErro(e.message ?? 'Erro ao enviar para a Loja')
    } finally {
      setLoading(false)
    }
  }

  if (enviado) {
    return <span style={{ fontSize: 12, color: '#16A34A', fontWeight: 600 }}>✓ Enviado à Loja</span>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
      <button
        onClick={handleEnviar}
        disabled={loading}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '4px 10px', borderRadius: 6,
          border: '1px solid #185FA5', background: loading ? '#EFF6FF' : '#fff',
          color: '#185FA5', fontSize: 12, fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
        }}
      >
        {loading ? 'Enviando...' : 'Enviar p/ Loja'}
      </button>
      {erro && <span style={{ fontSize: 10, color: '#dc2626', maxWidth: 140, textAlign: 'center' }}>{erro}</span>}
    </div>
  )
}
