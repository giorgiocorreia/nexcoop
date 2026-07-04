'use client'

import { useState } from 'react'
import { PageLayout } from '@/components/comercializacao/ui/PageLayout'
import { KpiCard } from '@/components/comercializacao/ui/KpiCard'
import { ContentCard } from '@/components/comercializacao/ui/ContentCard'
import { Badge } from '@/components/comercializacao/ui/Badge'
import { Select } from '@/components/comercializacao/ui/Field'
import { COM_C, STATUS_LOTE } from '@/components/comercializacao/ui/tokens'
import { BtnLink } from '@/components/ui/Btn'

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

export default function ResultadoClient({ safras, resultados, saldos, lotesAndamento }: {
  safras: Safra[]
  resultados: Resultado[]
  saldos: Saldo[]
  lotesAndamento: any[]
}) {
  const [safraId, setSafraId] = useState(safras[0]?.id ?? '')

  const safraAtual = safras.find(s => s.id === safraId)
  const resultadosFiltrados = resultados.filter(r => r.safra_id === safraId)
  const saldosFiltrados = saldos.filter(s => s.safra_id === safraId)
  const lotesAndamentoFiltrados = lotesAndamento.filter(l => l.safra_id === safraId)

  const totalReceita    = resultadosFiltrados.reduce((a, r) => a + Number(r.receita_bruta_rs), 0)
  const totalCusto      = resultadosFiltrados.reduce((a, r) => a + Number(r.custo_aquisicao_rs), 0)
  const totalTaxa       = resultadosFiltrados.reduce((a, r) => a + Number(r.taxa_cooperativa_rs), 0)
  const totalFunrural   = resultadosFiltrados.reduce((a, r) => a + Number(r.funrural_rs), 0)
  const totalResultado  = resultadosFiltrados.reduce((a, r) => a + Number(r.resultado_liquido_rs), 0)
  const totalKg         = resultadosFiltrados.reduce((a, r) => a + Number(r.total_kg_vendido), 0)
  const totalSaldoKg    = saldosFiltrados.reduce((a, s) => a + Number(s.saldo_kg), 0)

  const kpis = [
    { label: 'Receita bruta',      value: fmtReal(totalReceita),   sub: `${fmtPeso(totalKg)} vendidos`,         icon: 'ti-cash',        cor: '#185FA5', corLt: '#E6F1FB' },
    { label: 'Custo aquisição',    value: fmtReal(totalCusto),     sub: 'Pago aos produtores',                  icon: 'ti-users',       cor: COM_C.marrom, corLt: COM_C.marromLt },
    { label: 'Taxa cooperativa',   value: fmtReal(totalTaxa),      sub: 'Sobre receita bruta',                  icon: 'ti-percentage',  cor: COM_C.txtSub, corLt: '#F5F5F4' },
    { label: 'FUNRURAL',           value: fmtReal(totalFunrural),  sub: '1,63% — obrigação cooperativa',        icon: 'ti-receipt-tax', cor: '#854F0B', corLt: '#FAEEDA' },
    { label: 'Resultado líquido',  value: fmtReal(totalResultado), sub: 'Receita − custo − taxa − FUNRURAL',    icon: 'ti-chart-bar',   cor: '#166534', corLt: '#DCFCE7' },
    { label: 'Saldo em estoque',   value: fmtPeso(totalSaldoKg),   sub: 'Kg entregues ainda não convertidos',   icon: 'ti-package',     cor: '#7C3AED', corLt: '#F5F3FF' },
  ]

  const STEPS = ['rascunho', 'aberto', 'em_venda', 'entregue', 'pago']
  const STEP_LABELS = ['Rascunho', 'Aberto', 'Em venda', 'Entregue', 'Pago']

  return (
    <PageLayout
      titulo="Resultado por Safra"
      subtitulo={safraAtual ? `Safra ${safraAtual.ano}${safraAtual.descricao ? ` — ${safraAtual.descricao}` : ''}` : 'Selecione uma safra'}
      icone="ti-chart-bar"
      breadcrumb={[{ label: 'Resultado por Safra' }]}
      fullHeight
      acoes={
        <Select
          value={safraId}
          onChange={e => setSafraId(e.target.value)}
          style={{ width: 'auto', minWidth: 220, fontWeight: 600 }}
        >
          {safras.map(s => (
            <option key={s.id} value={s.id}>
              Safra {s.ano}{s.descricao ? ` — ${s.descricao}` : ''}{s.status === 'em_andamento' ? ' ★' : ''}
            </option>
          ))}
        </Select>
      }
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* KPIs */}
        <div className="com-kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {kpis.map(k => (
            <KpiCard
              key={k.label}
              label={k.label}
              value={k.value}
              sub={k.sub}
              icon={k.icon}
              cor={k.cor}
              corLt={k.corLt}
            />
          ))}
        </div>

        {/* Resultado por produto */}
        {resultadosFiltrados.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <ContentCard title="Resultado por produto" noPadding>
              <table className="com-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Produto', 'Kg vendido', 'Preço médio', 'Receita', 'Custo', 'Taxa + FUNRURAL', 'Resultado líquido'].map(h => (
                      <th key={h} style={{ textAlign: h === 'Produto' ? 'left' : 'right' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {resultadosFiltrados.map(r => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600 }}>{r.produto_nome}</td>
                      <td style={{ textAlign: 'right', color: COM_C.txtSub }}>{fmtPeso(Number(r.total_kg_vendido))}</td>
                      <td style={{ textAlign: 'right', color: COM_C.txtSub }}>{fmtReal(Number(r.preco_medio_kg))}/kg</td>
                      <td style={{ textAlign: 'right', color: '#185FA5', fontWeight: 600 }}>{fmtReal(Number(r.receita_bruta_rs))}</td>
                      <td style={{ textAlign: 'right', color: COM_C.marrom }}>{fmtReal(Number(r.custo_aquisicao_rs))}</td>
                      <td style={{ textAlign: 'right', color: COM_C.txtSub }}>{fmtReal(Number(r.taxa_cooperativa_rs) + Number(r.funrural_rs))}</td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: Number(r.resultado_liquido_rs) >= 0 ? '#166534' : COM_C.vermelho }}>
                        {fmtReal(Number(r.resultado_liquido_rs))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ContentCard>
          </div>
        )}

        {/* Lotes em andamento */}
        {lotesAndamentoFiltrados.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <ContentCard title="Lotes em andamento" noPadding>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {lotesAndamentoFiltrados.map((lote: any, i: number) => {
                  const venda = lote.vendas_externas?.[0] ?? null
                  const produtos = lote.lote_itens?.map((li: any) => li.produtos?.nome).filter(Boolean).join(', ') || lote.produto_descricao || '—'
                  const st = STATUS_LOTE[lote.status] ?? { label: lote.status, cor: '#6b7280', bg: '#f3f4f6' }
                  const stepAtual = STEPS.indexOf(lote.status)
                  return (
                    <div key={lote.id} style={{
                      padding: '16px 20px',
                      borderTop: i > 0 ? `1px solid ${COM_C.borda}` : 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: COM_C.txt }}>Lote {lote.codigo}</span>
                          <Badge label={st.label} bg={st.bg} cor={st.cor} />
                        </div>
                        <div style={{ fontSize: 12, color: COM_C.txtSub }}>{produtos} · {fmtPeso(Number(lote.peso_total_kg))}</div>
                        {venda && (
                          <div style={{ fontSize: 12, color: COM_C.txtSub, marginTop: 2 }}>
                            {venda.compradores?.nome} · {fmtReal(Number(venda.valor_bruto))} · {fmtReal(Number(venda.preco_kg))}/kg
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                        {STEP_LABELS.map((step, idx) => (
                          <div key={step} style={{ display: 'flex', alignItems: 'center' }}>
                            <div style={{
                              width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 10, fontWeight: 700,
                              background: idx <= stepAtual ? COM_C.marrom : '#e5e7eb',
                              color: idx <= stepAtual ? '#fff' : '#9ca3af',
                            }}>{idx + 1}</div>
                            {idx < 4 && (
                              <div style={{ width: 24, height: 2, background: idx < stepAtual ? COM_C.marrom : '#e5e7eb' }} />
                            )}
                          </div>
                        ))}
                      </div>
                      <BtnLink variante="marrom-outline" href={`/comercializacao/lotes/${lote.id}`}>
                        Ver lote →
                      </BtnLink>
                    </div>
                  )
                })}
              </div>
            </ContentCard>
          </div>
        )}

        {/* Saldos por produtor */}
        {saldosFiltrados.length > 0 && (
          <ContentCard title="Participação por produtor" noPadding>
            <table className="com-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Produtor', 'Produto', 'Kg entregue', 'Kg convertido', 'Saldo kg', 'Valor convertido'].map(h => (
                    <th key={h} style={{ textAlign: h === 'Produtor' || h === 'Produto' ? 'left' : 'right' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {saldosFiltrados.map(s => (
                  <tr key={`${s.produtor_id}-${s.produto_id}`}>
                    <td style={{ fontWeight: 600 }}>{s.produtor_nome}</td>
                    <td style={{ color: COM_C.txtSub }}>{s.produto_nome}</td>
                    <td style={{ textAlign: 'right', color: COM_C.txtSub }}>{fmtPeso(Number(s.kg_entregue))}</td>
                    <td style={{ textAlign: 'right', color: COM_C.txtSub }}>{fmtPeso(Number(s.kg_convertido))}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: Number(s.saldo_kg) > 0 ? '#7C3AED' : COM_C.txtSub }}>{fmtPeso(Number(s.saldo_kg))}</td>
                    <td style={{ textAlign: 'right', color: COM_C.marrom, fontWeight: 600 }}>{fmtReal(Number(s.valor_convertido_rs))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ContentCard>
        )}

        {resultadosFiltrados.length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem', color: COM_C.txtSub, fontSize: 14 }}>
            Nenhum resultado registrado para esta safra.
          </div>
        )}
      </div>
    </PageLayout>
  )
}