'use client'

import { useState } from 'react'
import type { ItemCarrinho, CooperadoIdentificado } from '@/lib/loja/types'
import { fmtReal } from '@/lib/comercializacao/fmt'
import { Btn } from '@/components/ui/Btn'
import { useToast } from '@/components/ui/Toast'

interface Props {
  itens: ItemCarrinho[]
  cooperado: CooperadoIdentificado | null
  onAlterarDesconto: (index: number, novoPct: number, callback: (autId: string, nome: string) => void) => void
  onRemoverItem: (index: number) => void
  onFinalizar: () => void
  onLimpar: () => void
  totalBruto: number
  totalDesconto: number
  totalLiquido: number
}

export default function PainelCarrinho({
  itens, cooperado, onAlterarDesconto, onRemoverItem, onFinalizar, onLimpar,
  totalBruto, totalDesconto, totalLiquido,
}: Props) {
  const { toast } = useToast()
  const [descontosEditando, setDescontosEditando] = useState<Record<number, string>>({})

  function handleDescontoBlur(index: number, item: ItemCarrinho) {
    const raw = descontosEditando[index]
    if (raw === undefined) return
    const novoPct = Math.min(100, Math.max(0, parseFloat(raw.replace(',', '.')) || 0))
    onAlterarDesconto(index, novoPct, () => {})
    setDescontosEditando(prev => { const n = { ...prev }; delete n[index]; return n })
  }

  if (itens.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', gap: 8 }}>
        <i className="ti ti-shopping-cart" style={{ fontSize: 40 }} />
        <div style={{ fontSize: 14 }}>Carrinho vazio</div>
        <div style={{ fontSize: 12 }}>Selecione produtos no painel ao lado</div>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {itens.map((item, i) => (
          <div key={i} style={{ padding: '10px 16px', borderBottom: '1px solid #f3f4f6' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>{item.produto.nome}</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                  {item.quantidade} {item.produto.unidade} x {fmtReal(item.preco_unitario)}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#92400e' }}>{fmtReal(item.subtotal)}</div>
                <button onClick={() => onRemoverItem(i)} style={{ fontSize: 11, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 2 }}>
                  remover
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
              <span style={{ fontSize: 11, color: '#6b7280' }}>Desconto %</span>
              <input
                type="text"
                value={descontosEditando[i] ?? (item.desconto_pct > 0 ? String(item.desconto_pct) : '')}
                onChange={e => setDescontosEditando(prev => ({ ...prev, [i]: e.target.value }))}
                onBlur={() => handleDescontoBlur(i, item)}
                placeholder="0"
                style={{ width: 50, padding: '2px 6px', border: '1px solid #d1d5db', borderRadius: 5, fontSize: 12, textAlign: 'center' }}
              />
              {item.desconto_autorizado_por && (
                <span style={{ fontSize: 10, color: '#15803d', background: '#dcfce7', borderRadius: 4, padding: '1px 6px' }}>autorizado</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: '12px 16px', borderTop: '1px solid #e5e3dc', background: '#fff' }}>
        {totalDesconto > 0 && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
              <span>Subtotal</span><span>{fmtReal(totalBruto)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#ef4444', marginBottom: 4 }}>
              <span>Descontos</span><span>- {fmtReal(totalDesconto)}</span>
            </div>
          </>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700, color: '#1a1a2e', marginBottom: 14 }}>
          <span>TOTAL</span><span style={{ color: '#92400e' }}>{fmtReal(totalLiquido)}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn variante="cinza" onClick={onLimpar} style={{ flex: 1 }}>Limpar</Btn>
          <Btn
            onClick={() => {
              const semEstoque = itens.find(i => i.quantidade > i.produto.estoque_atual)
              if (semEstoque) {
                toast('warning', 'Estoque insuficiente')
                return
              }
              onFinalizar()
            }}
            disabled={itens.length === 0}
            style={{ flex: 2, background: '#E07B30', color: '#fff', border: '1.5px solid #E07B30', justifyContent: 'center' }}
          >
            Finalizar Venda
          </Btn>
        </div>
      </div>
    </div>
  )
}
