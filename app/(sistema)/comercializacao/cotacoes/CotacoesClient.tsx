'use client'

import { useEffect, useState } from 'react'
import { listarCotacoes, registrarCotacao } from '@/lib/comercializacao/cotacoes.actions'
import { listarProdutos } from '@/lib/comercializacao/produtos.actions'
import { fmtReal } from '@/lib/comercializacao/fmt'
import { Btn } from '@/components/ui/Btn'
import { PageLayout } from '@/components/comercializacao/ui/PageLayout'
import { KpiCard } from '@/components/comercializacao/ui/KpiCard'
import { ContentCard } from '@/components/comercializacao/ui/ContentCard'
import { Field, Input, Select } from '@/components/comercializacao/ui/Field'
import { EmptyState } from '@/components/comercializacao/ui/EmptyState'
import { COM_C } from '@/components/comercializacao/ui/tokens'

type Produto = { id: string; nome: string; unidade: string }
type Cotacao = {
  id: string
  vigente_a_partir_de: string
  produto_id: string
  preco_externo: number
  preco_cooperado: number
  observacoes: string | null
  produtos: { nome: string; unidade: string }
}

function mascaraPreco(valor: string): string {
  const digits = valor.replace(/\D/g, '')
  if (!digits) return ''
  const num = parseInt(digits, 10) / 100
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function parsePreco(valor: string): number {
  return parseFloat(valor.replace(/\./g, '').replace(',', '.')) || 0
}

export default function CotacoesClient({ podeRegistrar }: { podeRegistrar: boolean }) {
  const agora = new Date().toISOString().slice(0, 16)
  const [cotacoes, setCotacoes] = useState<Cotacao[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [form, setForm] = useState({ produto_id: '', vigente_a_partir_de: agora, preco_externo: '', preco_cooperado: '', observacoes: '' })
  const [status, setStatus] = useState<'idle' | 'salvando' | 'sucesso' | 'erro'>('idle')
  const [erroMsg, setErroMsg] = useState('')

  useEffect(() => { carregar() }, [])

  async function carregar() {
    const [c, p] = await Promise.all([listarCotacoes(), listarProdutos()])
    setCotacoes(c)
    setProdutos(p.filter((p: any) => p.ativo))
    if (p.length > 0 && !form.produto_id) setForm(f => ({ ...f, produto_id: p[0].id }))
  }

  const precoExt  = parsePreco(form.preco_externo)
  const precoCoop = parsePreco(form.preco_cooperado)
  const avisoPreco = form.preco_externo && form.preco_cooperado && precoCoop < precoExt

  async function handleSalvar() {
    if (!form.produto_id || !form.preco_externo || !form.preco_cooperado) return
    setStatus('salvando')
    try {
      await registrarCotacao({ produto_id: form.produto_id, vigente_a_partir_de: new Date(form.vigente_a_partir_de).toISOString(), preco_externo: precoExt, preco_cooperado: precoCoop, observacoes: form.observacoes })
      setForm(f => ({ ...f, preco_externo: '', preco_cooperado: '', observacoes: '' }))
      await carregar()
      setStatus('sucesso')
      setTimeout(() => setStatus('idle'), 3000)
    } catch (e: any) { setErroMsg(e.message); setStatus('erro') }
  }

  const ultimasPorProduto = produtos.map(p => ({ produto: p, cotacao: cotacoes.find(c => c.produto_id === p.id) ?? null }))

  return (
    <PageLayout
      titulo="Cotações"
      breadcrumb={[{ label: 'Cotações' }]}
      icone="ti-chart-line"
      fullHeight
    >
      {ultimasPorProduto.length > 0 && (
        <div className="com-kpi-grid-4" style={{ marginBottom: 24 }}>
          {ultimasPorProduto.map(({ produto, cotacao }) => (
            <KpiCard
              key={produto.id}
              label={produto.nome}
              value={cotacao ? fmtReal(cotacao.preco_cooperado) : '—'}
              sub={cotacao ? new Date(cotacao.vigente_a_partir_de).toLocaleString('pt-BR') : 'Sem cotação'}
              icon="ti-chart-line"
              cor={COM_C.azul}
              corLt={COM_C.azulLt}
            >
              {cotacao ? (
                <>
                  <div style={{ fontSize: 12, color: COM_C.txtSub }}>
                    Externo: <strong style={{ color: COM_C.txt }}>{fmtReal(cotacao.preco_externo)}/{produto.unidade}</strong>
                  </div>
                  <div style={{ fontSize: 12, color: COM_C.marrom, marginTop: 2 }}>
                    Cooperado: <strong>{fmtReal(cotacao.preco_cooperado)}/{produto.unidade}</strong>
                  </div>
                </>
              ) : null}
            </KpiCard>
          ))}
        </div>
      )}

      {podeRegistrar && (
        <div style={{ marginBottom: 24 }}>
        <ContentCard title="Registrar cotação">
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ minWidth: 160 }}>
              <Field label="Produto">
                <Select value={form.produto_id} onChange={e => setForm(f => ({ ...f, produto_id: e.target.value }))}>
                  {produtos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </Select>
              </Field>
            </div>
            <div style={{ minWidth: 200 }}>
              <Field label="Vigente a partir de">
                <Input type="datetime-local" value={form.vigente_a_partir_de} onChange={e => setForm(f => ({ ...f, vigente_a_partir_de: e.target.value }))} />
              </Field>
            </div>
            <div style={{ minWidth: 140 }}>
              <Field label="Preço externo (R$/kg)">
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: COM_C.txtSub, zIndex: 1 }}>R$</span>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="0,00"
                    value={form.preco_externo}
                    onChange={e => setForm(f => ({ ...f, preco_externo: mascaraPreco(e.target.value) }))}
                    style={{ paddingLeft: 32, width: 120 }}
                  />
                </div>
              </Field>
            </div>
            <div style={{ minWidth: 140 }}>
              <Field label="Preço cooperado (R$/kg)">
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: COM_C.txtSub, zIndex: 1 }}>R$</span>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="0,00"
                    value={form.preco_cooperado}
                    onChange={e => setForm(f => ({ ...f, preco_cooperado: mascaraPreco(e.target.value) }))}
                    style={{ paddingLeft: 32, width: 120 }}
                  />
                </div>
              </Field>
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <Field label="Observações">
                <Input placeholder="Opcional" value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} />
              </Field>
            </div>
            <Btn variante="marrom" onClick={handleSalvar} disabled={status === 'salvando'}>
              {status === 'salvando' ? 'Salvando...' : 'Registrar'}
            </Btn>
          </div>
          {avisoPreco && (
            <div style={{ marginTop: 12, color: '#B45309', fontSize: 12 }}>
              Atenção: preço cooperado está menor que preço externo.
            </div>
          )}
          {status === 'sucesso' && <div style={{ marginTop: 10, color: COM_C.verde, fontSize: 13 }}>✓ Cotação registrada.</div>}
          {status === 'erro'    && <div style={{ marginTop: 10, color: COM_C.vermelho, fontSize: 13 }}>{erroMsg}</div>}
        </ContentCard>
        </div>
      )}

      <ContentCard title="Histórico de cotações" noPadding>
        {cotacoes.length === 0 ? (
          <div style={{ padding: '32px' }}>
            <EmptyState emoji="📈" titulo="Nenhuma cotação registrada ainda" descricao="Registre a primeira cotação para acompanhar o histórico de preços." />
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="com-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Data/hora', 'Produto', 'Externo', 'Cooperado', 'Diferença'].map((h, i) => (
                    <th key={h} style={{ textAlign: i >= 2 ? 'right' : 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cotacoes.map(c => {
                  const diff = ((c.preco_cooperado - c.preco_externo) / c.preco_externo * 100).toFixed(1)
                  return (
                    <tr key={c.id}>
                      <td style={{ color: COM_C.txtSub }}>{new Date(c.vigente_a_partir_de).toLocaleString('pt-BR')}</td>
                      <td style={{ fontWeight: 600 }}>{c.produtos?.nome}</td>
                      <td style={{ textAlign: 'right', color: COM_C.txtSub }}>{fmtReal(c.preco_externo)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: COM_C.marrom }}>{fmtReal(c.preco_cooperado)}</td>
                      <td style={{ textAlign: 'right', color: COM_C.verde, fontSize: 12 }}>+{diff}%</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </ContentCard>
    </PageLayout>
  )
}