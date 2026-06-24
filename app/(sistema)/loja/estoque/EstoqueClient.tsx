'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Btn } from '@/components/ui/Btn'
import type { DashboardEstoque, ProdutoLoja } from '@/lib/loja/types'

interface ProdutoEstoque extends ProdutoLoja {
  valor_estoque: number
  loja_fornecedores?: { nome: string } | null
}

interface Props {
  dashboard: DashboardEstoque
  produtos: ProdutoEstoque[]
}

const C = {
  laranja: '#E07B30', laranjaLt: '#FFF7ED',
  verde: '#1D9E75',   verdeLt: '#F0FDF4',
  vermelho: '#DC2626', vermelhoLt: '#FEF2F2',
  borda: '#E5E3DC', bg: '#F8F7F4',
  txt: '#1C1917', txtSub: '#78716C',
}

function fmtReal(n: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

function fmtData(s: string | null) {
  if (!s) return '—'
  const [y, m, d] = s.split('-')
  return `${d}/${m}/${y}`
}

const inputStyle: React.CSSProperties = {
  padding: '7px 11px', fontSize: '13px', border: `1px solid ${C.borda}`,
  borderRadius: '8px', background: '#fff', color: C.txt,
  outline: 'none', height: '34px', boxSizing: 'border-box',
}

export default function EstoqueClient({ dashboard, produtos }: Props) {
  const router = useRouter()
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

  const qtdCriticos = dashboard.qtd_criticos

  return (
    <>
      <style>{`
        .est-header  { padding: 0 32px; min-height: 88px; display: flex; align-items: center; }
        .est-content { padding: 28px 32px; }
        .est-toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; flex-wrap: wrap; gap: 10px; }
        .est-filtros { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
        @media (max-width: 640px) {
          .est-header  { padding: 0 16px 0 56px; min-height: 60px; }
          .est-content { padding: 16px; }
          .est-toolbar { flex-direction: column; align-items: stretch; }
          .est-filtros { overflow-x: auto; flex-wrap: nowrap; }
        }
      `}</style>

      <header className="est-header" style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: '#fff', borderBottom: `1px solid ${C.borda}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, margin: '0 -2rem 0 -2rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10, flexShrink: 0,
            background: C.laranjaLt, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <i className="ti ti-package" style={{ fontSize: 20, color: C.laranja }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{ fontSize: 19, fontWeight: 800, color: C.txt, margin: 0, lineHeight: 1.2 }}>
                Estoque
              </h1>
              {qtdCriticos > 0 && (
                <span style={{
                  background: C.vermelhoLt, color: C.vermelho,
                  fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                }}>
                  {qtdCriticos} crítico{qtdCriticos !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: C.txtSub, marginTop: 2 }}>
              <Link href="/loja" style={{ color: C.txtSub, textDecoration: 'none' }}>Loja Agropecuária</Link>
              {' / '}Estoque
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <Link href="/loja/estoque/ajuste" style={{
            padding: '8px 14px', background: '#fff', color: C.txt,
            border: `1px solid ${C.borda}`, borderRadius: 8, fontSize: 13, fontWeight: 600,
            textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            <i className="ti ti-adjustments" style={{ fontSize: 15 }} />
            Ajuste
          </Link>
          <Link href="/loja/compras/nova" style={{
            padding: '9px 18px', background: C.laranja, color: '#fff',
            borderRadius: 8, fontSize: 13, fontWeight: 600,
            textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6,
            whiteSpace: 'nowrap',
          }}>
            <i className="ti ti-plus" style={{ fontSize: 15 }} />
            Nova compra
          </Link>
        </div>
      </header>

      <div className="est-content" style={{ background: C.bg, margin: '0 -2rem -2rem -2rem', minHeight: 'calc(100vh - 88px)' }}>

        {/* Toolbar */}
        <div className="est-toolbar">
          <div className="est-filtros">
            <input
              type="text"
              placeholder="Buscar produto..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              style={{ ...inputStyle, width: 200 }}
            />
            {(['todos', 'criticos', 'ok'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFiltro(f)}
                style={{
                  padding: '6px 14px', fontSize: '12px', fontWeight: '600',
                  borderRadius: 20, border: 'none', cursor: 'pointer',
                  background: filtro === f ? C.laranja : '#f0ede8',
                  color: filtro === f ? '#fff' : C.txtSub,
                  whiteSpace: 'nowrap',
                }}
              >
                {f === 'todos' ? 'Todos' : f === 'criticos' ? 'Críticos' : 'OK'}
              </button>
            ))}
          </div>
          <span style={{ fontSize: 12, color: C.txtSub, whiteSpace: 'nowrap' }}>
            {dashboard.total_skus} SKUs · {fmtReal(dashboard.valor_total_estoque)} em estoque
          </span>
        </div>

        {/* Tabela posição de estoque */}
        <div style={{
          background: '#fff', border: `1px solid ${C.borda}`, borderRadius: 14,
          overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', marginBottom: 16,
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 680 }}>
              <thead>
                <tr style={{ background: '#fafaf9', borderBottom: `1px solid ${C.borda}` }}>
                  {['Produto', 'Unidade', 'Saldo atual', 'Mínimo', 'Valor em estoque', 'Status', ''].map(h => (
                    <th key={h} style={{
                      padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '0.05em', color: C.txtSub, whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: C.txtSub }}>Nenhum produto encontrado</td></tr>
                ) : filtrados.map(p => {
                  const critico = p.estoque_minimo != null && p.estoque_atual < p.estoque_minimo
                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid #f5f5f4' }}>
                      <td style={{ padding: '11px 14px', fontWeight: 600, color: C.txt }}>{p.nome}</td>
                      <td style={{ padding: '11px 14px', color: C.txtSub }}>{p.unidade}</td>
                      <td style={{ padding: '11px 14px', fontWeight: 600, color: critico ? C.vermelho : C.txt }}>
                        {Number(p.estoque_atual).toLocaleString('pt-BR', { maximumFractionDigits: 3 })}
                      </td>
                      <td style={{ padding: '11px 14px', color: C.txtSub }}>
                        {p.estoque_minimo != null
                          ? Number(p.estoque_minimo).toLocaleString('pt-BR', { maximumFractionDigits: 3 })
                          : '—'}
                      </td>
                      <td style={{ padding: '11px 14px', color: C.txtSub }}>{fmtReal(p.valor_estoque)}</td>
                      <td style={{ padding: '11px 14px' }}>
                        <span style={{
                          background: critico ? C.vermelhoLt : C.verdeLt,
                          color: critico ? C.vermelho : C.verde,
                          fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 6,
                        }}>
                          {critico ? 'Crítico' : 'OK'}
                        </span>
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        <Btn tamanho="sm" variante="cinza" icone="ti-shopping-cart"
                          onClick={() => router.push(`/loja/compras/nova?produto=${p.id}`)}>
                          Comprar
                        </Btn>
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
          <div style={{
            background: '#fff', border: `1px solid ${C.borda}`, borderRadius: 14,
            overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', marginBottom: 16,
          }}>
            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.borda}` }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.txt }}>Próximos vencimentos (≤ 30 dias)</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 500 }}>
                <thead>
                  <tr style={{ background: '#fafaf9', borderBottom: `1px solid ${C.borda}` }}>
                    {['Produto', 'Lote', 'Quantidade', 'Validade', ''].map(h => (
                      <th key={h} style={{
                        padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '0.05em', color: C.txtSub,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dashboard.proximos_vencimentos.map((lote: any) => (
                    <tr key={lote.id} style={{ borderBottom: '1px solid #f5f5f4' }}>
                      <td style={{ padding: '11px 14px', fontWeight: 600, color: C.txt }}>{lote.produto_nome}</td>
                      <td style={{ padding: '11px 14px', color: C.txtSub }}>{lote.numero_lote ?? '—'}</td>
                      <td style={{ padding: '11px 14px' }}>
                        {Number(lote.quantidade_atual).toLocaleString('pt-BR', { maximumFractionDigits: 3 })}
                      </td>
                      <td style={{ padding: '11px 14px' }}>{fmtData(lote.data_validade)}</td>
                      <td style={{ padding: '11px 14px' }}>
                        <span style={{
                          background: lote.dias_restantes <= 7 ? C.vermelhoLt : '#FEF9C3',
                          color: lote.dias_restantes <= 7 ? C.vermelho : '#854D0E',
                          fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 6,
                        }}>
                          {lote.dias_restantes}d
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Estoque parado */}
        {dashboard.sem_movimento.length > 0 && (
          <div style={{
            background: '#fff', border: `1px solid ${C.borda}`, borderRadius: 14,
            overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          }}>
            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.borda}` }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.txt }}>Estoque parado (sem saída há 30+ dias)</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 400 }}>
                <thead>
                  <tr style={{ background: '#fafaf9', borderBottom: `1px solid ${C.borda}` }}>
                    {['Produto', 'Saldo atual', 'Sem movimento'].map(h => (
                      <th key={h} style={{
                        padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '0.05em', color: C.txtSub,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dashboard.sem_movimento.map((p: any) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #f5f5f4' }}>
                      <td style={{ padding: '11px 14px', fontWeight: 600, color: C.txt }}>{p.nome}</td>
                      <td style={{ padding: '11px 14px' }}>
                        {Number(p.estoque_atual).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} {p.unidade}
                      </td>
                      <td style={{ padding: '11px 14px', color: C.txtSub }}>≥ {p.dias_sem_movimento} dias</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
