'use client'

import { useState, useEffect, useRef } from 'react'
import type { ProdutoLoja } from '@/lib/loja/types'
import { fmtReal } from '@/lib/comercializacao/fmt'

interface Props {
  produtos: ProdutoLoja[]
  cooperadoIdentificado: boolean
  onSelecionarProduto: (produto: ProdutoLoja) => void
}

export default function PainelProdutos({ produtos, cooperadoIdentificado, onSelecionarProduto }: Props) {
  const [busca, setBusca] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const filtrados = produtos.filter(p =>
    p.ativo && p.nome.toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e3dc' }}>
        <div style={{ position: 'relative' }}>
          <i className="ti ti-search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 16 }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Buscar produto..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            style={{
              width: '100%', padding: '9px 12px 9px 34px',
              border: '1.5px solid #d1d5db', borderRadius: 8,
              fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#fff',
            }}
          />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10, alignContent: 'start' }}>
        {filtrados.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#9ca3af', fontSize: 14, padding: '32px 0' }}>
            Nenhum produto encontrado
          </div>
        )}
        {filtrados.map(produto => {
          const esgotado = produto.estoque_atual <= 0
          const temDesconto = produto.desconto_cooperado && cooperadoIdentificado && (produto.desconto_cooperado_pct ?? 0) > 0

          return (
            <button
              key={produto.id}
              onClick={() => !esgotado && onSelecionarProduto(produto)}
              disabled={esgotado}
              style={{
                background: esgotado ? '#f9fafb' : '#fff',
                border: `1.5px solid ${esgotado ? '#e5e7eb' : '#e5e3dc'}`,
                borderRadius: 10, padding: '12px 10px', cursor: esgotado ? 'not-allowed' : 'pointer',
                textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 4,
                opacity: esgotado ? 0.6 : 1, transition: 'border-color .15s',
              }}
              onMouseEnter={e => { if (!esgotado) (e.currentTarget as HTMLElement).style.borderColor = '#E07B30' }}
              onMouseLeave={e => { if (!esgotado) (e.currentTarget as HTMLElement).style.borderColor = '#e5e3dc' }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', lineHeight: 1.3 }}>{produto.nome}</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>{produto.unidade}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#92400e', marginTop: 4 }}>{fmtReal(produto.preco_normal)}</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 2 }}>
                {esgotado && <span style={{ fontSize: 10, fontWeight: 600, background: '#f3f4f6', color: '#6b7280', borderRadius: 4, padding: '2px 6px' }}>Esgotado</span>}
                {temDesconto && <span style={{ fontSize: 10, fontWeight: 700, background: '#E07B30', color: '#fff', borderRadius: 4, padding: '2px 6px' }}>-{produto.desconto_cooperado_pct}%</span>}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
