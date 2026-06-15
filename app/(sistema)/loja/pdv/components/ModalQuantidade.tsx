'use client'

import { useState } from 'react'
import { Btn } from '@/components/ui/Btn'
import type { ProdutoLoja } from '@/lib/loja/types'
import { fmtReal } from '@/lib/comercializacao/fmt'

interface Props {
  produto: ProdutoLoja
  onConfirmar: (quantidade: number) => void
  onCancelar: () => void
}

export default function ModalQuantidade({ produto, onConfirmar, onCancelar }: Props) {
  const decimal = ['kg', 'l', 'g'].includes(produto.unidade)
  const [qtd, setQtd] = useState('1')

  const qtdNum = parseFloat(qtd.replace(',', '.')) || 0
  const subtotal = qtdNum * produto.preco_normal

  function ajustar(delta: number) {
    const atual = parseFloat(qtd.replace(',', '.')) || 0
    const novo = Math.max(decimal ? 0.1 : 1, atual + delta)
    setQtd(decimal ? novo.toFixed(3).replace('.', ',') : String(Math.round(novo)))
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 340, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, color: '#1a1a2e' }}>{produto.nome}</div>
        <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>
          {fmtReal(produto.preco_normal)} / {produto.unidade} &middot; Estoque: {produto.estoque_atual} {produto.unidade}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <button onClick={() => ajustar(-1)} style={{ width: 36, height: 36, borderRadius: 8, border: '1.5px solid #d1d5db', background: '#f9fafb', fontSize: 18, cursor: 'pointer' }}>-</button>
          <input
            type="text"
            value={qtd}
            onChange={e => setQtd(e.target.value)}
            onFocus={e => e.target.select()}
            style={{ flex: 1, textAlign: 'center', padding: '8px', border: '1.5px solid #d1d5db', borderRadius: 8, fontSize: 16, fontWeight: 600, outline: 'none' }}
          />
          <span style={{ fontSize: 13, color: '#6b7280' }}>{produto.unidade}</span>
          <button onClick={() => ajustar(1)} style={{ width: 36, height: 36, borderRadius: 8, border: '1.5px solid #d1d5db', background: '#f9fafb', fontSize: 18, cursor: 'pointer' }}>+</button>
        </div>

        <div style={{ background: '#f8f7f4', borderRadius: 8, padding: '10px 14px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#6b7280' }}>Subtotal</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#92400e' }}>{fmtReal(subtotal)}</span>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Btn variante="cinza" onClick={onCancelar}>Cancelar</Btn>
          <Btn
            onClick={() => qtdNum > 0 && onConfirmar(qtdNum)}
            disabled={qtdNum <= 0}
            style={{ background: '#E07B30', color: '#fff', border: '1.5px solid #E07B30' }}
          >
            Adicionar ao carrinho
          </Btn>
        </div>
      </div>
    </div>
  )
}
