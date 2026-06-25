'use client'

import { useState } from 'react'

const C = {
  primary:   '#92400e',
  primaryLt: '#FDF4E7',
  borda:     '#E5E3DC',
  bg:        '#F8F7F4',
  txt:       '#1C1917',
  txtSub:    '#78716C',
  white:     '#fff',
}

function fmtReal(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtPeso(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 3 }) + ' kg'
}

type Safra = { id: string; ano: number; descricao: string | null; status: string }
type Resultado = {
  id: string
  safra_id: string
  produto_id: string
  receita_bruta_rs: number
  custo_aquisicao_rs: number
  taxa_cooperativa_rs: number
  funrural_rs: number
  resultado_liquido_rs: number
  total_kg_vendido: number
  preco_medio_kg: number
  produto_nome: string
  produto_unidade: string
  safra_descricao: string | null
  safra_ano: number
}
type Saldo = {
  produtor_id: string
  produtor_nome: string
  produto_id: string
  produto_nome: string
  safra_id: string
  safra_ano: number
  kg_entregue: number
  kg_convertido: number
  saldo_kg: number
  valor_convertido_rs: number
}

export default function ResultadoClient({ safras, resultados, saldos }: {
  safras: Safra[]
  resultados: Resultado[]
  saldos: Saldo[]
}) {
  const [safraId, setSafraId] = useState(safras[0]?.id ?? '')

  const safraAtual = safras.find(s => s.id === safraId)
  const resultadosFiltrados = resultados.filter(r => r.safra_id === safraId)
  const saldosFiltrados = saldos.filter(s => s.safra_id === safraId)

  // KPIs totais da safra
  const totalReceita    = resultadosFiltrados.reduce((a, r) => a + Number(r.receita_bruta_rs), 0)
  const totalCusto      = resultadosFiltrados.reduce((a, r) => a + Number(r.custo_aquisicao_rs), 0)
  const totalTaxa       = resultadosFiltrados.reduce((a, r) => a + Number(r.taxa_cooperativa_rs), 0)
  const totalFunrural   = resultadosFiltrados.reduce((a, r) => a + Number(r.funrural_rs), 0)
  const totalResultado  = resultadosFiltrados.reduce((a, r) => a + Number(r.resultado_liquido_rs), 0)
  const totalKg         = resultadosFiltrados.reduce((a, r) => a + Number(r.total_kg_vendido), 0)
  const totalSaldoKg    = saldosFiltrados.reduce((a, s) => a + Number(s.saldo_kg), 0)

  const kpis = [
    { label: 'Receita bruta',      valor: fmtReal(totalReceita),   sub: `${fmtPeso(totalKg)} vendidos`,         cor: '#185FA5', bg: '#E6F1FB' },
    { label: 'Custo aquisição',    valor: fmtReal(totalCusto),     sub: 'Pago aos produtores',                  cor: '#92400e', bg: '#FDF4E7' },
    { label: 'Taxa cooperativa',   valor: fmtReal(totalTaxa),      sub: 'Sobre receita bruta',                  cor: '#78716C', bg: '#F5F5F4' },
    { label: 'FUNRURAL',           valor: fmtReal(totalFunrural),  sub: '1,63% — obrigação cooperativa',        cor: '#854F0B', bg: '#FAEEDA' },
    { label: 'Resultado líquido',  valor: fmtReal(totalResultado), sub: 'Receita − custo − taxa − FUNRURAL',    cor: '#166534', bg: '#DCFCE7' },
    { label: 'Saldo em estoque',   valor: fmtPeso(totalSaldoKg),   sub: 'Kg entregues ainda não convertidos',   cor: '#7C3AED', bg: '#F5F3FF' },
  ]

  return (
    <>
      <style>{`
        .kpi-res:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.07); transition: all 0.15s; }
      `}</style>

      {/* Header sticky */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: C.white, borderBottom: `1px solid ${C.borda}`,
        padding: '18px 32px', margin: '0 -2rem 0 -2rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
        minHeight: 88,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: C.primaryLt, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <i className="ti ti-chart-bar" style={{ fontSize: 20, color: C.primary }} />
          </div>
          <div>
            <h1 style={{ fontSize: 19, fontWeight: 800, color: C.txt, margin: 0, lineHeight: 1.2 }}>Resultado por Safra</h1>
            <div style={{ fontSize: 12, color: C.txtSub, marginTop: 2 }}>
              {safraAtual ? `Safra ${safraAtual.ano}${safraAtual.descricao ? ` — ${safraAtual.descricao}` : ''}` : 'Selecione uma safra'}
            </div>
          </div>
        </div>

        {/* Seletor de safra */}
        <select
          value={safraId}
          onChange={e => setSafraId(e.target.value)}
          style={{
            padding: '8px 14px', borderRadius: 8, border: `1px solid ${C.borda}`,
            fontSize: 13, fontWeight: 600, color: C.txt, background: C.white,
            cursor: 'pointer',
          }}
        >
          {safras.map(s => (
            <option key={s.id} value={s.id}>
              Safra {s.ano}{s.descricao ? ` — ${s.descricao}` : ''}{s.status === 'em_andamento' ? ' ★' : ''}
            </option>
          ))}
        </select>
      </header>

      {/* Conteúdo */}
      <div style={{ background: C.bg, margin: '0 -2rem -2rem -2rem', padding: '28px 32px', minHeight: 'calc(100vh - 88px)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>

          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
            {kpis.map(k => (
              <div key={k.label} className="kpi-res" style={{
                background: C.white, borderRadius: 14, border: `1px solid ${C.borda}`,
                borderTop: `3px solid ${k.cor}`, padding: '18px 20px',
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)', cursor: 'default',
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.txtSub, marginBottom: 8 }}>
                  {k.label}
                </div>
                <div style={{ fontSize: 26, fontWeight: 800, color: C.txt, lineHeight: 1.1 }}>{k.valor}</div>
                <div style={{ fontSize: 11, color: C.txtSub, marginTop: 6 }}>{k.sub}</div>
              </div>
            ))}
          </div>

          {/* Resultado por produto */}
          {resultadosFiltrados.length > 0 && (
            <div style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.borda}`, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', marginBottom: 24 }}>
              <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.borda}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.txtSub }}>
                  Resultado por produto
                </div>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#FAFAF8' }}>
                    {['Produto', 'Kg vendido', 'Preço médio', 'Receita', 'Custo', 'Taxa + FUNRURAL', 'Resultado líquido'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: h === 'Produto' ? 'left' : 'right', fontWeight: 600, color: C.txtSub, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {resultadosFiltrados.map((r, i) => (
                    <tr key={r.id} style={{ borderTop: `1px solid ${C.borda}`, background: i % 2 === 0 ? C.white : '#FAFAF8' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: C.txt }}>{r.produto_nome}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: C.txtSub }}>{fmtPeso(Number(r.total_kg_vendido))}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: C.txtSub }}>{fmtReal(Number(r.preco_medio_kg))}/kg</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: '#185FA5', fontWeight: 600 }}>{fmtReal(Number(r.receita_bruta_rs))}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: C.primary }}>{fmtReal(Number(r.custo_aquisicao_rs))}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: C.txtSub }}>{fmtReal(Number(r.taxa_cooperativa_rs) + Number(r.funrural_rs))}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: Number(r.resultado_liquido_rs) >= 0 ? '#166534' : '#dc2626' }}>
                        {fmtReal(Number(r.resultado_liquido_rs))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Saldos por produtor */}
          {saldosFiltrados.length > 0 && (
            <div style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.borda}`, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.borda}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.txtSub }}>
                  Participação por produtor
                </div>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#FAFAF8' }}>
                    {['Produtor', 'Produto', 'Kg entregue', 'Kg convertido', 'Saldo kg', 'Valor convertido'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: h === 'Produtor' || h === 'Produto' ? 'left' : 'right', fontWeight: 600, color: C.txtSub, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {saldosFiltrados.map((s, i) => (
                    <tr key={`${s.produtor_id}-${s.produto_id}`} style={{ borderTop: `1px solid ${C.borda}`, background: i % 2 === 0 ? C.white : '#FAFAF8' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: C.txt }}>{s.produtor_nome}</td>
                      <td style={{ padding: '12px 16px', color: C.txtSub }}>{s.produto_nome}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: C.txtSub }}>{fmtPeso(Number(s.kg_entregue))}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: C.txtSub }}>{fmtPeso(Number(s.kg_convertido))}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: Number(s.saldo_kg) > 0 ? '#7C3AED' : C.txtSub }}>{fmtPeso(Number(s.saldo_kg))}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: C.primary, fontWeight: 600 }}>{fmtReal(Number(s.valor_convertido_rs))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {resultadosFiltrados.length === 0 && (
            <div style={{ textAlign: 'center', padding: '4rem', color: C.txtSub, fontSize: 14 }}>
              Nenhum resultado registrado para esta safra.
            </div>
          )}

        </div>
      </div>
    </>
  )
}
