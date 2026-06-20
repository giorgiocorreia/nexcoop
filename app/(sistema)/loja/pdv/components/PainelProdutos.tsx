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
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const filtrados = produtos.filter(p =>
    p.ativo && p.nome.toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Busca */}
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

      {/* Header da lista */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 80px 100px 80px',
        padding: '8px 16px', borderBottom: '1px solid #e5e3dc',
        background: '#fafaf9',
      }}>
        {['Produto', 'Unidade', 'Preço', 'Estoque'].map(h => (
          <div key={h} style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {h}
          </div>
        ))}
      </div>

      {/* Lista */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filtrados.length === 0 && (
          <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: 14, padding: '32px 0' }}>
            Nenhum produto encontrado
          </div>
        )}
        {filtrados.map(produto => {
          const esgotado  = produto.estoque_atual <= 0
          const temDesconto = produto.desconto_cooperado && cooperadoIdentificado && (produto.desconto_cooperado_pct ?? 0) > 0
          const hovered   = hoveredId === produto.id

          return (
            <div
              key={produto.id}
              onClick={() => !esgotado && onSelecionarProduto(produto)}
              onMouseEnter={() => !esgotado && setHoveredId(produto.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                display: 'grid', gridTemplateColumns: '1fr 80px 100px 80px',
                padding: '10px 16px',
                borderBottom: '1px solid #f5f5f4',
                background: esgotado ? '#fafaf9' : hovered ? '#fff8f3' : '#fff',
                cursor: esgotado ? 'not-allowed' : 'pointer',
                opacity: esgotado ? 0.6 : 1,
                transition: 'background 0.1s',
                borderLeft: hovered && !esgotado ? '3px solid #E07B30' : '3px solid transparent',
              }}
            >
              {/* Nome + badges */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#1a1a2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {produto.nome}
                </span>
                {esgotado && (
                  <span style={{ fontSize: 10, fontWeight: 600, background: '#f3f4f6', color: '#6b7280', borderRadius: 4, padding: '2px 6px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    Esgotado
                  </span>
                )}
                {temDesconto && (
                  <span style={{ fontSize: 10, fontWeight: 700, background: '#E07B30', color: '#fff', borderRadius: 4, padding: '2px 6px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    -{produto.desconto_cooperado_pct}%
                  </span>
                )}
              </div>

              {/* Unidade */}
              <div style={{ fontSize: 12, color: '#6b7280', alignSelf: 'center' }}>
                {produto.unidade}
              </div>

              {/* Preço */}
              <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e', alignSelf: 'center' }}>
                {fmtReal(produto.preco_normal)}
                {temDesconto && (
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#E07B30' }}>
                    {fmtReal(produto.preco_normal * (1 - (produto.desconto_cooperado_pct ?? 0) / 100))}
                  </div>
                )}
              </div>

              {/* Estoque */}
              <div style={{
                fontSize: 12, fontWeight: 600, alignSelf: 'center',
                color: esgotado ? '#dc2626' : produto.estoque_minimo && produto.estoque_atual <= produto.estoque_minimo ? '#d97706' : '#15803d',
              }}>
                {produto.estoque_atual} {produto.unidade}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
