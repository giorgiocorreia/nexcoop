'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  listarVendasPagas,
  listarDistribuicaoPorVenda,
  calcularDistribuicao,
  pagarDistribuicao
} from '@/lib/comercializacao/distribuicao.actions'
import { fmtReal } from '@/lib/comercializacao/fmt'

const C = {
  cor: '#92400e', corLt: '#FDF8F4',
  borda: '#E5E3DC', bg: '#F8F7F4',
  txt: '#1C1917', sub: '#78716C',
}

type VendaSimples = {
  id: string
  data_venda: string
  valor_liquido: number | null
  lotes: { codigo: string } | null
  compradores: { nome: string } | null
}

type Linha = {
  id: string
  produtor_id: string
  conta_id: string
  quantidade_kg: number
  percentual: number
  valor_bruto: number
  valor_liquido: number
  status: 'calculado' | 'pago'
  data_pagamento: string | null
  produtores: { nome: string; chave_pix: string | null; telefone: string | null } | null
}

export default function DistribuicaoPage() {
  const [vendas, setVendas] = useState<VendaSimples[]>([])
  const [vendaSelecionada, setVendaSelecionada] = useState<VendaSimples | null>(null)
  const [linhas, setLinhas] = useState<Linha[]>([])
  const [calculando, setCalculando] = useState(false)
  const [status, setStatus] = useState<'idle' | 'sucesso' | 'erro'>('idle')
  const [erroMsg, setErroMsg] = useState('')

  useEffect(() => { carregar() }, [])

  async function carregar() {
    const v = await listarVendasPagas()
    setVendas(v as unknown as VendaSimples[])
  }

  async function selecionarVenda(v: VendaSimples) {
    setVendaSelecionada(v)
    const l = await listarDistribuicaoPorVenda(v.id)
    setLinhas(l as unknown as Linha[])
    setStatus('idle')
  }

  async function handleCalcular() {
    if (!vendaSelecionada) return
    setCalculando(true); setStatus('idle')
    try {
      await calcularDistribuicao(vendaSelecionada.id)
      const l = await listarDistribuicaoPorVenda(vendaSelecionada.id)
      setLinhas(l as unknown as Linha[])
      setStatus('sucesso')
    } catch (e: any) { setErroMsg(e.message); setStatus('erro') }
    finally { setCalculando(false) }
  }

  async function handlePagar(id: string) {
    try {
      await pagarDistribuicao(id)
      const l = await listarDistribuicaoPorVenda(vendaSelecionada!.id)
      setLinhas(l as unknown as Linha[])
    } catch (e: any) { alert(e.message) }
  }

  const totalPago     = linhas.filter(l => l.status === 'pago').reduce((acc, l) => acc + l.valor_liquido, 0)
  const totalPendente = linhas.filter(l => l.status === 'calculado').reduce((acc, l) => acc + l.valor_liquido, 0)

  return (
    <>
      <style>{`
        .dist-header  { padding: 0 32px; min-height: 88px; display: flex; align-items: center; }
        .dist-content { padding: 28px 32px; }
        @media (max-width: 640px) {
          .dist-header  { padding: 0 16px 0 56px; min-height: 60px; }
          .dist-content { padding: 16px; }
        }
      `}</style>

      <header className="dist-header" style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: '#fff', borderBottom: `1px solid ${C.borda}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, margin: '0 -2rem 0 -2rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: C.corLt, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <i className="ti ti-git-branch" style={{ fontSize: 20, color: C.cor }} />
          </div>
          <div>
            <h1 style={{ fontSize: 19, fontWeight: 800, color: C.txt, margin: 0, lineHeight: 1.2 }}>Distribuição de Resultado</h1>
            <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>
              <Link href="/comercializacao" style={{ color: C.sub, textDecoration: 'none' }}>Comercialização</Link>
              {' / '}Distribuição
            </div>
          </div>
        </div>
      </header>

      <div className="dist-content" style={{ background: C.bg, margin: '0 -2rem -2rem -2rem', minHeight: 'calc(100vh - 88px)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 24, alignItems: 'start' }}>

          {/* Lista de vendas */}
          <div style={{ background: '#fff', border: `1px solid ${C.borda}`, borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.borda}`, fontSize: 13, fontWeight: 600, color: C.sub }}>
              Vendas disponíveis
            </div>
            {vendas.length === 0 ? (
              <div style={{ padding: '20px 16px', fontSize: 13, color: C.sub }}>Nenhuma venda confirmada.</div>
            ) : vendas.map(v => (
              <button key={v.id} onClick={() => selecionarVenda(v)} style={{
                width: '100%', padding: '12px 16px', border: 'none',
                borderBottom: `1px solid ${C.borda}`, textAlign: 'left', cursor: 'pointer',
                background: vendaSelecionada?.id === v.id ? C.corLt : '#fff',
                borderLeft: vendaSelecionada?.id === v.id ? `3px solid ${C.cor}` : '3px solid transparent',
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.txt }}>{v.lotes?.codigo ?? '—'}</div>
                <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>{v.compradores?.nome ?? '—'}</div>
                <div style={{ fontSize: 12, color: '#166534', marginTop: 2 }}>
                  {v.valor_liquido != null ? fmtReal(v.valor_liquido) : '—'}
                </div>
              </button>
            ))}
          </div>

          {/* Painel de distribuição */}
          <div>
            {!vendaSelecionada ? (
              <div style={{ background: '#fff', border: `1px solid ${C.borda}`, borderRadius: 12, padding: '48px', textAlign: 'center', color: C.sub, fontSize: 14 }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🌿</div>
                Selecione uma venda para calcular a distribuição.
              </div>
            ) : (
              <>
                {/* Header da venda */}
                <div style={{ background: '#fff', border: `1px solid ${C.borda}`, borderRadius: 12, padding: '20px', marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: C.txt }}>
                        {vendaSelecionada.lotes?.codigo} — {vendaSelecionada.compradores?.nome}
                      </div>
                      <div style={{ fontSize: 13, color: C.sub, marginTop: 2 }}>
                        {new Date(vendaSelecionada.data_venda).toLocaleDateString('pt-BR')} · Valor líquido: {fmtReal(vendaSelecionada.valor_liquido ?? 0)}
                      </div>
                    </div>
                    <button onClick={handleCalcular} disabled={calculando}
                      style={{ padding: '9px 18px', background: C.cor, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                      {calculando ? 'Calculando...' : linhas.length > 0 ? 'Recalcular' : 'Calcular distribuição'}
                    </button>
                  </div>
                  {status === 'sucesso' && <div style={{ marginTop: 12, color: '#166534', fontSize: 13 }}>Distribuição calculada com sucesso.</div>}
                  {status === 'erro'   && <div style={{ marginTop: 12, color: '#DC2626', fontSize: 13 }}>{erroMsg}</div>}
                </div>

                {/* KPIs resumo */}
                {linhas.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
                    {[
                      { label: 'Produtores',   valor: String(linhas.length),   cor: C.cor,     bg: C.corLt   },
                      { label: 'Pago',         valor: fmtReal(totalPago),      cor: '#166534', bg: '#F0FDF4' },
                      { label: 'Pendente',     valor: fmtReal(totalPendente),  cor: '#C2410C', bg: '#FFF7ED' },
                    ].map(k => (
                      <div key={k.label} style={{ background: '#fff', border: `1px solid ${C.borda}`, borderRadius: 12, padding: '16px 20px' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.sub, marginBottom: 6 }}>{k.label}</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: k.cor }}>{k.valor}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tabela */}
                {linhas.length > 0 && (
                  <div style={{ background: '#fff', border: `1px solid ${C.borda}`, borderRadius: 12, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${C.borda}`, background: '#FAFAF8' }}>
                          {['Produtor', 'Qtd (kg)', '%', 'Valor', 'Status', ''].map(h => (
                            <th key={h} style={{ padding: '10px 16px', textAlign: h === '' || h === 'Status' ? 'left' : h === 'Produtor' ? 'left' : 'right', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.sub }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {linhas.map(l => (
                          <tr key={l.id} style={{ borderBottom: `1px solid ${C.borda}` }}>
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ fontWeight: 600, color: C.txt }}>{l.produtores?.nome ?? '—'}</div>
                              {l.produtores?.chave_pix && <div style={{ fontSize: 11, color: C.sub }}>Pix: {l.produtores.chave_pix}</div>}
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', color: C.sub }}>{l.quantidade_kg.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}</td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', color: C.sub }}>{l.percentual.toFixed(2)}%</td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: C.txt }}>{fmtReal(l.valor_liquido)}</td>
                            <td style={{ padding: '12px 16px' }}>
                              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99,
                                background: l.status === 'pago' ? '#DCFCE7' : '#FEF3C7',
                                color:      l.status === 'pago' ? '#166534' : C.cor }}>
                                {l.status === 'pago' ? `Pago em ${new Date(l.data_pagamento!).toLocaleDateString('pt-BR')}` : 'Pendente'}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                              {l.status === 'calculado' && (
                                <button onClick={() => handlePagar(l.id)}
                                  style={{ fontSize: 12, fontWeight: 600, color: '#166534', background: 'none', border: 'none', cursor: 'pointer' }}>
                                  Marcar pago
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
