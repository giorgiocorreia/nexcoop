'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  listarSessoesFechadas,
  getDetalheSessao
} from '@/lib/comercializacao/diario.actions'
import { fmtReal } from '@/lib/comercializacao/fmt'

const COR = '#92400e'

type Sessao = {
  id: string
  data: string
  hora_abertura: string
  hora_fechamento: string | null
  saldo_inicial_especie: number
  saldo_final_especie: number | null
  saldo_especie_calculado: number | null
  total_saidas_especie: number
  total_pix: number
  observacoes_fechamento: string | null
  usuarios: { id: string; nome_completo: string } | null
}

type Movimentacao = {
  id: string
  tipo: string
  quantidade_produto: number | null
  valor_financeiro: number | null
  forma_pagamento: string | null
  observacoes: string | null
  created_at: string
  produtos: { nome: string; unidade: string } | null
  contas_produtor: { produtor_id: string; produtores: { nome: string } | null } | null
}

type AporteSangria = {
  id: string
  tipo: string
  valor: number
  observacoes: string | null
  created_at: string
  autorizador: { nome_completo: string } | null
  executor: { nome_completo: string } | null
}

type TotalProduto = {
  nome: string
  unidade: string
  total_kg: number
  num_produtores: number
}

type Detalhe = {
  sessao: Sessao
  movimentacoes: Movimentacao[]
  aportes: AporteSangria[]
  totaisPorProduto: TotalProduto[]
}

const TIPO_LABEL: Record<string, string> = {
  entrega: 'Entrega',
  conversao: 'Conversão',
  saque_especie: 'Saque espécie',
  saque_pix: 'Saque Pix',
  ajuste_produto: 'Ajuste produto',
  ajuste_financeiro: 'Ajuste financeiro',
  estorno: 'Estorno',
  compra_loja: 'Compra loja'
}

function formatarKg(v: number): string {
  const s = v.toFixed(3).replace(/\.?0+$/, '')
  return s.replace('.', ',')
}

export default function DiarioCaixaPage() {
  const router = useRouter()
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
    setCarregando(true)
    setSessaoAberta(null)
    setDetalhe(null)
    try {
      const data = await listarSessoesFechadas(mes, ano)
      setSessoes((data ?? []) as unknown as Sessao[])
    } finally {
      setCarregando(false)
    }
  }

  async function abrirDetalhe(sessao_id: string) {
    if (sessaoAberta === sessao_id) {
      setSessaoAberta(null)
      setDetalhe(null)
      return
    }
    setSessaoAberta(sessao_id)
    setDetalhe(null)
    setCarregandoDetalhe(true)
    try {
      const d = await getDetalheSessao(sessao_id)
      setDetalhe(d as unknown as Detalhe)
    } finally {
      setCarregandoDetalhe(false)
    }
  }

  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ]

  const anosDisponiveis = Array.from({ length: 3 }, (_, i) => hoje.getFullYear() - i)

  // Totais do período
  const totalEntradas = sessoes.reduce((acc, s) => acc + (s.saldo_inicial_especie ?? 0), 0)
  const totalPix = sessoes.reduce((acc, s) => acc + (s.total_pix ?? 0), 0)
  const totalSaidas = sessoes.reduce((acc, s) => acc + (s.total_saidas_especie ?? 0), 0)

  return (
    <div style={{ padding: '32px', background: '#f8f7f4', minHeight: '100vh' }}>

      {/* CABEÇALHO */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button onClick={() => router.push('/comercializacao')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b6b6b', fontSize: '14px', padding: 0 }}>
          <span style={{ fontSize: '18px', lineHeight: 1 }}>←</span> Voltar
        </button>
        <h1 style={{ fontSize: '22px', fontWeight: 500, margin: 0 }}>Diário de Caixa</h1>
      </div>

      {/* FILTROS */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={mes} onChange={e => setMes(parseInt(e.target.value))}
          style={{ padding: '8px 12px', border: '1px solid #e5e3dc', borderRadius: '8px', fontSize: '14px', background: '#fff', color: '#374151', cursor: 'pointer' }}>
          {meses.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
        </select>
        <select value={ano} onChange={e => setAno(parseInt(e.target.value))}
          style={{ padding: '8px 12px', border: '1px solid #e5e3dc', borderRadius: '8px', fontSize: '14px', background: '#fff', color: '#374151', cursor: 'pointer' }}>
          {anosDisponiveis.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <span style={{ fontSize: '13px', color: '#6b6b6b' }}>
          {sessoes.length} sessão(ões) encontrada(s)
        </span>
      </div>

      {/* CARDS RESUMO DO PERÍODO */}
      {sessoes.length > 0 && (
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
          <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '16px 20px', minWidth: '160px' }}>
            <div style={{ fontSize: '11px', color: '#6b6b6b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Sessões no período</div>
            <div style={{ fontSize: '22px', fontWeight: 500, color: '#111827' }}>{sessoes.length}</div>
          </div>
          <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '16px 20px', minWidth: '160px' }}>
            <div style={{ fontSize: '11px', color: '#6b6b6b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Total saídas espécie</div>
            <div style={{ fontSize: '22px', fontWeight: 500, color: '#111827' }}>{fmtReal(totalSaidas)}</div>
          </div>
          <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '16px 20px', minWidth: '160px' }}>
            <div style={{ fontSize: '11px', color: '#6b6b6b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Total Pix</div>
            <div style={{ fontSize: '22px', fontWeight: 500, color: '#111827' }}>{fmtReal(totalPix)}</div>
          </div>
        </div>
      )}

      {/* LISTA DE SESSÕES */}
      {carregando ? (
        <div style={{ padding: '32px', textAlign: 'center', color: '#6b6b6b' }}>Carregando...</div>
      ) : sessoes.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '48px', textAlign: 'center', color: '#6b6b6b', fontSize: '14px' }}>
          Nenhuma sessão fechada em {meses[mes - 1]} de {ano}.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {sessoes.map(s => {
            const aberta = sessaoAberta === s.id
            const saldoEsperado = s.saldo_especie_calculado ?? (s.saldo_inicial_especie - s.total_saidas_especie)
            const temDiferenca = s.saldo_final_especie !== null && Math.abs(s.saldo_final_especie - saldoEsperado) > 0.01

            return (
              <div key={s.id} style={{ background: '#fff', border: `1px solid ${aberta ? COR : '#e5e3dc'}`, borderRadius: '12px', overflow: 'hidden', transition: 'border-color 0.15s' }}>

                {/* LINHA DA SESSÃO */}
                <button
                  onClick={() => abrirDetalhe(s.id)}
                  style={{ width: '100%', padding: '16px 20px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}
                >
                  {/* Data */}
                  <div style={{ minWidth: '100px' }}>
                    <div style={{ fontWeight: 600, fontSize: '15px', color: '#1a1a1a' }}>
                      {new Date(s.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b6b6b', marginTop: '2px' }}>
                      {new Date(s.hora_abertura).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      {s.hora_fechamento && ` – ${new Date(s.hora_fechamento).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
                    </div>
                  </div>

                  {/* Operador */}
                  <div style={{ flex: 1, minWidth: '120px' }}>
                    <div style={{ fontSize: '13px', color: '#6b6b6b' }}>Operador</div>
                    <div style={{ fontSize: '14px', fontWeight: 500 }}>{(s.usuarios as any)?.nome_completo ?? '—'}</div>
                  </div>

                  {/* Saldo inicial */}
                  <div style={{ minWidth: '100px', textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', color: '#6b6b6b' }}>Saldo inicial</div>
                    <div style={{ fontSize: '14px', fontWeight: 500 }}>{fmtReal(s.saldo_inicial_especie)}</div>
                  </div>

                  {/* Saídas espécie */}
                  <div style={{ minWidth: '100px', textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', color: '#6b6b6b' }}>Saídas espécie</div>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>{fmtReal(s.total_saidas_especie ?? 0)}</div>
                  </div>

                  {/* Pix */}
                  <div style={{ minWidth: '100px', textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', color: '#6b6b6b' }}>Total Pix</div>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: '#166534' }}>{fmtReal(s.total_pix ?? 0)}</div>
                  </div>

                  {/* Diferença */}
                  {temDiferenca && (
                    <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: '#fef3c7', color: '#92400e', fontWeight: 500 }}>
                      Diferença
                    </span>
                  )}

                  {/* Chevron */}
                  <div style={{ fontSize: '16px', color: '#6b6b6b', marginLeft: 'auto', transform: aberta ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>▾</div>
                </button>

                {/* DETALHE EXPANDIDO */}
                {aberta && (
                  <div style={{ borderTop: '1px solid #e5e3dc', padding: '20px' }}>
                    {carregandoDetalhe ? (
                      <div style={{ textAlign: 'center', color: '#6b6b6b', fontSize: '13px', padding: '16px' }}>Carregando detalhes...</div>
                    ) : detalhe ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                        {/* BALANÇO FINANCEIRO */}
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#1a1a1a', marginBottom: '10px' }}>Balanço financeiro</div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f0ede8' }}>
                              <span style={{ color: '#6b6b6b' }}>Saldo inicial</span>
                              <span>{fmtReal(detalhe.sessao.saldo_inicial_especie)}</span>
                            </div>
                            {detalhe.aportes.filter(a => a.tipo === 'aporte').length > 0 && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f0ede8' }}>
                                <span style={{ color: '#166534' }}>Aportes ({detalhe.aportes.filter(a => a.tipo === 'aporte').length})</span>
                                <span style={{ color: '#166534' }}>+ {fmtReal(detalhe.aportes.filter(a => a.tipo === 'aporte').reduce((acc, a) => acc + a.valor, 0))}</span>
                              </div>
                            )}
                            {detalhe.aportes.filter(a => a.tipo === 'sangria').length > 0 && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f0ede8' }}>
                                <span style={{ color: '#991b1b' }}>Sangrias ({detalhe.aportes.filter(a => a.tipo === 'sangria').length})</span>
                                <span style={{ color: '#991b1b' }}>− {fmtReal(detalhe.aportes.filter(a => a.tipo === 'sangria').reduce((acc, a) => acc + a.valor, 0))}</span>
                              </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f0ede8' }}>
                              <span style={{ color: '#6b6b6b' }}>Saídas espécie</span>
                              <span>− {fmtReal(detalhe.sessao.total_saidas_especie ?? 0)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f0ede8' }}>
                              <span style={{ color: '#6b6b6b' }}>Total Pix</span>
                              <span>{fmtReal(detalhe.sessao.total_pix ?? 0)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontWeight: 600 }}>
                              <span>Saldo esperado</span>
                              <span style={{ color: COR }}>{fmtReal(saldoEsperado)}</span>
                            </div>
                            {detalhe.sessao.saldo_final_especie !== null && (
                              <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f0ede8' }}>
                                  <span style={{ color: '#6b6b6b' }}>Saldo contado</span>
                                  <span>{fmtReal(detalhe.sessao.saldo_final_especie)}</span>
                                </div>
                                {(() => {
                                  const dif = detalhe.sessao.saldo_final_especie - saldoEsperado
                                  if (Math.abs(dif) < 0.01) return (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                                      <span style={{ color: '#166534' }}>Diferença</span>
                                      <span style={{ color: '#166534', fontWeight: 500 }}>✓ Confere</span>
                                    </div>
                                  )
                                  return (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                                      <span style={{ color: '#991b1b' }}>Diferença</span>
                                      <span style={{ color: '#991b1b', fontWeight: 500 }}>{dif > 0 ? `Sobra ${fmtReal(dif)}` : `Falta ${fmtReal(Math.abs(dif))}`}</span>
                                    </div>
                                  )
                                })()}
                              </>
                            )}
                          </div>
                        </div>

                        {/* TOTAIS POR PRODUTO */}
                        {detalhe.totaisPorProduto.length > 0 && (
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#1a1a1a', marginBottom: '10px' }}>Movimentação de produtos</div>
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                              {detalhe.totaisPorProduto.map(t => (
                                <div key={t.nome} style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '10px', padding: '12px 16px' }}>
                                  <div style={{ fontSize: '11px', color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>{t.nome}</div>
                                  <div style={{ fontSize: '18px', fontWeight: 700, color: COR }}>{formatarKg(t.total_kg)} {t.unidade}</div>
                                  <div style={{ fontSize: '12px', color: '#6b6b6b', marginTop: '2px' }}>{t.num_produtores} produtor(es)</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* APORTES E SANGRIAS */}
                        {detalhe.aportes.length > 0 && (
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#1a1a1a', marginBottom: '10px' }}>Aportes e sangrias</div>
                            <div style={{ background: '#fafaf8', border: '1px solid #e5e3dc', borderRadius: '10px', overflow: 'hidden' }}>
                              {detalhe.aportes.map(a => (
                                <div key={a.id} style={{ padding: '10px 14px', borderBottom: '1px solid #f0ede8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                                  <div>
                                    <span style={{ fontWeight: 500, color: a.tipo === 'aporte' ? '#166534' : '#991b1b' }}>
                                      {a.tipo === 'aporte' ? '↓ Aporte' : '↑ Sangria'}
                                    </span>
                                    <span style={{ color: '#6b6b6b', marginLeft: '8px' }}>
                                      {new Date(a.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    {a.autorizador && (
                                      <span style={{ color: '#9a9a9a', marginLeft: '8px' }}>· Auth: {(a.autorizador as any).nome_completo}</span>
                                    )}
                                    {a.observacoes && <div style={{ fontSize: '12px', color: '#9a9a9a', marginTop: '2px' }}>{a.observacoes}</div>}
                                  </div>
                                  <span style={{ fontWeight: 600, color: a.tipo === 'aporte' ? '#166534' : '#991b1b' }}>
                                    {a.tipo === 'aporte' ? '+' : '−'} {fmtReal(a.valor)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* OPERAÇÕES DO DIA */}
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#1a1a1a', marginBottom: '10px' }}>
                            Operações ({detalhe.movimentacoes.length})
                          </div>
                          <div style={{ background: '#fafaf8', border: '1px solid #e5e3dc', borderRadius: '10px', overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                              <thead>
                                <tr style={{ borderBottom: '1px solid #e5e3dc', background: '#f5f4f0' }}>
                                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 500, color: '#6b6b6b' }}>Horário</th>
                                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 500, color: '#6b6b6b' }}>Produtor</th>
                                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 500, color: '#6b6b6b' }}>Operação</th>
                                  <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 500, color: '#6b6b6b' }}>Qtd</th>
                                  <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 500, color: '#6b6b6b' }}>Valor</th>
                                </tr>
                              </thead>
                              <tbody>
                                {detalhe.movimentacoes.map(m => (
                                  <tr key={m.id} style={{ borderBottom: '1px solid #f0ede8' }}>
                                    <td style={{ padding: '8px 12px', color: '#6b6b6b', whiteSpace: 'nowrap' }}>
                                      {new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                    <td style={{ padding: '8px 12px' }}>
                                      {(m.contas_produtor as any)?.produtores?.nome ?? '—'}
                                    </td>
                                    <td style={{ padding: '8px 12px' }}>
                                      <div>{TIPO_LABEL[m.tipo] ?? m.tipo}</div>
                                      {m.produtos && <div style={{ fontSize: '11px', color: '#9a9a9a' }}>{m.produtos.nome}</div>}
                                    </td>
                                    <td style={{ padding: '8px 12px', textAlign: 'right', color: '#6b6b6b' }}>
                                      {m.quantidade_produto ? `${formatarKg(m.quantidade_produto)} ${m.produtos?.unidade ?? 'kg'}` : '—'}
                                    </td>
                                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 500, color: m.valor_financeiro ? (m.tipo === 'conversao' ? '#166534' : '#991b1b') : '#1a1a1a' }}>
                                      {m.valor_financeiro ? fmtReal(Math.abs(m.valor_financeiro)) : '—'}
                                    </td>
                                  </tr>
                                ))}
                                {detalhe.movimentacoes.length === 0 && (
                                  <tr><td colSpan={5} style={{ padding: '16px', textAlign: 'center', color: '#6b6b6b' }}>Nenhuma operação registrada.</td></tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* OBSERVAÇÕES */}
                        {detalhe.sessao.observacoes_fechamento && (
                          <div style={{ background: '#f5f4f0', borderRadius: '8px', padding: '12px 14px', fontSize: '13px', color: '#6b6b6b' }}>
                            <span style={{ fontWeight: 500, color: '#1a1a1a' }}>Observações: </span>
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

      {/* EXPANSÕES FUTURAS: paginação quando volume crescer */}
    </div>
  )
}