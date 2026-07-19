'use client'

import { useMemo, useState } from 'react'
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

function fmtData(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

type Safra = { id: string; ano: number; descricao: string | null; status: string }

// Colunas expostas por vw_resultado_comercializacao (migration 082) —
// realizado (transações consumadas) + marcação a mercado calculada na leitura.
type ResultadoComercializacao = {
  id: string
  safra_id: string
  produto_id: string
  receita_bruta_rs: number
  taxa_cooperativa_rs: number
  funrural_rs: number
  total_kg_vendido: number
  kg_convertido: number
  custo_convertido_rs: number
  lucro_realizado_rs: number
  custo_aquisicao_rs: number    // deprecated — não usado nesta tela
  resultado_liquido_rs: number  // deprecated — não usado nesta tela
  preco_medio_kg: number
  kg_entregue_total: number
  passivo_a_ordem_kg: number
  estoque_kg: number
  cotacao_preco_cooperado: number | null
  cotacao_vigente_a_partir_de: string | null
  ajuste_mercado_rs: number
  lucro_corrente_rs: number
  exposicao_kg: number
  produto_nome: string
  produto_unidade: string
  safra_descricao: string | null
  safra_ano: number
}

export default function ResultadoClient({ safras, resultados, lotesAndamento }: {
  safras: Safra[]
  resultados: ResultadoComercializacao[]
  lotesAndamento: any[]
}) {
  const safraEmAndamento = safras.find(s => s.status === 'em_andamento')
  const [safraId, setSafraId] = useState(safraEmAndamento?.id ?? safras[0]?.id ?? '')

  const safraAtual = safras.find(s => s.id === safraId)
  const resultadosFiltrados = resultados.filter(r => r.safra_id === safraId)
  const lotesAndamentoFiltrados = lotesAndamento.filter(l => l.safra_id === safraId)

  const totalRealizado  = resultadosFiltrados.reduce((a, r) => a + Number(r.lucro_realizado_rs), 0)
  const totalAjuste     = resultadosFiltrados.reduce((a, r) => a + Number(r.ajuste_mercado_rs), 0)
  const totalCorrente   = resultadosFiltrados.reduce((a, r) => a + Number(r.lucro_corrente_rs), 0)
  const totalExposicao  = resultadosFiltrados.reduce((a, r) => a + Number(r.exposicao_kg), 0)

  // Cotação usada na marcação — mesma pra todos os produtos com posição em
  // aberto (LATERAL na view busca por produto; aqui pegamos a mais recente
  // pra exibir no rodapé como referência geral da safra).
  const cotacaoRodape = useMemo(() => {
    const comCotacao = resultadosFiltrados.filter(r => r.cotacao_vigente_a_partir_de)
    if (comCotacao.length === 0) return null
    return comCotacao.reduce((mais, r) =>
      !mais || (r.cotacao_vigente_a_partir_de! > mais.cotacao_vigente_a_partir_de!) ? r : mais
    , comCotacao[0])
  }, [resultadosFiltrados])

  const kpis = [
    { label: 'Lucro realizado',    value: fmtReal(totalRealizado), sub: 'Transações consumadas — base p/ sobras', icon: 'ti-cash',        cor: '#166534', corLt: '#DCFCE7' },
    { label: 'Ajuste a mercado',   value: `${totalAjuste >= 0 ? '+' : ''}${fmtReal(totalAjuste)}`, sub: 'Posição em aberto na cotação atual', icon: 'ti-chart-line', cor: totalAjuste >= 0 ? '#166534' : COM_C.vermelho, corLt: totalAjuste >= 0 ? '#DCFCE7' : COM_C.vermelhoLt },
    { label: 'Lucro corrente',     value: fmtReal(totalCorrente),  sub: 'Realizado + ajuste a mercado',           icon: 'ti-chart-bar',   cor: COM_C.marrom, corLt: COM_C.marromLt },
    { label: 'Exposição',          value: fmtPeso(totalExposicao), sub: 'Kg vendidos ainda sem custo fixado',     icon: 'ti-alert-triangle', cor: '#854F0B', corLt: '#FAEEDA' },
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
        {/* Texto explicativo — fixo, curto */}
        <div style={{
          fontSize: 12, color: COM_C.txtSub, background: '#fff', border: `1px solid ${COM_C.borda}`,
          borderRadius: 10, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 8,
        }}>
          <i className="ti ti-info-circle" style={{ fontSize: 15, flexShrink: 0, marginTop: 1, color: COM_C.txtSub }} />
          <span>
            <strong>Realizado</strong> = transações consumadas (base p/ sobras). <strong>Ajuste a mercado</strong> = posição
            em aberto na cotação atual — flutua diariamente.
          </span>
        </div>

        {/* KPIs */}
        <div className="com-kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
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
                    {['Produto', 'Kg vendido', 'Kg convertido', 'Estoque', 'À ordem', 'Preço médio venda', 'Custo médio convertido', 'Realizado', 'Ajuste', 'Corrente'].map(h => (
                      <th key={h} style={{ textAlign: h === 'Produto' ? 'left' : 'right' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {resultadosFiltrados.map(r => {
                    const custoMedioConvertido = Number(r.kg_convertido) > 0 ? Number(r.custo_convertido_rs) / Number(r.kg_convertido) : 0
                    return (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 600 }}>{r.produto_nome}</td>
                        <td style={{ textAlign: 'right', color: COM_C.txtSub }}>{fmtPeso(Number(r.total_kg_vendido))}</td>
                        <td style={{ textAlign: 'right', color: COM_C.txtSub }}>{fmtPeso(Number(r.kg_convertido))}</td>
                        <td style={{ textAlign: 'right', color: COM_C.txtSub }}>{fmtPeso(Number(r.estoque_kg))}</td>
                        <td style={{ textAlign: 'right', color: Number(r.passivo_a_ordem_kg) > 0 ? '#7C3AED' : COM_C.txtSub }}>{fmtPeso(Number(r.passivo_a_ordem_kg))}</td>
                        <td style={{ textAlign: 'right', color: COM_C.txtSub }}>{fmtReal(Number(r.preco_medio_kg))}/kg</td>
                        <td style={{ textAlign: 'right', color: COM_C.txtSub }}>{fmtReal(custoMedioConvertido)}/kg</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: Number(r.lucro_realizado_rs) >= 0 ? '#166534' : COM_C.vermelho }}>
                          {fmtReal(Number(r.lucro_realizado_rs))}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: Number(r.ajuste_mercado_rs) >= 0 ? '#166534' : COM_C.vermelho }}>
                          {Number(r.ajuste_mercado_rs) >= 0 ? '+' : ''}{fmtReal(Number(r.ajuste_mercado_rs))}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: Number(r.lucro_corrente_rs) >= 0 ? '#166534' : COM_C.vermelho }}>
                          {fmtReal(Number(r.lucro_corrente_rs))}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {/* Rodapé — cotação usada na marcação a mercado */}
              <div style={{
                padding: '12px 22px', borderTop: `1px solid ${COM_C.borda}`, background: '#FAFAF8',
                fontSize: 12, color: COM_C.txtSub, display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <i className="ti ti-calculator" style={{ fontSize: 14 }} />
                {cotacaoRodape ? (
                  <span>
                    Cotação usada na marcação: <strong style={{ color: COM_C.txt }}>{fmtReal(Number(cotacaoRodape.cotacao_preco_cooperado))}/kg</strong>
                    {' '}(preço cooperado) · vigente desde {fmtData(cotacaoRodape.cotacao_vigente_a_partir_de)}
                  </span>
                ) : (
                  <span>Nenhuma cotação vigente encontrada para os produtos desta safra.</span>
                )}
              </div>
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

        {resultadosFiltrados.length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem', color: COM_C.txtSub, fontSize: 14 }}>
            Nenhum resultado registrado para esta safra.
          </div>
        )}
      </div>
    </PageLayout>
  )
}
