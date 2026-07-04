'use client'

import { useEffect, useState } from 'react'
import {
  listarVendasPagas,
  listarDistribuicaoPorVenda,
  calcularDistribuicao,
  pagarDistribuicao
} from '@/lib/comercializacao/distribuicao.actions'
import { fmtReal } from '@/lib/comercializacao/fmt'
import { PageLayout } from '@/components/comercializacao/ui/PageLayout'
import { KpiCard } from '@/components/comercializacao/ui/KpiCard'
import { ContentCard } from '@/components/comercializacao/ui/ContentCard'
import { Badge } from '@/components/comercializacao/ui/Badge'
import { EmptyState } from '@/components/comercializacao/ui/EmptyState'
import { COM_C } from '@/components/comercializacao/ui/tokens'
import { Btn } from '@/components/ui/Btn'

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
    <PageLayout
      titulo="Distribuição de Resultado"
      icone="ti-git-branch"
      breadcrumb={[{ label: 'Distribuição' }]}
      fullHeight
    >
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 24, alignItems: 'start' }}>

        <ContentCard title="Vendas disponíveis" noPadding>
          {vendas.length === 0 ? (
            <div style={{ padding: '20px 16px', fontSize: 13, color: COM_C.txtSub }}>Nenhuma venda confirmada.</div>
          ) : vendas.map(v => (
            <button key={v.id} onClick={() => selecionarVenda(v)} style={{
              width: '100%', padding: '12px 16px', border: 'none',
              borderBottom: `1px solid ${COM_C.borda}`, textAlign: 'left', cursor: 'pointer',
              background: vendaSelecionada?.id === v.id ? COM_C.marromLt : '#fff',
              borderLeft: vendaSelecionada?.id === v.id ? `3px solid ${COM_C.marrom}` : '3px solid transparent',
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: COM_C.txt }}>{v.lotes?.codigo ?? '—'}</div>
              <div style={{ fontSize: 12, color: COM_C.txtSub, marginTop: 2 }}>{v.compradores?.nome ?? '—'}</div>
              <div style={{ fontSize: 12, color: COM_C.verde, marginTop: 2 }}>
                {v.valor_liquido != null ? fmtReal(v.valor_liquido) : '—'}
              </div>
            </button>
          ))}
        </ContentCard>

        <div>
          {!vendaSelecionada ? (
            <EmptyState
              emoji="🌿"
              titulo="Selecione uma venda"
              descricao="Escolha uma venda na lista ao lado para calcular a distribuição."
            />
          ) : (
            <>
              <ContentCard
                action={
                  <Btn variante="marrom" onClick={handleCalcular} disabled={calculando}>
                    {calculando ? 'Calculando...' : linhas.length > 0 ? 'Recalcular' : 'Calcular distribuição'}
                  </Btn>
                }
              >
                <div style={{ fontWeight: 700, fontSize: 15, color: COM_C.txt }}>
                  {vendaSelecionada.lotes?.codigo} — {vendaSelecionada.compradores?.nome}
                </div>
                <div style={{ fontSize: 13, color: COM_C.txtSub, marginTop: 2 }}>
                  {new Date(vendaSelecionada.data_venda).toLocaleDateString('pt-BR')} · Valor líquido: {fmtReal(vendaSelecionada.valor_liquido ?? 0)}
                </div>
                {status === 'sucesso' && <div style={{ marginTop: 12, color: COM_C.verde, fontSize: 13 }}>Distribuição calculada com sucesso.</div>}
                {status === 'erro'   && <div style={{ marginTop: 12, color: COM_C.vermelho, fontSize: 13 }}>{erroMsg}</div>}
              </ContentCard>

              {linhas.length > 0 && (
                <div className="com-kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', margin: '16px 0' }}>
                  <KpiCard label="Produtores" value={String(linhas.length)} icon="ti-users" cor={COM_C.marrom} corLt={COM_C.marromLt} />
                  <KpiCard label="Pago" value={fmtReal(totalPago)} icon="ti-circle-check" cor={COM_C.verde} corLt={COM_C.verdeLt} />
                  <KpiCard label="Pendente" value={fmtReal(totalPendente)} icon="ti-clock" cor={COM_C.laranja} corLt={COM_C.laranjaLt} />
                </div>
              )}

              {linhas.length > 0 && (
                <ContentCard noPadding>
                  <table className="com-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        {['Produtor', 'Qtd (kg)', '%', 'Valor', 'Status', ''].map(h => (
                          <th key={h} style={{ textAlign: h === '' || h === 'Status' || h === 'Produtor' ? 'left' : 'right' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {linhas.map(l => (
                        <tr key={l.id}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{l.produtores?.nome ?? '—'}</div>
                            {l.produtores?.chave_pix && <div style={{ fontSize: 11, color: COM_C.txtSub }}>Pix: {l.produtores.chave_pix}</div>}
                          </td>
                          <td style={{ textAlign: 'right', color: COM_C.txtSub }}>{l.quantidade_kg.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}</td>
                          <td style={{ textAlign: 'right', color: COM_C.txtSub }}>{l.percentual.toFixed(2)}%</td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmtReal(l.valor_liquido)}</td>
                          <td>
                            <Badge
                              label={l.status === 'pago' ? `Pago em ${new Date(l.data_pagamento!).toLocaleDateString('pt-BR')}` : 'Pendente'}
                              bg={l.status === 'pago' ? COM_C.verdeLt : COM_C.marromLt}
                              cor={l.status === 'pago' ? COM_C.verde : COM_C.marrom}
                            />
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {l.status === 'calculado' && (
                              <Btn variante="cinza" tamanho="sm" onClick={() => handlePagar(l.id)} style={{ color: COM_C.verde, borderColor: COM_C.verdeLt, background: COM_C.verdeLt }}>
                                Marcar pago
                              </Btn>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ContentCard>
              )}
            </>
          )}
        </div>
      </div>
    </PageLayout>
  )
}