'use client'

import { useEffect, useState } from 'react'
import { getBalancete } from '@/lib/contabil/actions'
import { ItemBalancete } from '@/lib/contabil/types'

const COR = '#0F766E'
const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function BalancetePage() {
  const anoAtual = new Date().getFullYear()
  const mesAtual = new Date().getMonth() + 1
  const [mes, setMes] = useState(mesAtual)
  const [ano, setAno] = useState(anoAtual)
  const [dados, setDados] = useState<ItemBalancete[]>([])
  const [loading, setLoading] = useState(false)
  const orgId = typeof window !== 'undefined' ? localStorage.getItem('org_id') || '' : ''

  useEffect(() => {
    if (!orgId) return
    setLoading(true)
    getBalancete(orgId, mes, ano).then(setDados).finally(() => setLoading(false))
  }, [mes, ano, orgId])

  const totalDebitos = dados.reduce((s, i) => s + i.debitos, 0)
  const totalCreditos = dados.reduce((s, i) => s + i.creditos, 0)

  return (
    <div style={{ padding: 32, maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e', margin: 0 }}>Balancete</h1>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>Saldos por conta contábil no período</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <select value={mes} onChange={e => setMes(Number(e.target.value))}
            style={{ padding: '8px 12px', border: '1px solid #e5e3dc', borderRadius: 8, fontSize: 13 }}>
            {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={ano} onChange={e => setAno(Number(e.target.value))}
            style={{ padding: '8px 12px', border: '1px solid #e5e3dc', borderRadius: 8, fontSize: 13 }}>
            {[anoAtual - 1, anoAtual, anoAtual + 1].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <p style={{ color: '#6b7280', fontSize: 13 }}>Carregando...</p>
      ) : dados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: '#fff', borderRadius: 12, border: '1px solid #e5e3dc' }}>
          <p style={{ color: '#6b7280' }}>Nenhum dado contábil para o período selecionado.</p>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e3dc', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#1a1a2e' }}>
                {['Código', 'Conta', 'Saldo Anterior', 'Débitos', 'Créditos', 'Saldo Atual'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: h === 'Código' || h === 'Conta' ? 'left' : 'right', fontSize: 12, color: '#fff', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dados.map((item, i) => (
                <tr key={item.conta_id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#f8f7f4', fontWeight: item.nivel <= 2 ? 600 : 400 }}>
                  <td style={{ padding: '9px 14px', fontSize: 12, color: '#6b7280' }}>{item.codigo}</td>
                  <td style={{ padding: '9px 14px', fontSize: 13, paddingLeft: `${14 + (item.nivel - 1) * 12}px` }}>{item.nome}</td>
                  <td style={{ padding: '9px 14px', fontSize: 13, textAlign: 'right' }}>{fmt(item.saldo_anterior)}</td>
                  <td style={{ padding: '9px 14px', fontSize: 13, textAlign: 'right', color: '#1d4ed8' }}>{fmt(item.debitos)}</td>
                  <td style={{ padding: '9px 14px', fontSize: 13, textAlign: 'right', color: '#166534' }}>{fmt(item.creditos)}</td>
                  <td style={{ padding: '9px 14px', fontSize: 13, textAlign: 'right', fontWeight: 700, color: item.saldo_atual >= 0 ? '#166534' : '#dc2626' }}>
                    {fmt(item.saldo_atual)}
                  </td>
                </tr>
              ))}
              <tr style={{ background: '#f0fdf9', fontWeight: 700 }}>
                <td colSpan={3} style={{ padding: '10px 14px', fontSize: 13 }}>Totais do Período</td>
                <td style={{ padding: '10px 14px', fontSize: 13, textAlign: 'right', color: '#1d4ed8' }}>{fmt(totalDebitos)}</td>
                <td style={{ padding: '10px 14px', fontSize: 13, textAlign: 'right', color: '#166534' }}>{fmt(totalCreditos)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
