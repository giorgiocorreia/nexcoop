'use client'

import { useEffect, useState } from 'react'
import { getBalancoPatrimonial } from '@/lib/contabil/actions'
import { ItemBalancoPatrimonial } from '@/lib/contabil/types'

const COR = '#0F766E'

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function GrupoBalanco({ titulo, itens, total, corTotal }: {
  titulo: string
  itens: ItemBalancoPatrimonial[]
  total: number
  corTotal: string
}) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ background: '#1a1a2e', padding: '10px 16px', borderRadius: '8px 8px 0 0' }}>
        <span style={{ fontWeight: 700, fontSize: 13, color: '#fff' }}>{titulo}</span>
      </div>
      <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderTop: 'none', borderRadius: '0 0 8px 8px', overflow: 'hidden' }}>
        {itens.length === 0 ? (
          <p style={{ padding: '16px', color: '#9ca3af', fontSize: 13, margin: 0 }}>Sem saldo no período.</p>
        ) : (
          itens.map((item, i) => (
            <div key={item.conta_id} style={{
              display: 'flex', justifyContent: 'space-between', padding: '9px 16px',
              paddingLeft: `${16 + (item.nivel - 1) * 12}px`,
              borderBottom: '1px solid #f3f4f6',
              background: i % 2 === 0 ? '#fff' : '#f8f7f4',
              fontWeight: item.nivel <= 2 ? 600 : 400,
            }}>
              <span style={{ fontSize: 13 }}>
                <span style={{ color: '#9ca3af', marginRight: 8, fontSize: 11 }}>{item.codigo}</span>
                {item.nome}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{fmt(item.saldo)}</span>
            </div>
          ))
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: '#f8f7f4', borderTop: '2px solid #e5e3dc' }}>
          <span style={{ fontWeight: 700, fontSize: 13 }}>Total {titulo}</span>
          <span style={{ fontWeight: 700, fontSize: 14, color: corTotal }}>{fmt(total)}</span>
        </div>
      </div>
    </div>
  )
}

export default function BalancoClient({ orgId }: { orgId: string }) {
  const anoAtual = new Date().getFullYear()
  const [ano, setAno] = useState(anoAtual)
  const [dados, setDados] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    getBalancoPatrimonial(orgId, ano).then(setDados).finally(() => setLoading(false))
  }, [ano, orgId])

  return (
    <div style={{ padding: 32, maxWidth: 880, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e', margin: 0 }}>Balanço Patrimonial</h1>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>Posição patrimonial da cooperativa no exercício</p>
        </div>
        <select value={ano} onChange={e => setAno(Number(e.target.value))}
          style={{ padding: '8px 12px', border: '1px solid #e5e3dc', borderRadius: 8, fontSize: 13 }}>
          {[anoAtual - 1, anoAtual, anoAtual + 1].map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {loading ? (
        <p style={{ color: '#6b7280' }}>Carregando...</p>
      ) : !dados ? null : (
        <>
          <div style={{
            background: dados.equilibrado ? '#dcfce7' : '#fef2f2',
            border: `1px solid ${dados.equilibrado ? '#86efac' : '#fca5a5'}`,
            borderRadius: 8, padding: '10px 16px', marginBottom: 24, fontSize: 13,
            color: dados.equilibrado ? '#166534' : '#dc2626', fontWeight: 600,
          }}>
            {dados.equilibrado
              ? '✓ Balanço equilibrado — Ativo = Passivo + Patrimônio Líquido'
              : `⚠ Balanço desequilibrado — diferença de ${fmt(Math.abs(dados.totalAtivo - dados.totalPassivoMaisPatrimonio))}`}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div>
              <GrupoBalanco titulo="ATIVO" itens={dados.ativos} total={dados.totalAtivo} corTotal={COR} />
            </div>
            <div>
              <GrupoBalanco titulo="PASSIVO" itens={dados.passivos} total={dados.passivos.reduce((s: number, i: ItemBalancoPatrimonial) => s + i.saldo, 0)} corTotal="#dc2626" />
              <GrupoBalanco titulo="PATRIMÔNIO LÍQUIDO" itens={dados.patrimonio} total={dados.patrimonio.reduce((s: number, i: ItemBalancoPatrimonial) => s + i.saldo, 0)} corTotal="#635BFF" />
              <div style={{ background: '#1a1a2e', borderRadius: 8, padding: '14px 16px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>TOTAL PASSIVO + PL</span>
                <span style={{ fontWeight: 700, fontSize: 14, color: '#a5b4fc' }}>{fmt(dados.totalPassivoMaisPatrimonio)}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
