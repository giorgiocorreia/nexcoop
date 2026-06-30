'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { listarSessoesFechadas, getDetalheSessao } from '@/lib/comercializacao/diario.actions'
import { fmtReal } from '@/lib/comercializacao/fmt'

const C = {
  cor: '#92400e', corLt: '#FDF8F4',
  borda: '#E5E3DC', bg: '#F8F7F4',
  txt: '#1C1917', sub: '#78716C',
}

type Sessao = {
  id: string; data: string; hora_abertura: string; hora_fechamento: string | null
  saldo_inicial_especie: number; saldo_final_especie: number | null; saldo_especie_calculado: number | null
  total_saidas_especie: number; total_pix: number; observacoes_fechamento: string | null
  usuarios: { id: string; nome_completo: string } | null
}

type Movimentacao = {
  id: string; tipo: string; quantidade_produto: number | null; valor_financeiro: number | null
  forma_pagamento: string | null; observacoes: string | null; created_at: string
  produtos: { nome: string; unidade: string } | null
  contas_produtor: { produtor_id: string; produtores: { nome: string } | null } | null
}

type AporteSangria = {
  id: string; tipo: string; valor: number; observacoes: string | null; created_at: string
  autorizador: { nome_completo: string } | null; executor: { nome_completo: string } | null
}

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
    <>
      <style>{`
        .diar-header  { padding: 0 32px; min-height: 88px; display: flex; align-items: center; }
        .diar-content { padding: 28px 32px; }
        @media (max-width: 640px) {
          .diar-header  { padding: 0 16px 0 56px; min-height: 60px; }
          .diar-content { padding: 16px; }
        }
      `}</style>

      <header className="diar-header" style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: '#fff', borderBottom: `1px solid ${C.borda}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, margin: '0 -2rem 0 -2rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: C.corLt, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <i className="ti ti-notebook" style={{ fontSize: 20, color: C.cor }} />
          </div>
          <div>
            <h1 style={{ fontSize: 19, fontWeight: 800, color: C.txt, margin: 0, lineHeight: 1.2 }}>Diário de Caixa</h1>
            <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>
              <Link href="/comercializacao" style={{ color: C.sub, textDecoration: 'none' }}>Comercialização</Link>
              {' / '}Diário de Caixa
            </div>
          </div>
        </div>

        {/* Filtros no header */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          <select value={mes} onChange={e => setMes(parseInt(e.target.value))}
            style={{ padding: '7px 10px', border: `1px solid ${C.borda}`, borderRadius: 8, fontSize: 13, background: '#fff', cursor: 'pointer' }}>
            {meses.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
          <select value={ano} onChange={e => setAno(parseInt(e.target.value))}
            style={{ padding: '7px 10px', border: `1px solid ${C.borda}`, borderRadius: 8, fontSize: 13, background: '#fff', cursor: 'pointer' }}>
            {anosDisponiveis.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </header>

      <div className="diar-content" style={{ background: C.bg, margin: '0 -2rem -2rem -2rem', minHeight: 'calc(100vh - 88px)' }}>

        {/* KPIs resumo */}
        {sessoes.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Sessões no período', valor: String(sessoes.length), cor: C.cor,     bg: C.corLt   },
              { label: 'Saídas espécie',     valor: fmtReal(totalSaidas),  cor: '#C2410C', bg: '#FFF7ED' },
              { label: 'Total Pix',          valor: fmtReal(totalPix),     cor: '#166534', bg: '#F0FDF4' },
            ].map(k => (
              <div key={k.label} style={{ background: '#fff', border: `1px solid ${C.borda}`, borderRadius: 12, padding: '16px 20px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.sub, marginBottom: 6 }}>{k.label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: k.cor }}>{k.valor}</div>
              </div>
            ))}
          </div>
        )}

        {/* Lista de sessões */}
        {carregando ? (
          <div style={{ padding: '32px', textAlign: 'center', color: C.sub }}>Carregando...</div>
        ) : sessoes.length === 0 ? (
          <div style={{ background: '#fff', border: `1px solid ${C.borda}`, borderRadius: 12, padding: '48px', textAlign: 'center', color: C.sub, fontSize: 14 }}>
            Nenhuma sessão fechada em {meses[mes - 1]} de {ano}.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sessoes.map(s => {
              const aberta = sessaoAberta === s.id
              const saldoEsperado = s.saldo_especie_calculado ?? (s.saldo_inicial_especie - s.total_saidas_especie)
              const temDiferenca = s.saldo_final_especie !== null && Math.abs(s.saldo_final_especie - saldoEsperado) > 0.01

              return (
                <div key={s.id} style={{ background: '#fff', border: `1px solid ${aberta ? C.cor : C.borda}`, borderRadius: 12, overflow: 'hidden', transition: 'border-color 0.15s' }}>
                  <button onClick={() => abrirDetalhe(s.id)}
                    style={{ width: '100%', padding: '16px 20px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 100 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: C.txt }}>
                        {new Date(s.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </div>
                      <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>
                        {new Date(s.hora_abertura).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        {s.hora_fechamento && ` – ${new Date(s.hora_fechamento).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
                      </div>
                    </div>
                    <div style={{ flex: 1, minWidth: 120 }}>
                      <div style={{ fontSize: 12, color: C.sub }}>Operador</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.txt }}>{(s.usuarios as any)?.nome_completo ?? '—'}</div>
                    </div>
                    <div style={{ minWidth: 100, textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: C.sub }}>Saldo inicial</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.txt }}>{fmtReal(s.saldo_inicial_especie)}</div>
                    </div>
                    <div style={{ minWidth: 100, textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: C.sub }}>Saídas espécie</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.txt }}>{fmtReal(s.total_saidas_especie ?? 0)}</div>
                    </div>
                    <div style={{ minWidth: 100, textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: C.sub }}>Total Pix</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#166534' }}>{fmtReal(s.total_pix ?? 0)}</div>
                    </div>
                    {temDiferenca && <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 99, background: '#FEF3C7', color: C.cor, fontWeight: 700 }}>Diferença</span>}
                    <div style={{ fontSize: 16, color: C.sub, marginLeft: 'auto', transform: aberta ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>▾</div>
                  </button>

                  {aberta && (
                    <div style={{ borderTop: `1px solid ${C.borda}`, padding: '20px' }}>
                      {carregandoDetalhe ? (
                        <div style={{ textAlign: 'center', color: C.sub, fontSize: 13, padding: 16 }}>Carregando detalhes...</div>
                      ) : detalhe ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                          {/* Balanço financeiro */}
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: C.txt, marginBottom: 10 }}>Balanço financeiro</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
                              {[
                                { label: 'Saldo inicial', valor: fmtReal(detalhe.sessao.saldo_inicial_especie), cor: C.txt },
                                ...detalhe.aportes.filter(a => a.tipo === 'aporte').length > 0 ? [{ label: `Aportes (${detalhe.aportes.filter(a => a.tipo === 'aporte').length})`, valor: `+ ${fmtReal(detalhe.aportes.filter(a => a.tipo === 'aporte').reduce((acc, a) => acc + a.valor, 0))}`, cor: '#166534' }] : [],
                                ...detalhe.aportes.filter(a => a.tipo === 'sangria').length > 0 ? [{ label: `Sangrias (${detalhe.aportes.filter(a => a.tipo === 'sangria').length})`, valor: `− ${fmtReal(detalhe.aportes.filter(a => a.tipo === 'sangria').reduce((acc, a) => acc + a.valor, 0))}`, cor: '#DC2626' }] : [],
                                { label: 'Saídas espécie', valor: `− ${fmtReal(detalhe.sessao.total_saidas_especie ?? 0)}`, cor: C.txt },
                                { label: 'Total Pix', valor: fmtReal(detalhe.sessao.total_pix ?? 0), cor: C.txt },
                              ].map((row, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${C.borda}` }}>
                                  <span style={{ color: row.cor }}>{row.label}</span>
                                  <span style={{ color: row.cor }}>{row.valor}</span>
                                </div>
                              ))}
                              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontWeight: 700 }}>
                                <span style={{ color: C.txt }}>Saldo esperado</span>
                                <span style={{ color: C.cor }}>{fmtReal(saldoEsperado)}</span>
                              </div>
                              {detalhe.sessao.saldo_final_especie !== null && (() => {
                                const dif = detalhe.sessao.saldo_final_especie - saldoEsperado
                                return (
                                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                                    <span style={{ color: Math.abs(dif) < 0.01 ? '#166534' : '#DC2626' }}>Diferença</span>
                                    <span style={{ color: Math.abs(dif) < 0.01 ? '#166534' : '#DC2626', fontWeight: 600 }}>
                                      {Math.abs(dif) < 0.01 ? '✓ Confere' : dif > 0 ? `Sobra ${fmtReal(dif)}` : `Falta ${fmtReal(Math.abs(dif))}`}
                                    </span>
                                  </div>
                                )
                              })()}
                            </div>
                          </div>

                          {/* Totais por produto */}
                          {detalhe.totaisPorProduto.length > 0 && (
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: C.txt, marginBottom: 10 }}>Movimentação de produtos</div>
                              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                {detalhe.totaisPorProduto.map(t => (
                                  <div key={t.nome} style={{ background: C.corLt, border: `1px solid ${C.borda}`, borderRadius: 10, padding: '12px 16px' }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: C.cor, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{t.nome}</div>
                                    <div style={{ fontSize: 18, fontWeight: 800, color: C.cor }}>{formatarKg(t.total_kg)} {t.unidade}</div>
                                    <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>{t.num_produtores} produtor(es)</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Aportes e sangrias */}
                          {detalhe.aportes.length > 0 && (
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: C.txt, marginBottom: 10 }}>Aportes e sangrias</div>
                              <div style={{ background: '#FAFAF8', border: `1px solid ${C.borda}`, borderRadius: 10, overflow: 'hidden' }}>
                                {detalhe.aportes.map(a => (
                                  <div key={a.id} style={{ padding: '10px 14px', borderBottom: `1px solid ${C.borda}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                                    <div>
                                      <span style={{ fontWeight: 600, color: a.tipo === 'aporte' ? '#166534' : '#DC2626' }}>
                                        {a.tipo === 'aporte' ? '↓ Aporte' : '↑ Sangria'}
                                      </span>
                                      <span style={{ color: C.sub, marginLeft: 8 }}>{new Date(a.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                      {a.autorizador && <span style={{ color: C.sub, marginLeft: 8 }}>· Auth: {(a.autorizador as any).nome_completo}</span>}
                                      {a.observacoes && <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>{a.observacoes}</div>}
                                    </div>
                                    <span style={{ fontWeight: 700, color: a.tipo === 'aporte' ? '#166534' : '#DC2626' }}>
                                      {a.tipo === 'aporte' ? '+' : '−'} {fmtReal(a.valor)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Saídas avulsas */}
                          {detalhe.saidasAvulsas.length > 0 && (
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: C.txt, marginBottom: 10 }}>
                                Saídas avulsas ({detalhe.saidasAvulsas.length})
                              </div>
                              <div style={{ background: '#FAFAF8', border: `1px solid ${C.borda}`, borderRadius: 10, overflow: 'hidden' }}>
                                {detalhe.saidasAvulsas.map(s => (
                                  <div key={s.id} style={{ padding: '10px 14px', borderBottom: `1px solid ${C.borda}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: 13 }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ fontWeight: 500, color: C.txt }}>{s.descricao}</div>
                                      <div style={{ fontSize: 11, color: C.sub, marginTop: 2, display: 'flex', gap: 8 }}>
                                        <span>{new Date(s.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                        {s.categoria && (
                                          <span>· {s.categoria.grupo ? `${s.categoria.grupo} — ` : ''}{s.categoria.nome}</span>
                                        )}
                                        {s.observacoes && <span>· {s.observacoes}</span>}
                                      </div>
                                    </div>
                                    <span style={{ fontWeight: 700, color: '#DC2626', marginLeft: 16, whiteSpace: 'nowrap' }}>
                                      − {fmtReal(s.valor)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Operações */}
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: C.txt, marginBottom: 10 }}>Operações ({detalhe.movimentacoes.length})</div>
                            <div style={{ background: '#FAFAF8', border: `1px solid ${C.borda}`, borderRadius: 10, overflow: 'hidden' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                                <thead>
                                  <tr style={{ borderBottom: `1px solid ${C.borda}`, background: '#F5F4F0' }}>
                                    {['Horário', 'Produtor', 'Operação', 'Qtd', 'Valor'].map((h, i) => (
                                      <th key={h} style={{ padding: '8px 12px', textAlign: i >= 3 ? 'right' : 'left', fontWeight: 600, color: C.sub }}>{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {detalhe.movimentacoes.map(m => (
                                    <tr key={m.id} style={{ borderBottom: `1px solid ${C.borda}` }}>
                                      <td style={{ padding: '8px 12px', color: C.sub, whiteSpace: 'nowrap' }}>{new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td>
                                      <td style={{ padding: '8px 12px', color: C.txt }}>{(m.contas_produtor as any)?.produtores?.nome ?? '—'}</td>
                                      <td style={{ padding: '8px 12px' }}>
                                        <div style={{ color: C.txt }}>{TIPO_LABEL[m.tipo] ?? m.tipo}</div>
                                        {m.produtos && <div style={{ fontSize: 11, color: C.sub }}>{m.produtos.nome}</div>}
                                      </td>
                                      <td style={{ padding: '8px 12px', textAlign: 'right', color: C.sub }}>
                                        {m.quantidade_produto ? `${formatarKg(m.quantidade_produto)} ${m.produtos?.unidade ?? 'kg'}` : '—'}
                                      </td>
                                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: m.valor_financeiro ? (m.tipo === 'conversao' ? '#166534' : '#DC2626') : C.txt }}>
                                        {m.valor_financeiro ? fmtReal(Math.abs(m.valor_financeiro)) : '—'}
                                      </td>
                                    </tr>
                                  ))}
                                  {detalhe.movimentacoes.length === 0 && (
                                    <tr><td colSpan={5} style={{ padding: 16, textAlign: 'center', color: C.sub }}>Nenhuma operação registrada.</td></tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {detalhe.sessao.observacoes_fechamento && (
                            <div style={{ background: '#F5F4F0', borderRadius: 8, padding: '12px 14px', fontSize: 13, color: C.sub }}>
                              <span style={{ fontWeight: 600, color: C.txt }}>Observações: </span>
                              {detalhe.sessao.observacoes_fechamento}
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
