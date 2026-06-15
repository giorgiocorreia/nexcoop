'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { LojaCompra, LojaFornecedor } from '@/types/database'
import { Btn } from '@/components/ui/Btn'

type CompraComFornecedor = LojaCompra & { loja_fornecedores: { nome: string } | null }

interface Props {
  compras: CompraComFornecedor[]
  fornecedores: Pick<LojaFornecedor, 'id' | 'nome'>[]
  sucesso?: boolean
}

const LARANJA = '#E07B30'

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

export default function ComprasLista({ compras, fornecedores, sucesso }: Props) {
  const router = useRouter()
  const [filtroForn, setFiltroForn] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [hovered, setHovered] = useState<string | null>(null)

  const filtradas = useMemo(() => {
    return compras.filter(c => {
      const passaForn = !filtroForn || c.fornecedor_id === filtroForn
      const passaInicio = !dataInicio || c.data_compra >= dataInicio
      const passaFim = !dataFim || c.data_compra <= dataFim
      return passaForn && passaInicio && passaFim
    })
  }, [compras, filtroForn, dataInicio, dataFim])

  const totalGeral = filtradas.reduce((sum, c) => sum + (c.total ?? 0), 0)

  return (
    <div style={{ maxWidth: '1100px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {sucesso && (
        <div style={{
          background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '10px',
          padding: '12px 18px', marginBottom: '1.5rem', fontSize: '13px',
          color: '#166534', fontWeight: '600',
        }}>
          Compra registrada com sucesso.
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#6b7280', marginBottom: '12px', fontWeight: 500 }}>
            <Link href="/dashboard" style={{ color: '#6b7280', textDecoration: 'none' }}>NexCoop</Link>
            <span style={{ color: '#d1d5db' }}>/</span>
            <Link href="/loja" style={{ color: '#6b7280', textDecoration: 'none' }}>Loja</Link>
            <span style={{ color: '#d1d5db' }}>/</span>
            <span style={{ color: '#1a1a1a' }}>Compras</span>
          </div>
          <p style={{ margin: 0, color: '#888', fontSize: '13px', marginTop: '3px' }}>Histórico de entradas de mercadoria</p>
        </div>
        <Link href="/loja/compras/nova" style={{
          background: LARANJA, color: '#fff', padding: '9px 18px',
          borderRadius: '8px', fontSize: '13px', fontWeight: '600', textDecoration: 'none',
        }}>
          + Nova compra
        </Link>
      </div>

      {/* Filtros */}
      <div style={{
        background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px',
        padding: '16px 20px', marginBottom: '1rem',
        display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center',
      }}>
        <select value={filtroForn} onChange={e => setFiltroForn(e.target.value)} style={{ ...inputStyle, width: '200px' }}>
          <option value="">Todos os fornecedores</option>
          {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
        </select>
        <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} style={inputStyle} title="Data início" />
        <span style={{ color: '#888', fontSize: '13px' }}>até</span>
        <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} style={inputStyle} title="Data fim" />
        {(filtroForn || dataInicio || dataFim) && (
          <Btn variante="cinza" tamanho="sm" onClick={() => { setFiltroForn(''); setDataInicio(''); setDataFim('') }}>
            Limpar filtros
          </Btn>
        )}
      </div>

      {/* Tabela */}
      <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: '#888' }}>{filtradas.length} compra{filtradas.length !== 1 ? 's' : ''}</span>
          {filtradas.length > 0 && (
            <span style={{ fontSize: '13px', fontWeight: '700', color: '#1a1a1a' }}>
              Total: {fmtReal(totalGeral)}
            </span>
          )}
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e3dc' }}>
                {['Data', 'Fornecedor', 'Nº NF', 'Total mercadorias', 'Frete', 'Outros custos', 'Total geral'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#888', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '28px', textAlign: 'center', color: '#888' }}>Nenhuma compra registrada</td></tr>
              ) : filtradas.map(c => {
                const fornecedorNome = (c.loja_fornecedores as any)?.nome ?? '—'
                const totalMercadorias = c.total - (c.valor_frete ?? 0) - (c.outros_custos_valor ?? 0)
                return (
                  <tr
                    key={c.id}
                    onClick={() => router.push(`/loja/compras/${c.id}`)}
                    onMouseEnter={() => setHovered(c.id)}
                    onMouseLeave={() => setHovered(null)}
                    style={{
                      borderBottom: '1px solid #f0ede8',
                      cursor: 'pointer',
                      background: hovered === c.id ? '#fafaf8' : 'transparent',
                    }}
                  >
                    <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>{fmtData(c.data_compra)}</td>
                    <td style={{ padding: '10px', fontWeight: '600' }}>{fornecedorNome}</td>
                    <td style={{ padding: '10px', color: '#555' }}>{c.numero_nf ?? '—'}</td>
                    <td style={{ padding: '10px' }}>{fmtReal(totalMercadorias)}</td>
                    <td style={{ padding: '10px', color: '#555' }}>{fmtReal(c.valor_frete ?? 0)}</td>
                    <td style={{ padding: '10px', color: '#555' }}>{fmtReal(c.outros_custos_valor ?? 0)}</td>
                    <td style={{ padding: '10px', fontWeight: '700', color: LARANJA }}>{fmtReal(c.total)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
