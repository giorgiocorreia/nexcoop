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

const C = { laranja: '#E07B30', laranjaLt: '#FFF7ED', borda: '#E5E3DC', bg: '#F8F7F4', txt: '#1C1917', txtSub: '#78716C' }

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

export default function ComprasLista({ compras, fornecedores, sucesso }: Props) {
  const router = useRouter()
  const [filtroForn, setFiltroForn] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [hovered, setHovered] = useState<string | null>(null)

  const filtradas = useMemo(() => {
    return compras.filter(c => {
      const passaForn  = !filtroForn  || c.fornecedor_id === filtroForn
      const passaInicio = !dataInicio || c.data_compra >= dataInicio
      const passaFim   = !dataFim    || c.data_compra <= dataFim
      return passaForn && passaInicio && passaFim
    })
  }, [compras, filtroForn, dataInicio, dataFim])

  const totalGeral = filtradas.reduce((sum, c) => sum + (c.total ?? 0), 0)

  return (
    <>
      <style>{`
        .comp-header  { padding: 0 32px; min-height: 88px; }
        .comp-content { padding: 28px 32px; }
        @media (max-width: 640px) {
          .comp-header  { padding: 0 16px 0 56px; min-height: 60px; }
          .comp-content { padding: 16px; }
        }
      `}</style>

      {/* Header sticky */}
      <header className="comp-header" style={{
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
            <i className="ti ti-shopping-cart" style={{ fontSize: 20, color: C.laranja }} />
          </div>
          <div>
            <h1 style={{ fontSize: 19, fontWeight: 800, color: C.txt, margin: 0, lineHeight: 1.2 }}>
              Compras
            </h1>
            <div style={{ fontSize: 12, color: C.txtSub, marginTop: 2 }}>
              <Link href="/loja" style={{ color: C.txtSub, textDecoration: 'none' }}>Loja Agropecuária</Link>
              {' / '}Compras
            </div>
          </div>
        </div>
        <Link href="/loja/compras/nova" style={{
          padding: '9px 18px', background: C.laranja, color: '#fff',
          borderRadius: 8, fontSize: 13, fontWeight: 600,
          textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6,
          whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          <i className="ti ti-plus" style={{ fontSize: 15 }} />
          Nova compra
        </Link>
      </header>

      {/* Conteúdo */}
      <div className="comp-content" style={{ background: C.bg, margin: '0 -2rem -2rem -2rem', minHeight: 'calc(100vh - 88px)' }}>

        {sucesso && (
          <div style={{
            background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10,
            padding: '12px 18px', marginBottom: 20, fontSize: 13,
            color: '#166534', fontWeight: 600,
          }}>
            Compra registrada com sucesso.
          </div>
        )}

        {/* Filtros */}
        <div style={{
          background: '#fff', border: `1px solid ${C.borda}`, borderRadius: 14,
          padding: '14px 20px', marginBottom: 16,
          display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}>
          <select value={filtroForn} onChange={e => setFiltroForn(e.target.value)} style={{ ...inputStyle, width: 200 }}>
            <option value="">Todos os fornecedores</option>
            {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
          </select>
          <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} style={inputStyle} title="Data início" />
          <span style={{ color: C.txtSub, fontSize: 13 }}>até</span>
          <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} style={inputStyle} title="Data fim" />
          {(filtroForn || dataInicio || dataFim) && (
            <Btn variante="cinza" tamanho="sm" onClick={() => { setFiltroForn(''); setDataInicio(''); setDataFim('') }}>
              Limpar filtros
            </Btn>
          )}
        </div>

        {/* Tabela */}
        <div style={{ background: '#fff', border: `1px solid ${C.borda}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: `1px solid ${C.borda}` }}>
            <span style={{ fontSize: 13, color: C.txtSub }}>
              {filtradas.length} compra{filtradas.length !== 1 ? 's' : ''}
            </span>
            {filtradas.length > 0 && (
              <span style={{ fontSize: 13, fontWeight: 700, color: C.txt }}>
                Total: {fmtReal(totalGeral)}
              </span>
            )}
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 650 }}>
              <thead>
                <tr style={{ background: '#fafaf9', borderBottom: `1px solid ${C.borda}` }}>
                  {['Data', 'Fornecedor', 'Nº NF', 'Mercadorias', 'Frete', 'Outros', 'Total'].map(h => (
                    <th key={h} style={{
                      padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '0.05em', color: C.txtSub, whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtradas.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: C.txtSub }}>Nenhuma compra registrada</td></tr>
                ) : filtradas.map((c, i) => {
                  const fornecedorNome = (c.loja_fornecedores as any)?.nome ?? '—'
                  const totalMerc = c.total - (c.valor_frete ?? 0) - (c.outros_custos_valor ?? 0)
                  return (
                    <tr
                      key={c.id}
                      onClick={() => router.push(`/loja/compras/${c.id}`)}
                      onMouseEnter={() => setHovered(c.id)}
                      onMouseLeave={() => setHovered(null)}
                      style={{
                        borderBottom: '1px solid #f5f5f4', cursor: 'pointer',
                        background: hovered === c.id ? '#fafaf8' : i % 2 === 0 ? '#fff' : '#fafaf9',
                      }}
                    >
                      <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>{fmtData(c.data_compra)}</td>
                      <td style={{ padding: '11px 14px', fontWeight: 600 }}>{fornecedorNome}</td>
                      <td style={{ padding: '11px 14px', color: C.txtSub }}>{c.numero_nf ?? '—'}</td>
                      <td style={{ padding: '11px 14px' }}>{fmtReal(totalMerc)}</td>
                      <td style={{ padding: '11px 14px', color: C.txtSub }}>{fmtReal(c.valor_frete ?? 0)}</td>
                      <td style={{ padding: '11px 14px', color: C.txtSub }}>{fmtReal(c.outros_custos_valor ?? 0)}</td>
                      <td style={{ padding: '11px 14px', fontWeight: 700, color: C.laranja }}>{fmtReal(c.total)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
