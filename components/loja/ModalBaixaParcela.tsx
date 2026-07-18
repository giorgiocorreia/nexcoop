'use client'

import { useState } from 'react'
import { quitarParcelaCompra } from '@/lib/loja/actions'
import type { LojaCompraParcela } from '@/types/database'
import ModalAutorizacao from '@/app/(sistema)/loja/pdv/components/ModalAutorizacao'

interface Props {
  parcela: LojaCompraParcela
  orgId: string
  usuarioId: string
  onFechar: () => void
  onBaixada: () => void
}

const C = {
  laranja: '#E07B30', borda: '#E5E3DC', txt: '#1C1917', txtSub: '#78716C',
}

function fmtReal(n: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

export default function ModalBaixaParcela({ parcela, orgId, usuarioId, onFechar, onBaixada }: Props) {
  const [formaPagamento, setFormaPagamento] = useState<'dinheiro' | 'pix' | 'cartao'>('dinheiro')
  const [mostrarAutorizacao, setMostrarAutorizacao] = useState(false)
  const [erro, setErro] = useState('')
  const [processando, setProcessando] = useState(false)

  async function confirmarBaixa(autorizadoPor: string) {
    setProcessando(true)
    const res = await quitarParcelaCompra(orgId, usuarioId, parcela.id, formaPagamento, autorizadoPor)
    setProcessando(false)
    setMostrarAutorizacao(false)
    if ('error' in res) { setErro(res.error ?? ''); return }
    onBaixada()
  }

  if (mostrarAutorizacao) {
    return (
      <ModalAutorizacao
        orgId={orgId}
        titulo="Confirmar baixa da parcela"
        descricao={`Debitar ${fmtReal(parcela.valor)} do caixa da Loja (${formaPagamento}).`}
        onAutorizado={(autId) => confirmarBaixa(autId)}
        onCancelar={() => { setMostrarAutorizacao(false); setProcessando(false) }}
      />
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 340, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, color: C.txt }}>Dar baixa na parcela</div>
        <div style={{ fontSize: 13, color: C.txtSub, marginBottom: 16 }}>
          Parcela {parcela.numero_parcela}/{parcela.total_parcelas} — {fmtReal(parcela.valor)}
        </div>
        {erro && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: '#991b1b' }}>
            {erro}
          </div>
        )}
        <label style={{ fontSize: 12, fontWeight: 600, color: C.txt, display: 'block', marginBottom: 6 }}>Forma de pagamento</label>
        <select value={formaPagamento} onChange={e => setFormaPagamento(e.target.value as any)}
          style={{ width: '100%', padding: '8px 12px', border: `1.5px solid ${C.borda}`, borderRadius: 8, fontSize: 14, marginBottom: 20 }}>
          <option value="dinheiro">Dinheiro</option>
          <option value="pix">Pix</option>
          <option value="cartao">Cartão</option>
        </select>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onFechar} disabled={processando}
            style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: 'transparent', color: C.txtSub, border: `1px solid ${C.borda}` }}>
            Cancelar
          </button>
          <button onClick={() => setMostrarAutorizacao(true)} disabled={processando}
            style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: C.laranja, color: '#fff', border: 'none' }}>
            Continuar
          </button>
        </div>
      </div>
    </div>
  )
}
