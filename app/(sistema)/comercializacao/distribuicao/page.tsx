'use client'

import { useEffect, useState } from 'react'
import {
  listarVendasPagas,
  listarDistribuicaoPorVenda,
  calcularDistribuicao,
  pagarDistribuicao
} from '@/lib/comercializacao/distribuicao.actions'
import { fmtReal } from '@/lib/comercializacao/fmt'

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
    setCalculando(true)
    setStatus('idle')
    try {
      await calcularDistribuicao(vendaSelecionada.id)
      const l = await listarDistribuicaoPorVenda(vendaSelecionada.id)
      setLinhas(l as unknown as Linha[])
      setStatus('sucesso')
    } catch (e: any) {
      setErroMsg(e.message)
      setStatus('erro')
    } finally {
      setCalculando(false)
    }
  }

  async function handlePagar(id: string) {
    try {
      await pagarDistribuicao(id)
      const l = await listarDistribuicaoPorVenda(vendaSelecionada!.id)
      setLinhas(l as unknown as Linha[])
    } catch (e: any) {
      alert(e.message)
    }
  }

  const totalPago = linhas.filter(l => l.status === 'pago').reduce((acc, l) => acc + l.valor_liquido, 0)
  const totalPendente = linhas.filter(l => l.status === 'calculado').reduce((acc, l) => acc + l.valor_liquido, 0)

  return (
    <div style={{ padding: '32px', background: '#f8f7f4', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 500, marginBottom: '24px' }}>Distribuição de Resultado</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '24px', alignItems: 'start' }}>

        {/* Lista de vendas */}
        <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #e5e3dc', fontSize: '13px', fontWeight: 500, color: '#6b6b6b' }}>
            Vendas disponíveis
          </div>
          {vendas.length === 0 ? (
            <div style={{ padding: '20px 16px', fontSize: '13px', color: '#9a9a9a' }}>Nenhuma venda confirmada.</div>
          ) : (
            vendas.map(v => (
              <button key={v.id} onClick={() => selecionarVenda(v)} style={{
                width: '100%', padding: '12px 16px', border: 'none',
                borderBottom: '1px solid #f0ede8', textAlign: 'left', cursor: 'pointer',
                background: vendaSelecionada?.id === v.id ? '#fef3c7' : '#fff',
                borderLeft: vendaSelecionada?.id === v.id ? '3px solid #92400e' : '3px solid transparent'
              }}>
                <div style={{ fontSize: '13px', fontWeight: 500, fontFamily: 'monospace' }}>
                  {v.lotes?.codigo ?? '—'}
                </div>
                <div style={{ fontSize: '12px', color: '#6b6b6b', marginTop: '2px' }}>
                  {v.compradores?.nome ?? '—'}
                </div>
                <div style={{ fontSize: '12px', color: '#166534', marginTop: '2px' }}>
                  {v.valor_liquido != null ? fmtReal(v.valor_liquido) : '—'}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Painel de distribuição */}
        <div>
          {!vendaSelecionada ? (
            <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '40px', textAlign: 'center', color: '#9a9a9a', fontSize: '14px' }}>
              Selecione uma venda para calcular a distribuição.
            </div>
          ) : (
            <div>
              {/* Header da venda */}
              <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: '15px' }}>
                      {vendaSelecionada.lotes?.codigo} — {vendaSelecionada.compradores?.nome}
                    </div>
                    <div style={{ fontSize: '13px', color: '#6b6b6b', marginTop: '2px' }}>
                      {new Date(vendaSelecionada.data_venda).toLocaleDateString('pt-BR')} · Valor líquido: {fmtReal(vendaSelecionada.valor_liquido ?? 0)}
                    </div>
                  </div>
                  <button
                    onClick={handleCalcular}
                    disabled={calculando}
                    style={{ padding: '8px 20px', background: '#92400e', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}
                  >
                    {calculando ? 'Calculando...' : linhas.length > 0 ? 'Recalcular' : 'Calcular distribuição'}
                  </button>
                </div>
                {status === 'sucesso' && (
                  <div style={{ marginTop: '12px', color: '#166534', fontSize: '13px' }}>Distribuição calculada com sucesso.</div>
                )}
                {status === 'erro' && (
                  <div style={{ marginTop: '12px', color: '#991b1b', fontSize: '13px' }}>{erroMsg}</div>
                )}
              </div>

              {/* Resumo */}
              {linhas.length > 0 && (
                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '16px 20px' }}>
                    <div style={{ fontSize: '12px', color: '#6b6b6b' }}>Produtores</div>
                    <div style={{ fontSize: '20px', fontWeight: 600, color: '#1a1a1a' }}>{linhas.length}</div>
                  </div>
                  <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '16px 20px' }}>
                    <div style={{ fontSize: '12px', color: '#6b6b6b' }}>Pago</div>
                    <div style={{ fontSize: '20px', fontWeight: 600, color: '#166534' }}>{fmtReal(totalPago)}</div>
                  </div>
                  <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '16px 20px' }}>
                    <div style={{ fontSize: '12px', color: '#6b6b6b' }}>Pendente</div>
                    <div style={{ fontSize: '20px', fontWeight: 600, color: '#92400e' }}>{fmtReal(totalPendente)}</div>
                  </div>
                </div>
              )}

              {/* Tabela de distribuição */}
              {linhas.length > 0 && (
                <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #e5e3dc', background: '#fafaf8' }}>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500 }}>Produtor</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 500 }}>Qtd (kg)</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 500 }}>%</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 500 }}>Valor</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500 }}>Status</th>
                        <th style={{ padding: '12px 16px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {linhas.map(l => (
                        <tr key={l.id} style={{ borderBottom: '1px solid #f0ede8' }}>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontWeight: 500 }}>{l.produtores?.nome ?? '—'}</div>
                            {l.produtores?.chave_pix && (
                              <div style={{ fontSize: '12px', color: '#9a9a9a' }}>Pix: {l.produtores.chave_pix}</div>
                            )}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', color: '#6b6b6b' }}>
                            {l.quantidade_kg.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', color: '#6b6b6b' }}>
                            {l.percentual.toFixed(2)}%
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 500 }}>
                            {fmtReal(l.valor_liquido)}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{
                              fontSize: '12px', padding: '2px 10px', borderRadius: '20px',
                              background: l.status === 'pago' ? '#dcfce7' : '#fef3c7',
                              color: l.status === 'pago' ? '#166534' : '#92400e'
                            }}>
                              {l.status === 'pago' ? `Pago em ${new Date(l.data_pagamento!).toLocaleDateString('pt-BR')}` : 'Pendente'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            {l.status === 'calculado' && (
                              <button
                                onClick={() => handlePagar(l.id)}
                                style={{ fontSize: '13px', color: '#166534', background: 'none', border: 'none', cursor: 'pointer' }}
                              >
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
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
