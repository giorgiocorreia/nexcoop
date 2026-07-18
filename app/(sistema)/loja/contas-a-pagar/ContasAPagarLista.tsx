'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { LojaCompraParcela } from '@/types/database'
import { PageLayout, MODULO_LOJA, COM_C } from '@/components/nexcoop/ui'
import ModalBaixaParcela from '@/components/loja/ModalBaixaParcela'

type ParcelaComCompra = LojaCompraParcela & {
  loja_compras: {
    numero_nf: string | null
    data_compra: string
    loja_fornecedores: { nome: string } | null
  } | null
}

interface Props {
  parcelas: ParcelaComCompra[]
  erro?: string
  orgId: string
  usuarioId: string
}

const STATUS_LABEL: Record<string, { label: string; bg: string; cor: string }> = {
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

export default function ContasAPagarLista({ parcelas: parcelasIniciais, erro, orgId, usuarioId }: Props) {
  const [parcelas, setParcelas] = useState(parcelasIniciais)
  const [parcelaBaixa, setParcelaBaixa] = useState<ParcelaComCompra | null>(null)

  const totalPendente = parcelas.reduce((sum, p) => sum + Number(p.valor), 0)

  function removerDaLista(id: string) {
    setParcelas(prev => prev.filter(p => p.id !== id))
  }

  return (
    <PageLayout titulo="Contas a pagar" icone="ti-cash-banknote" modulo={MODULO_LOJA}>
      {erro && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '12px 18px', marginBottom: 20, fontSize: 13, color: '#991b1b' }}>
          {erro}
        </div>
      )}

      <div style={{ background: COM_C.bg, borderRadius: 12, padding: '14px 18px', marginBottom: 20, display: 'inline-block' }}>
        <div style={{ fontSize: 11, color: COM_C.txtSub, marginBottom: 4 }}>Total pendente</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: COM_C.laranja }}>{fmtReal(totalPendente)}</div>
      </div>

      {parcelas.length === 0 ? (
        <div style={{ background: '#fff', border: `1px solid ${COM_C.borda}`, borderRadius: 12, padding: '32px 24px', textAlign: 'center', color: COM_C.txtSub, fontSize: 13 }}>
          Nenhuma parcela pendente ou vencida.
        </div>
      ) : (
        <div style={{ background: '#fff', border: `1px solid ${COM_C.borda}`, borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: 720 }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${COM_C.borda}`, background: '#fafaf9' }}>
                  {['Fornecedor', 'Compra', 'Parcela', 'Valor', 'Vencimento', 'Status', ''].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: COM_C.txtSub, whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parcelas.map(p => {
                  const st = STATUS_LABEL[p.status] ?? STATUS_LABEL.pendente
                  const compra = p.loja_compras
                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid #f0ede8' }}>
                      <td style={{ padding: '11px 12px', fontWeight: 600 }}>{compra?.loja_fornecedores?.nome ?? '—'}</td>
                      <td style={{ padding: '11px 12px' }}>
                        <Link href={`/loja/compras/${p.compra_id}`} style={{ color: COM_C.laranja, textDecoration: 'none' }}>
                          {compra?.numero_nf ? `NF ${compra.numero_nf}` : `#${p.compra_id.slice(0, 8)}`}
                        </Link>
                      </td>
                      <td style={{ padding: '11px 12px', color: COM_C.txtSub }}>{p.numero_parcela}/{p.total_parcelas}</td>
                      <td style={{ padding: '11px 12px', fontWeight: 600 }}>{fmtReal(p.valor)}</td>
                      <td style={{ padding: '11px 12px', color: COM_C.txtSub }}>{fmtData(p.data_vencimento)}</td>
                      <td style={{ padding: '11px 12px' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, background: st.bg, color: st.cor, padding: '2px 10px', borderRadius: 6 }}>
                          {st.label}
                        </span>
                      </td>
                      <td style={{ padding: '11px 12px' }}>
                        <button
                          onClick={() => setParcelaBaixa(p)}
                          style={{ padding: '5px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: COM_C.laranja, color: '#fff', border: 'none' }}
                        >
                          Dar baixa
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {parcelaBaixa && (
        <ModalBaixaParcela
          parcela={parcelaBaixa}
          orgId={orgId}
          usuarioId={usuarioId}
          onFechar={() => setParcelaBaixa(null)}
          onBaixada={() => { removerDaLista(parcelaBaixa.id); setParcelaBaixa(null) }}
        />
      )}
    </PageLayout>
  )
}
