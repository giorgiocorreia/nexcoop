'use client'

import { useEffect, useState } from 'react'
import { listarSessoesFechadas, getDetalheSessao } from '@/lib/comercializacao/diario.actions'
import { fmtReal } from '@/lib/comercializacao/fmt'
import { PageLayout } from '@/components/comercializacao/ui/PageLayout'
import { KpiCard } from '@/components/comercializacao/ui/KpiCard'
import { ContentCard } from '@/components/comercializacao/ui/ContentCard'
import { Badge } from '@/components/comercializacao/ui/Badge'
import { Select } from '@/components/comercializacao/ui/Field'
import { EmptyState } from '@/components/comercializacao/ui/EmptyState'
import { COM_C } from '@/components/comercializacao/ui/tokens'

type Sessao = {
  id: string; data: string; hora_abertura: string; hora_fechamento: string | null
  saldo_inicial_especie: number; saldo_final_especie: number | null; saldo_especie_calculado: number | null
  total_saidas_especie: number; total_pix: number
  total_entradas_pix: number | null; total_entradas_cartao: number | null
  observacoes_fechamento: string | null
  usuarios: { id: string; nome_completo: string } | null
}

type Movimentacao = {
  id: string; tipo: string; quantidade_produto: number | null; valor_financeiro: number | null
  forma_pagamento: string | null; observacoes: string | null; created_at: string
  produtos: { nome: string; unidade: string } | null
  contas_produtor: { produtor_id: string; produtores: { nome: string } | null } | null
}

type AporteSangria = {
  id: string; tipo: string; valor: number; forma_pagamento: 'especie' | 'pix' | 'cartao'; origem: 'manual' | 'cota_cooperado'
  observacoes: string | null; created_at: string
  autorizador: { nome_completo: string } | null; executor: { nome_completo: string } | null
}

const FORMA_LABEL: Record<string, string> = { especie: 'Espécie', pix: 'Pix', cartao: 'Cartão' }

type TotalProduto = { nome: string; unidade: string; total_kg: number; num_produtores: number }

type SaidaAvulsa = {
  id: string; descricao: string; valor: number; data_competencia: string
  observacoes: string | null; criado_em: string
  categoria: { nome: string; grupo: string | null } | null
}

type Detalhe = { sessao: Sessao; movimentacoes: Movimentacao[]; aportes: AporteSangria[]; totaisPorProduto: TotalProduto[]; saidasAvulsas: SaidaAvulsa[] }

const TIPO_LABEL: Record<string, string> = {
  entrega: 'Entrega', conversao: 'Conversão', saque_especie: 'Saque espécie',
  saque_pix: 'Saque Pix', ajuste_produto: 'Ajuste produto',
  ajuste_financeiro: 'Ajuste financeiro', estorno: 'Estorno', compra_loja: 'Compra loja'
}

function formatarKg(v: number): string {
  const s = v.toFixed(3).replace(/\.?0+$/, '')
  return s.replace('.', ',')
}

export default function DiarioCaixaPage() {
  const hoje = new Date()
  const [mes, setMes] = useState(hoje.getMonth() + 1)
  const [ano, setAno] = useState(hoje.getFullYear())
  const [sessoes, setSessoes] = useState<Sessao[]>([])
  const [carregando, setCarregando] = useState(true)
  const [sessaoAberta, setSessaoAberta] = useState<string | null>(null)
  const [detalhe, setDetalhe] = useState<Detalhe | null>(null)
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false)

  useEffect(() => { carregar() }, [mes, ano])

  async function carregar() {
    setCarregando(true); setSessaoAberta(null); setDetalhe(null)
    try { setSessoes((await listarSessoesFechadas(mes, ano) ?? []) as unknown as Sessao[]) }
    finally { setCarregando(false) }
  }

  async function abrirDetalhe(sessao_id: string) {
    if (sessaoAberta === sessao_id) { setSessaoAberta(null); setDetalhe(null); return }
    setSessaoAberta(sessao_id); setDetalhe(null); setCarregandoDetalhe(true)
    try { setDetalhe(await getDetalheSessao(sessao_id) as unknown as Detalhe) }
    finally { setCarregandoDetalhe(false) }
  }

  const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
  const anosDisponiveis = Array.from({ length: 3 }, (_, i) => hoje.getFullYear() - i)

  const totalSaidas = sessoes.reduce((acc, s) => acc + (s.total_saidas_especie ?? 0), 0)
  const totalPix    = sessoes.reduce((acc, s) => acc + (s.total_pix ?? 0), 0)

  return (
    <PageLayout
      titulo="Diário de Caixa"
      icone="ti-notebook"
      breadcrumb={[{ label: 'Diário de Caixa' }]}
      fullHeight
      acoes={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Select value={mes} onChange={e => setMes(parseInt(e.target.value))} style={{ width: 'auto' }}>
            {meses.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </Select>
          <Select value={ano} onChange={e => setAno(parseInt(e.target.value))} style={{ width: 'auto' }}>
            {anosDisponiveis.map(a => <option key={a} value={a}>{a}</option>)}
          </Select>
        </div>
      }
    >
      {sessoes.length > 0 && (
        <div className="com-kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 24 }}>
          <KpiCard label="Sessões no período" value={String(sessoes.length)} icon="ti-calendar" cor={COM_C.marrom} corLt={COM_C.marromLt} />
          <KpiCard label="Saídas espécie" value={fmtReal(totalSaidas)} icon="ti-cash" cor={COM_C.laranja} corLt={COM_C.laranjaLt} />
          <KpiCard label="Total Pix" value={fmtReal(totalPix)} icon="ti-brand-cashapp" cor={COM_C.verde} corLt={COM_C.verdeLt} />
        </div>
      )}

      {carregando ? (
        <div style={{ padding: 32, textAlign: 'center', color: COM_C.txtSub }}>Carregando...</div>
      ) : sessoes.length === 0 ? (
        <EmptyState
          emoji="📓"
          titulo={`Nenhuma sessão fechada em ${meses[mes - 1]} de ${ano}`}
          descricao="Selecione outro período para consultar o histórico."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sessoes.map(s => {
            const aberta = sessaoAberta === s.id
            const saldoEsperado = s.saldo_especie_calculado ?? (s.saldo_inicial_especie - s.total_saidas_especie)
            const temDiferenca = s.saldo_final_especie !== null && Math.abs(s.saldo_final_especie - saldoEsperado) > 0.01

            return (
              <ContentCard key={s.id} noPadding>
                <button
                  onClick={() => abrirDetalhe(s.id)}
                  style={{
                    width: '100%', padding: '16px 20px', border: 'none', background: 'none', cursor: 'pointer',
                    textAlign: 'left', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
                    borderLeft: aberta ? `3px solid ${COM_C.marrom}` : '3px solid transparent',
                  }}
                >
                  <div style={{ minWidth: 100 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: COM_C.txt }}>
                      {new Date(s.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </div>
                    <div style={{ fontSize: 12, color: COM_C.txtSub, marginTop: 2 }}>
                      {new Date(s.hora_abertura).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      {s.hora_fechamento && ` – ${new Date(s.hora_fechamento).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <div style={{ fontSize: 12, color: COM_C.txtSub }}>Operador</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: COM_C.txt }}>{(s.usuarios as any)?.nome_completo ?? '—'}</div>
                  </div>
                  <div style={{ minWidth: 100, textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: COM_C.txtSub }}>Saldo inicial</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: COM_C.txt }}>{fmtReal(s.saldo_inicial_especie)}</div>
                  </div>
                  <div style={{ minWidth: 100, textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: COM_C.txtSub }}>Saídas espécie</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: COM_C.txt }}>{fmtReal(s.total_saidas_especie ?? 0)}</div>
                  </div>
                  <div style={{ minWidth: 100, textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: COM_C.txtSub }}>Total Pix</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: COM_C.verde }}>{fmtReal(s.total_pix ?? 0)}</div>
                  </div>
                  {temDiferenca && <Badge label="Diferença" bg={COM_C.marromLt} cor={COM_C.marrom} />}
                  <i
                    className="ti ti-chevron-down"
                    style={{ fontSize: 16, color: COM_C.txtSub, marginLeft: 'auto', transform: aberta ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
                  />
                </button>

                {aberta && (
                  <div style={{ borderTop: `1px solid ${COM_C.borda}`, padding: 20 }}>
                    {carregandoDetalhe ? (
                      <div style={{ textAlign: 'center', color: COM_C.txtSub, fontSize: 13, padding: 16 }}>Carregando detalhes...</div>
                    ) : detalhe ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: COM_C.txt, marginBottom: 10 }}>Balanço financeiro</div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
                            {(() => {
                              const aportesEspecie = detalhe.aportes.filter(a => a.forma_pagamento === 'especie')
                              const nAp = aportesEspecie.filter(a => a.tipo === 'aporte').length
                              const nSg = aportesEspecie.filter(a => a.tipo === 'sangria').length
                              return [
                                { label: 'Saldo inicial', valor: fmtReal(detalhe.sessao.saldo_inicial_especie), cor: COM_C.txt },
                                ...nAp > 0 ? [{ label: `Aportes em espécie (${nAp})`, valor: `+ ${fmtReal(aportesEspecie.filter(a => a.tipo === 'aporte').reduce((acc, a) => acc + a.valor, 0))}`, cor: COM_C.verde }] : [],
                                ...nSg > 0 ? [{ label: `Sangrias em espécie (${nSg})`, valor: `− ${fmtReal(aportesEspecie.filter(a => a.tipo === 'sangria').reduce((acc, a) => acc + a.valor, 0))}`, cor: COM_C.vermelho }] : [],
                                { label: 'Saídas espécie', valor: `− ${fmtReal(detalhe.sessao.total_saidas_especie ?? 0)}`, cor: COM_C.txt },
                                { label: 'Total Pix (pagamentos)', valor: fmtReal(detalhe.sessao.total_pix ?? 0), cor: COM_C.txt },
                                ...(detalhe.sessao.total_entradas_pix ?? 0) > 0 ? [{ label: 'Entradas Pix (cota/outros)', valor: fmtReal(detalhe.sessao.total_entradas_pix ?? 0), cor: COM_C.txt }] : [],
                                ...(detalhe.sessao.total_entradas_cartao ?? 0) > 0 ? [{ label: 'Entradas cartão (cota/outros)', valor: fmtReal(detalhe.sessao.total_entradas_cartao ?? 0), cor: COM_C.txt }] : [],
                              ]
                            })().map((row, i) => (
                              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${COM_C.borda}` }}>
                                <span style={{ color: row.cor }}>{row.label}</span>
                                <span style={{ color: row.cor }}>{row.valor}</span>
                              </div>
                            ))}
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontWeight: 700 }}>
                              <span style={{ color: COM_C.txt }}>Saldo esperado</span>
                              <span style={{ color: COM_C.marrom }}>{fmtReal(saldoEsperado)}</span>
                            </div>
                            {detalhe.sessao.saldo_final_especie !== null && (() => {
                              const dif = detalhe.sessao.saldo_final_especie - saldoEsperado
                              return (
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                                  <span style={{ color: Math.abs(dif) < 0.01 ? COM_C.verde : COM_C.vermelho }}>Diferença</span>
                                  <span style={{ color: Math.abs(dif) < 0.01 ? COM_C.verde : COM_C.vermelho, fontWeight: 600 }}>
                                    {Math.abs(dif) < 0.01 ? '✓ Confere' : dif > 0 ? `Sobra ${fmtReal(dif)}` : `Falta ${fmtReal(Math.abs(dif))}`}
                                  </span>
                                </div>
                              )
                            })()}
                          </div>
                        </div>

                        {detalhe.totaisPorProduto.length > 0 && (
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: COM_C.txt, marginBottom: 10 }}>Movimentação de produtos</div>
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                              {detalhe.totaisPorProduto.map(t => (
                                <div key={t.nome} style={{ background: COM_C.marromLt, border: `1px solid ${COM_C.borda}`, borderRadius: 10, padding: '12px 16px' }}>
                                  <div style={{ fontSize: 11, fontWeight: 700, color: COM_C.marrom, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{t.nome}</div>
                                  <div style={{ fontSize: 18, fontWeight: 800, color: COM_C.marrom }}>{formatarKg(t.total_kg)} {t.unidade}</div>
                                  <div style={{ fontSize: 12, color: COM_C.txtSub, marginTop: 2 }}>{t.num_produtores} produtor(es)</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {detalhe.aportes.length > 0 && (
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: COM_C.txt, marginBottom: 10 }}>Aportes e sangrias</div>
                            <ContentCard noPadding>
                              {detalhe.aportes.map(a => (
                                <div key={a.id} style={{ padding: '10px 14px', borderBottom: `1px solid ${COM_C.borda}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                                  <div>
                                    <span style={{ fontWeight: 600, color: a.tipo === 'aporte' ? COM_C.verde : COM_C.vermelho }}>
                                      {a.tipo === 'aporte' ? '↓ Aporte' : '↑ Sangria'}
                                    </span>
                                    <span style={{ color: COM_C.txtSub, marginLeft: 6, fontSize: 11 }}>· {FORMA_LABEL[a.forma_pagamento] ?? a.forma_pagamento}</span>
                                    <span style={{ color: COM_C.txtSub, marginLeft: 8 }}>{new Date(a.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                    {a.autorizador && <span style={{ color: COM_C.txtSub, marginLeft: 8 }}>· Auth: {(a.autorizador as any).nome_completo}</span>}
                                    {a.observacoes && <div style={{ fontSize: 12, color: COM_C.txtSub, marginTop: 2 }}>{a.observacoes}</div>}
                                  </div>
                                  <span style={{ fontWeight: 700, color: a.tipo === 'aporte' ? COM_C.verde : COM_C.vermelho }}>
                                    {a.tipo === 'aporte' ? '+' : '−'} {fmtReal(a.valor)}
                                  </span>
                                </div>
                              ))}
                            </ContentCard>
                          </div>
                        )}

                        {detalhe.saidasAvulsas.length > 0 && (
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: COM_C.txt, marginBottom: 10 }}>
                              Saídas avulsas ({detalhe.saidasAvulsas.length})
                            </div>
                            <ContentCard noPadding>
                              {detalhe.saidasAvulsas.map(sa => (
                                <div key={sa.id} style={{ padding: '10px 14px', borderBottom: `1px solid ${COM_C.borda}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: 13 }}>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 500, color: COM_C.txt }}>{sa.descricao}</div>
                                    <div style={{ fontSize: 11, color: COM_C.txtSub, marginTop: 2, display: 'flex', gap: 8 }}>
                                      <span>{new Date(sa.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                      {sa.categoria && (
                                        <span>· {sa.categoria.grupo ? `${sa.categoria.grupo} — ` : ''}{sa.categoria.nome}</span>
                                      )}
                                      {sa.observacoes && <span>· {sa.observacoes}</span>}
                                    </div>
                                  </div>
                                  <span style={{ fontWeight: 700, color: COM_C.vermelho, marginLeft: 16, whiteSpace: 'nowrap' }}>
                                    − {fmtReal(sa.valor)}
                                  </span>
                                </div>
                              ))}
                            </ContentCard>
                          </div>
                        )}

                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: COM_C.txt, marginBottom: 10 }}>Operações ({detalhe.movimentacoes.length})</div>
                          <ContentCard noPadding>
                            <table className="com-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                              <thead>
                                <tr>
                                  {['Horário', 'Produtor', 'Operação', 'Qtd', 'Valor'].map((h, i) => (
                                    <th key={h} style={{ textAlign: i >= 3 ? 'right' : 'left' }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {detalhe.movimentacoes.map(m => (
                                  <tr key={m.id}>
                                    <td style={{ color: COM_C.txtSub, whiteSpace: 'nowrap' }}>{new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td>
                                    <td>{(m.contas_produtor as any)?.produtores?.nome ?? '—'}</td>
                                    <td>
                                      <div>{TIPO_LABEL[m.tipo] ?? m.tipo}</div>
                                      {m.produtos && <div style={{ fontSize: 11, color: COM_C.txtSub }}>{m.produtos.nome}</div>}
                                    </td>
                                    <td style={{ textAlign: 'right', color: COM_C.txtSub }}>
                                      {m.quantidade_produto ? `${formatarKg(m.quantidade_produto)} ${m.produtos?.unidade ?? 'kg'}` : '—'}
                                    </td>
                                    <td style={{ textAlign: 'right', fontWeight: 600, color: m.valor_financeiro ? (m.tipo === 'conversao' ? COM_C.verde : COM_C.vermelho) : COM_C.txt }}>
                                      {m.valor_financeiro ? fmtReal(Math.abs(m.valor_financeiro)) : '—'}
                                    </td>
                                  </tr>
                                ))}
                                {detalhe.movimentacoes.length === 0 && (
                                  <tr><td colSpan={5} style={{ padding: 16, textAlign: 'center', color: COM_C.txtSub }}>Nenhuma operação registrada.</td></tr>
                                )}
                              </tbody>
                            </table>
                          </ContentCard>
                        </div>

                        {detalhe.sessao.observacoes_fechamento && (
                          <div style={{ background: '#F5F4F0', borderRadius: 8, padding: '12px 14px', fontSize: 13, color: COM_C.txtSub }}>
                            <span style={{ fontWeight: 600, color: COM_C.txt }}>Observações: </span>
                            {detalhe.sessao.observacoes_fechamento}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                )}
              </ContentCard>
            )
          })}
        </div>
      )}
    </PageLayout>
  )
}