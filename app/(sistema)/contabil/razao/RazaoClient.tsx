'use client'

import { useEffect, useState } from 'react'
import { getPlanoContas, getLivroRazao } from '@/lib/contabil/actions'
import { ItemLivroRazao, ContaContabil } from '@/lib/contabil/types'
import BotaoAjuda from '@/components/BotaoAjuda'

const COR = '#0F766E'

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function RazaoClient({ orgId }: { orgId: string }) {
  const anoAtual = new Date().getFullYear()
  const [contas, setContas] = useState<ContaContabil[]>([])
  const [contaSel, setContaSel] = useState('')
  const [dataInicio, setDataInicio] = useState(`${anoAtual}-01-01`)
  const [dataFim, setDataFim] = useState(`${anoAtual}-12-31`)
  const [itens, setItens] = useState<ItemLivroRazao[]>([])
  const [loading, setLoading] = useState(false)
  const [buscou, setBuscou] = useState(false)

  useEffect(() => {
    getPlanoContas(orgId).then(tree => {
      const flat: ContaContabil[] = []
      function flatten(cs: ContaContabil[]) {
        cs.forEach(c => { if (c.aceita_lancamento) flat.push(c); if (c.filhos) flatten(c.filhos) })
      }
      flatten(tree)
      setContas(flat)
    })
  }, [orgId])

  async function handleBuscar() {
    if (!contaSel) return
    setLoading(true); setBuscou(true)
    try {
      const data = await getLivroRazao(orgId, contaSel, dataInicio, dataFim)
      setItens(data)
    } finally {
      setLoading(false)
    }
  }

  const totalDebitos = itens.reduce((s, i) => s + i.debito, 0)
  const totalCreditos = itens.reduce((s, i) => s + i.credito, 0)
  const contaNome = contas.find(c => c.id === contaSel)

  return (
    <div style={{ padding: 32, maxWidth: 960, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e', margin: 0 }}>Livro Razão</h1>
        <BotaoAjuda chave="manual_contabil_url" />
      </div>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>Movimentações detalhadas por conta contábil</p>

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e3dc', padding: 20, marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 2, minWidth: 220 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Conta Contábil</label>
            <select value={contaSel} onChange={e => setContaSel(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e3dc', borderRadius: 8, fontSize: 13 }}>
              <option value=''>Selecione a conta...</option>
              {contas.map(c => <option key={c.id} value={c.id}>{c.codigo} — {c.nome}</option>)}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Data Início</label>
            <input type='date' value={dataInicio} onChange={e => setDataInicio(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e3dc', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Data Fim</label>
            <input type='date' value={dataFim} onChange={e => setDataFim(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e3dc', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
          </div>
          <button onClick={handleBuscar} disabled={!contaSel || loading}
            style={{ padding: '9px 20px', background: COR, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </div>
      </div>

      {buscou && !loading && (
        itens.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, background: '#fff', borderRadius: 12, border: '1px solid #e5e3dc', color: '#6b7280' }}>
            Nenhuma movimentação para esta conta no período.
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e3dc', overflow: 'hidden' }}>
            <div style={{ background: '#1a1a2e', padding: '12px 16px' }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: '#fff' }}>
                {contaNome?.codigo} — {contaNome?.nome}
              </span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f7f4' }}>
                  {['Data', 'Descrição', 'Histórico', 'Débito', 'Crédito', 'Saldo'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: ['Débito','Crédito','Saldo'].includes(h) ? 'right' : 'left', fontSize: 12, fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e3dc' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {itens.map((item, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#f8f7f4' }}>
                    <td style={{ padding: '9px 14px', fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>
                      {new Date(item.data + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </td>
                    <td style={{ padding: '9px 14px', fontSize: 13 }}>{item.descricao}</td>
                    <td style={{ padding: '9px 14px', fontSize: 12, color: '#6b7280' }}>{item.historico || '—'}</td>
                    <td style={{ padding: '9px 14px', fontSize: 13, textAlign: 'right', color: item.debito > 0 ? '#1d4ed8' : '#9ca3af' }}>
                      {item.debito > 0 ? fmt(item.debito) : '—'}
                    </td>
                    <td style={{ padding: '9px 14px', fontSize: 13, textAlign: 'right', color: item.credito > 0 ? '#166534' : '#9ca3af' }}>
                      {item.credito > 0 ? fmt(item.credito) : '—'}
                    </td>
                    <td style={{ padding: '9px 14px', fontSize: 13, textAlign: 'right', fontWeight: 600, color: item.saldo_progressivo >= 0 ? COR : '#dc2626' }}>
                      {fmt(item.saldo_progressivo)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f0fdf9', fontWeight: 700 }}>
                  <td colSpan={3} style={{ padding: '10px 14px', fontSize: 13 }}>Totais do Período</td>
                  <td style={{ padding: '10px 14px', fontSize: 13, textAlign: 'right', color: '#1d4ed8' }}>{fmt(totalDebitos)}</td>
                  <td style={{ padding: '10px 14px', fontSize: 13, textAlign: 'right', color: '#166534' }}>{fmt(totalCreditos)}</td>
                  <td style={{ padding: '10px 14px', fontSize: 13, textAlign: 'right', color: COR }}>{fmt(itens[itens.length - 1]?.saldo_progressivo || 0)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )
      )}
    </div>
  )
}
