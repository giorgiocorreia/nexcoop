'use client'

import { useEffect, useState } from 'react'
import { listarParcelasDaCompra } from '@/lib/loja/actions'
import type { LojaCompraParcela } from '@/types/database'
import ModalBaixaParcela from '@/components/loja/ModalBaixaParcela'

interface Props {
  compraId: string
  orgId: string
  usuarioId: string
}

const C = {
  laranja: '#E07B30', borda: '#E5E3DC', txt: '#1C1917', txtSub: '#78716C',
}

const STATUS_LABEL: Record<string, { label: string; bg: string; cor: string }> = {
  pago:     { label: 'Pago',     bg: '#f0fdf4', cor: '#16a34a' },
  pendente: { label: 'Pendente', bg: '#fffbeb', cor: '#d97706' },
  vencido:  { label: 'Vencido',  bg: '#fef2f2', cor: '#dc2626' },
}

function fmtReal(n: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

function fmtData(s: string | null) {
  if (!s) return '—'
  const [y, m, d] = s.split('-')
  return `${d}/${m}/${y}`
}

export default function PainelParcelas({ compraId, orgId, usuarioId }: Props) {
  const [parcelas, setParcelas] = useState<LojaCompraParcela[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [parcelaBaixa, setParcelaBaixa] = useState<LojaCompraParcela | null>(null)

  async function carregar() {
    setCarregando(true)
    const res = await listarParcelasDaCompra(compraId)
    setCarregando(false)
    if ('error' in res) { setErro(res.error ?? ''); return }
    setParcelas((res.data ?? []) as LojaCompraParcela[])
  }

  useEffect(() => { carregar() }, [compraId])

  if (carregando) return null
  if (parcelas.length === 0) return null

  return (
    <div style={{ background: '#fff', border: `1px solid ${C.borda}`, borderRadius: '12px', padding: '20px 24px', marginBottom: '1.25rem' }}>
      <h2 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '700', color: C.txt }}>Parcelas</h2>

      {erro && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 13, color: '#991b1b' }}>
          {erro}
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: 560 }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${C.borda}`, background: '#fafaf9' }}>
              {['Parcela', 'Valor', 'Vencimento', 'Status', 'Pagamento', ''].map(h => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: C.txtSub, whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {parcelas.map(p => {
              const st = STATUS_LABEL[p.status]
              return (
                <tr key={p.id} style={{ borderBottom: '1px solid #f0ede8' }}>
                  <td style={{ padding: '11px 12px' }}>{p.numero_parcela}/{p.total_parcelas}</td>
                  <td style={{ padding: '11px 12px', fontWeight: 600 }}>{fmtReal(p.valor)}</td>
                  <td style={{ padding: '11px 12px', color: C.txtSub }}>{fmtData(p.data_vencimento)}</td>
                  <td style={{ padding: '11px 12px' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, background: st.bg, color: st.cor, padding: '2px 10px', borderRadius: 6 }}>
                      {st.label}
                    </span>
                  </td>
                  <td style={{ padding: '11px 12px', color: C.txtSub }}>
                    {p.status === 'pago' ? `${p.forma_pagamento} — ${fmtData(p.data_pagamento)}` : '—'}
                  </td>
                  <td style={{ padding: '11px 12px' }}>
                    {p.status !== 'pago' && (
                      <button
                        onClick={() => setParcelaBaixa(p)}
                        style={{ padding: '5px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: C.laranja, color: '#fff', border: 'none' }}
                      >
                        Dar baixa
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {parcelaBaixa && (
        <ModalBaixaParcela
          parcela={parcelaBaixa}
          orgId={orgId}
          usuarioId={usuarioId}
          onFechar={() => setParcelaBaixa(null)}
          onBaixada={() => { setParcelaBaixa(null); carregar() }}
        />
      )}
    </div>
  )
}
