'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { DashboardEstoque, ProdutoLoja } from '@/lib/loja/types'

interface ProdutoEstoque extends ProdutoLoja {
  valor_estoque: number
  loja_fornecedores?: { nome: string } | null
}

interface Props {
  dashboard: DashboardEstoque
  produtos: ProdutoEstoque[]
}

const LARANJA = '#E07B30'
const VERDE   = '#1D9E75'
const VERMELHO = '#dc2626'

function fmtReal(n: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

function fmtData(s: string | null) {
  if (!s) return '—'
  const [y, m, d] = s.split('-')
  return `${d}/${m}/${y}`
}

const inputStyle: React.CSSProperties = {
  padding: '7px 11px', fontSize: '13px', border: '1px solid #d5d3cc',
  borderRadius: '8px', background: '#fff', color: '#1a1a1a',
  outline: 'none', height: '34px', boxSizing: 'border-box',
}

const cardStyle: React.CSSProperties = {
  background: '#fff', border: '1px solid #e5e3dc',
  borderRadius: '12px', padding: '20px 24px',
}

export default function EstoqueClient({ dashboard, produtos }: Props) {
  const [filtro, setFiltro] = useState<'todos' | 'criticos' | 'ok'>('todos')
  const [busca, setBusca] = useState('')

  const filtrados = useMemo(() => {
    const q = busca.toLowerCase().trim()
    return produtos.filter(p => {
      const passaBusca = !q || p.nome.toLowerCase().includes(q)
      const critico = p.estoque_minimo != null && p.estoque_atual < p.estoque_minimo
      const passaFiltro =
        filtro === 'todos' ||
        (filtro === 'criticos' && critico) ||
        (filtro === 'ok' && !critico)
      return passaBusca && passaFiltro
    })
  }, [produtos, busca, filtro])

  return (
    <div style={{ maxWidth: '1100px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Cabeçalho */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#6b7280', marginBottom: '12px', fontWeight: 500 }}>
            <Link href="/dashboard" style={{ color: '#6b7280', textDecoration: 'none' }}>NexCoop</Link>
            <span style={{ color: '#d1d5db' }}>/</span>
            <Link href="/loja" style={{ color: '#6b7280', textDecoration: 'none' }}>Loja</Link>
            <span style={{ color: '#d1d5db' }}>/</span>
            <span style={{ color: '#1a1a1a' }}>Estoque</span>
          </div>
          <p style={{ margin: 0, color: '#888', fontSize: '13px', marginTop: '3px' }}>Posição atual, lotes e movimentações</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link href="/loja/compras/nova" style={{
            background: LARANJA, color: '#fff', padding: '9px 18px',
            borderRadius: '8px', fontSize: '13px', fontWeight: '600', textDecoration: 'none',
          }}>
            + Nova compra
          </Link>
          <Link href="/loja/estoque/ajuste" style={{
            background: '#fff', color: '#1a1a1a', padding: '9px 18px',
            border: '1px solid #d5d3cc', borderRadius: '8px', fontSize: '13px', fontWeight: '600', textDecoration: 'none',
          }}>
            Ajuste / Inventário
          </Link>
        </div>
      </div>

      {/* Cards resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '1.5rem' }}>
        <div style={cardStyle}>
          <div style={{ fontSize: '26px', fontWeight: '700', color: '#1a1a1a' }}>{dashboard.total_skus}</div>
          <div style={{ fontSize: '12px', color: '#888', marginTop: '3px' }}>SKUs ativos</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: '22px', fontWeight: '700', color: '#1a1a1a' }}>{fmtReal(dashboard.valor_total_estoque)}</div>
          <div style={{ fontSize: '12px', color: '#888', marginTop: '3px' }}>Valor total em estoque</div>
        </div>
        <div style={{ ...cardStyle, background: dashboard.qtd_criticos > 0 ? '#fff8f2' : '#fff', borderColor: dashboard.qtd_criticos > 0 ? LARANJA : '#e5e3dc' }}>
          <div style={{ fontSize: '26px', fontWeight: '700', color: dashboard.qtd_criticos > 0 ? VERMELHO : '#1a1a1a' }}>{dashboard.qtd_criticos}</div>
          <div style={{ fontSize: '12px', color: '#888', marginTop: '3px' }}>Produtos com estoque crítico</div>
        </div>
      </div>

      {/* Tabela posição de estoque */}
      <div style={{ ...cardStyle, marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <h2 style={{ margin: 0, fontSize: '15px', fontWeight: '700' }}>Posição de estoque</h2>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Buscar produto..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              style={{ ...inputStyle, width: '200px' }}
            />
            {(['todos', 'criticos', 'ok'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFiltro(f)}
                style={{
                  padding: '6px 14px', fontSize: '12px', fontWeight: '600',
                  borderRadius: '20px', border: 'none', cursor: 'pointer',
                  background: filtro === f ? LARANJA : '#f0ede8',
                  color: filtro === f ? '#fff' : '#555',
                }}
              >
                {f === 'todos' ? 'Todos' : f === 'criticos' ? 'Críticos' : 'OK'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e3dc' }}>
                {['Produto', 'Unidade', 'Saldo atual', 'Mínimo', 'Valor em estoque', 'Status'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#888', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#888' }}>Nenhum produto encontrado</td></tr>
              ) : filtrados.map(p => {
                const critico = p.estoque_minimo != null && p.estoque_atual < p.estoque_minimo
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f0ede8' }}>
                    <td style={{ padding: '10px', fontWeight: '600', color: '#1a1a1a' }}>{p.nome}</td>
                    <td style={{ padding: '10px', color: '#555' }}>{p.unidade}</td>
                    <td style={{ padding: '10px', fontWeight: '600', color: critico ? VERMELHO : '#1a1a1a' }}>
                      {Number(p.estoque_atual).toLocaleString('pt-BR', { maximumFractionDigits: 3 })}
                    </td>
                    <td style={{ padding: '10px', color: '#555' }}>
                      {p.estoque_minimo != null ? Number(p.estoque_minimo).toLocaleString('pt-BR', { maximumFractionDigits: 3 }) : '—'}
                    </td>
                    <td style={{ padding: '10px', color: '#555' }}>{fmtReal(p.valor_estoque)}</td>
                    <td style={{ padding: '10px' }}>
                      <span style={{
                        background: critico ? VERMELHO : VERDE,
                        color: '#fff', fontSize: '11px', fontWeight: '700',
                        padding: '3px 9px', borderRadius: '20px',
                      }}>
                        {critico ? 'Crítico' : 'OK'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Próximos vencimentos */}
      {dashboard.proximos_vencimentos.length > 0 && (
        <div style={{ ...cardStyle, marginBottom: '1.5rem' }}>
          <h2 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: '700' }}>Próximos vencimentos (≤ 30 dias)</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e3dc' }}>
                {['Produto', 'Lote', 'Quantidade', 'Validade', ''].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#888' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dashboard.proximos_vencimentos.map((lote: any) => (
                <tr key={lote.id} style={{ borderBottom: '1px solid #f0ede8' }}>
                  <td style={{ padding: '10px', fontWeight: '600' }}>{lote.produto_nome}</td>
                  <td style={{ padding: '10px', color: '#555' }}>{lote.numero_lote ?? '—'}</td>
                  <td style={{ padding: '10px' }}>{Number(lote.quantidade_atual).toLocaleString('pt-BR', { maximumFractionDigits: 3 })}</td>
                  <td style={{ padding: '10px' }}>{fmtData(lote.data_validade)}</td>
                  <td style={{ padding: '10px' }}>
                    <span style={{
                      background: lote.dias_restantes <= 7 ? VERMELHO : '#d97706',
                      color: '#fff', fontSize: '11px', fontWeight: '700',
                      padding: '3px 9px', borderRadius: '20px',
                    }}>
                      {lote.dias_restantes <= 7 ? `${lote.dias_restantes}d` : `${lote.dias_restantes}d`}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Estoque parado */}
      {dashboard.sem_movimento.length > 0 && (
        <div style={cardStyle}>
          <h2 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: '700' }}>Estoque parado (sem saída há 30+ dias)</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e3dc' }}>
                {['Produto', 'Saldo atual', 'Sem movimento (dias)'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#888' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dashboard.sem_movimento.map((p: any) => (
                <tr key={p.id} style={{ borderBottom: '1px solid #f0ede8' }}>
                  <td style={{ padding: '10px', fontWeight: '600' }}>{p.nome}</td>
                  <td style={{ padding: '10px' }}>{Number(p.estoque_atual).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} {p.unidade}</td>
                  <td style={{ padding: '10px', color: '#888' }}>≥ {p.dias_sem_movimento} dias</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  )
}
