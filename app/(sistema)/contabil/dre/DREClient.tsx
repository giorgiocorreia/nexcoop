'use client'

import { useEffect, useState } from 'react'
import { getDRE } from '@/lib/contabil/actions'
import { ItemDRE, TipoOrg, getTerminologia } from '@/lib/contabil/types'
import BotaoAjuda from '@/components/BotaoAjuda'

const COR = '#0F766E'
function fmt(v: number) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }

interface Props { orgId: string; tipoOrg: TipoOrg }

export default function DREClient({ orgId, tipoOrg }: Props) {
  const term = getTerminologia(tipoOrg)
  const anoAtual = new Date().getFullYear()
  const [ano, setAno] = useState(anoAtual)
  const [dados, setDados] = useState<ItemDRE[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    getDRE(orgId, ano).then(setDados).finally(() => setLoading(false))
  }, [ano, orgId])

  const receitas = dados.filter(d => d.tipo === 'receita')
  const despesas = dados.filter(d => d.tipo === 'despesa')
  const resultado = dados.find(d => d.tipo === 'resultado')

  return (
    <div style={{ padding: 32, maxWidth: 720, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e', margin: 0 }}>DRE — Demonstrativo de Resultado</h1>
            <BotaoAjuda chave="manual_contabil_url" />
          </div>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>
            Receitas, despesas e {tipoOrg === 'cooperativa' ? 'sobras' : 'resultado'} do exercício · {term.legislacao}
          </p>
        </div>
        <select value={ano} onChange={e => setAno(Number(e.target.value))} style={{ padding: '8px 12px', border: '1px solid #e5e3dc', borderRadius: 8, fontSize: 13 }}>
          {[anoAtual - 1, anoAtual, anoAtual + 1].map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {loading ? <p style={{ color: '#6b7280' }}>Carregando...</p> : (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e3dc', overflow: 'hidden' }}>
          <div style={{ background: '#f0fdf9', padding: '12px 20px', borderBottom: '1px solid #e5e3dc' }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: COR }}>RECEITAS</span>
          </div>
          {receitas.map(item => (
            <div key={item.descricao} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 20px', borderBottom: '1px solid #f3f4f6', fontSize: 13 }}>
              <span style={{ color: '#374151' }}>{item.descricao}</span>
              <span style={{ color: '#166534', fontWeight: 600 }}>{fmt(item.valor)}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 20px', borderBottom: '2px solid #e5e3dc', fontSize: 13, fontWeight: 700, background: '#f8f7f4' }}>
            <span>Total de Receitas</span>
            <span style={{ color: '#166534' }}>{fmt(receitas.reduce((s, i) => s + i.valor, 0))}</span>
          </div>
          <div style={{ background: '#fff1f2', padding: '12px 20px', borderBottom: '1px solid #e5e3dc' }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: '#dc2626' }}>DESPESAS</span>
          </div>
          {despesas.map(item => (
            <div key={item.descricao} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 20px', borderBottom: '1px solid #f3f4f6', fontSize: 13 }}>
              <span style={{ color: '#374151' }}>{item.descricao}</span>
              <span style={{ color: '#dc2626', fontWeight: 600 }}>{fmt(item.valor)}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 20px', borderBottom: '2px solid #e5e3dc', fontSize: 13, fontWeight: 700, background: '#f8f7f4' }}>
            <span>Total de Despesas</span>
            <span style={{ color: '#dc2626' }}>{fmt(despesas.reduce((s, i) => s + i.valor, 0))}</span>
          </div>
          {resultado && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 20px', fontSize: 15, fontWeight: 700, background: resultado.valor >= 0 ? '#f0fdf9' : '#fef2f2', color: resultado.valor >= 0 ? COR : '#dc2626' }}>
              <span>{resultado.valor >= 0 ? term.resultadoPositivo : term.resultadoNegativo}</span>
              <span>{fmt(Math.abs(resultado.valor))}</span>
            </div>
          )}
          {dados.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: '#6b7280', fontSize: 14 }}>Nenhum dado contábil para o exercício {ano}.</div>
          )}
        </div>
      )}
    </div>
  )
}
