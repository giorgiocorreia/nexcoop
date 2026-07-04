'use client'

import { useEffect, useState } from 'react'
import { listarVendas, criarVenda, atualizarStatusVenda, editarVenda } from '@/lib/comercializacao/vendas.actions'
import { fmtReal } from '@/lib/comercializacao/fmt'
import { listarSafras } from '@/lib/comercializacao/safras.actions'
import { listarLotes } from '@/lib/comercializacao/lotes.actions'
import { listarCompradores } from '@/lib/comercializacao/compradores.actions'
import { PageLayout } from '@/components/comercializacao/ui/PageLayout'
import { ContentCard } from '@/components/comercializacao/ui/ContentCard'
import { Modal } from '@/components/comercializacao/ui/Modal'
import { Field, Input, Select } from '@/components/comercializacao/ui/Field'
import { Badge } from '@/components/comercializacao/ui/Badge'
import { Tabs } from '@/components/comercializacao/ui/Tabs'
import { COM_C } from '@/components/comercializacao/ui/tokens'
import { Btn } from '@/components/ui/Btn'

type Venda = {
  id: string; safra_id: string; lote_id: string; comprador_id: string
  data_venda: string; quantidade_kg: number; preco_kg: number; valor_bruto: number
  taxa_comercializacao_pct: number; valor_taxa: number | null; custos_logistica: number
  valor_liquido: number | null; status: 'rascunho' | 'confirmada' | 'entregue' | 'paga'
  observacoes: string | null
  safras: { ano: number; descricao: string | null } | null
  lotes: { codigo: string } | null
  compradores: { nome: string; tipo: string } | null
}

type Safra = { id: string; ano: number; descricao: string | null; status: string }
type Lote = { id: string; codigo: string; safra_id: string; status: string }
type Comprador = { id: string; nome: string; tipo: string; ativo: boolean }

const STATUS_LABEL: Record<string, string> = {
  rascunho: 'Rascunho', confirmada: 'Confirmada', entregue: 'Entregue', paga: 'Paga'
}

const STATUS_CORES: Record<string, { bg: string; cor: string }> = {
  rascunho:  { bg: '#F1F0EB', cor: '#78716C' },
  confirmada: { bg: '#DBEAFE', cor: '#1E40AF' },
  entregue:  { bg: '#FEF3C7', cor: '#92400E' },
  paga:      { bg: '#DCFCE7', cor: '#166534' }
}

const PROXIMO_STATUS: Record<string, string> = {
  rascunho: 'Confirmar venda', confirmada: 'Marcar entregue', entregue: 'Marcar paga', paga: ''
}

const formVazio = {
  safra_id: '', lote_id: '', comprador_id: '',
  data_venda: new Date().toISOString().split('T')[0],
  quantidade_kg: '', preco_kg: '', taxa_comercializacao_pct: '3',
  custos_logistica: '0', observacoes: ''
}

const FILTRO_TABS = [
  { id: 'todos', label: 'Todas' },
  { id: 'rascunho', label: 'Rascunho' },
  { id: 'confirmada', label: 'Confirmada' },
  { id: 'entregue', label: 'Entregue' },
  { id: 'paga', label: 'Paga' },
]

export default function VendasPage() {
  const [vendas, setVendas] = useState<Venda[]>([])
  const [safras, setSafras] = useState<Safra[]>([])
  const [lotes, setLotes] = useState<Lote[]>([])
  const [compradores, setCompradores] = useState<Comprador[]>([])
  const [editando, setEditando] = useState<Venda | null>(null)
  const [form, setForm] = useState(formVazio)
  const [abrirModal, setAbrirModal] = useState(false)
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [status, setStatus] = useState<'idle' | 'salvando' | 'sucesso' | 'erro'>('idle')
  const [erroMsg, setErroMsg] = useState('')

  useEffect(() => { carregar() }, [])

  async function carregar() {
    const [v, s, l, comp] = await Promise.all([listarVendas(), listarSafras(), listarLotes(), listarCompradores()])
    setVendas((v ?? []) as unknown as Venda[])
    setSafras((s ?? []) as unknown as Safra[])
    setLotes((l ?? []) as unknown as Lote[])
    setCompradores((comp ?? []) as unknown as Comprador[])
  }

  function abrirNovo() {
    const safraAtiva = safras.find(s => s.status === 'em_andamento')
    const safraId = safraAtiva?.id ?? safras[0]?.id ?? ''
    const lotesDisponiveis = lotes.filter(l => l.safra_id === safraId && (l.status === 'aberto' || l.status === 'em_venda'))
    setEditando(null)
    setForm({ ...formVazio, safra_id: safraId, lote_id: lotesDisponiveis[0]?.id ?? '', comprador_id: compradores.filter(c => c.ativo)[0]?.id ?? '', taxa_comercializacao_pct: '3' })
    setAbrirModal(true)
  }

  function abrirEdicao(v: Venda) {
    setEditando(v)
    setForm({ safra_id: v.safra_id, lote_id: v.lote_id, comprador_id: v.comprador_id, data_venda: v.data_venda, quantidade_kg: v.quantidade_kg.toString(), preco_kg: v.preco_kg.toString(), taxa_comercializacao_pct: v.taxa_comercializacao_pct.toString(), custos_logistica: v.custos_logistica.toString(), observacoes: v.observacoes ?? '' })
    setAbrirModal(true)
  }

  function fecharModal() {
    setAbrirModal(false)
    setEditando(null)
    setErroMsg('')
    setStatus('idle')
  }

  async function handleSalvar() {
    if (!form.safra_id || !form.lote_id || !form.comprador_id || !form.quantidade_kg || !form.preco_kg) return
    setStatus('salvando')
    try {
      const payload = { safra_id: form.safra_id, lote_id: form.lote_id, comprador_id: form.comprador_id, data_venda: form.data_venda, quantidade_kg: parseFloat(form.quantidade_kg), preco_kg: parseFloat(form.preco_kg), taxa_comercializacao_pct: parseFloat(form.taxa_comercializacao_pct), custos_logistica: parseFloat(form.custos_logistica || '0'), observacoes: form.observacoes || undefined }
      if (editando) { await editarVenda(editando.id, payload) } else { await criarVenda(payload) }
      fecharModal()
      await carregar()
      setStatus('sucesso')
      setTimeout(() => setStatus('idle'), 3000)
    } catch (e: any) { setErroMsg(e.message); setStatus('erro') }
  }

  async function handleAvancarStatus(venda: Venda) {
    const proximo: Record<string, 'rascunho' | 'confirmada' | 'entregue' | 'paga'> = { rascunho: 'confirmada', confirmada: 'entregue', entregue: 'paga' }
    const novoStatus = proximo[venda.status]
    if (!novoStatus) return
    try { await atualizarStatusVenda(venda.id, novoStatus); await carregar() }
    catch (e: any) { alert(e.message) }
  }

  const lotesFiltrados = lotes.filter(l => l.safra_id === form.safra_id && (l.status === 'aberto' || l.status === 'em_venda'))
  const vendasFiltradas = filtroStatus === 'todos' ? vendas : vendas.filter(v => v.status === filtroStatus)

  const qtd = parseFloat(form.quantidade_kg || '0')
  const preco = parseFloat(form.preco_kg || '0')
  const taxa = parseFloat(form.taxa_comercializacao_pct || '0')
  const custos = parseFloat(form.custos_logistica || '0')
  const valorBruto = qtd * preco
  const valorTaxa = valorBruto * (taxa / 100)
  const valorLiquido = valorBruto - valorTaxa - custos

  return (
    <PageLayout
      titulo="Vendas Externas"
      icone="ti-arrows-exchange"
      breadcrumb={[{ label: 'Vendas Externas' }]}
      fullHeight
      acoes={
        <Btn variante="marrom" icone="ti-plus" onClick={abrirNovo}>Nova venda</Btn>
      }
    >
      {status === 'sucesso' && (
        <div style={{ marginBottom: 16, color: COM_C.verde, fontSize: 13 }}>Venda salva com sucesso.</div>
      )}

      <Tabs tabs={FILTRO_TABS} ativa={filtroStatus} onChange={setFiltroStatus} />

      <ContentCard noPadding>
        <table className="com-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Data', 'Lote', 'Comprador', 'Qtd (kg)', 'Preço/kg', 'Valor líquido', 'Status', ''].map((h, i) => (
                <th key={h} style={{ textAlign: i >= 3 && i <= 5 ? 'right' : i === 7 ? 'right' : 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {vendasFiltradas.map(v => (
              <tr key={v.id}>
                <td style={{ color: COM_C.txtSub }}>{new Date(v.data_venda).toLocaleDateString('pt-BR')}</td>
                <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{v.lotes?.codigo ?? '—'}</td>
                <td>{v.compradores?.nome ?? '—'}</td>
                <td style={{ textAlign: 'right', color: COM_C.txtSub }}>{v.quantidade_kg.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}</td>
                <td style={{ textAlign: 'right', color: COM_C.txtSub }}>{fmtReal(v.preco_kg)}</td>
                <td style={{ textAlign: 'right', fontWeight: 600, color: COM_C.verde }}>
                  {v.valor_liquido != null ? fmtReal(v.valor_liquido) : '—'}
                </td>
                <td>
                  <Badge label={STATUS_LABEL[v.status]} bg={STATUS_CORES[v.status].bg} cor={STATUS_CORES[v.status].cor} />
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    {v.status !== 'paga' && (
                      <Btn variante="cinza" tamanho="sm" onClick={() => handleAvancarStatus(v)} style={{ color: COM_C.azul, border: 'none', background: 'none', boxShadow: 'none' }}>
                        {PROXIMO_STATUS[v.status]}
                      </Btn>
                    )}
                    {v.status === 'rascunho' && (
                      <Btn variante="cinza" tamanho="sm" onClick={() => abrirEdicao(v)} style={{ color: COM_C.marrom, border: 'none', background: 'none', boxShadow: 'none' }}>
                        Editar
                      </Btn>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {vendasFiltradas.length === 0 && (
              <tr><td colSpan={8} style={{ padding: 24, textAlign: 'center', color: COM_C.txtSub }}>Nenhuma venda encontrada.</td></tr>
            )}
          </tbody>
        </table>
      </ContentCard>

      {abrirModal && (
        <Modal
          titulo={editando ? 'Editar venda' : 'Nova venda'}
          onClose={fecharModal}
          largura={560}
          footer={
            <>
              <Btn variante="cinza" onClick={fecharModal}>Cancelar</Btn>
              <Btn variante="marrom" onClick={handleSalvar} disabled={status === 'salvando'}>
                {status === 'salvando' ? 'Salvando...' : 'Salvar'}
              </Btn>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <Field label="Safra *" >
                <Select value={form.safra_id} onChange={e => setForm(f => ({ ...f, safra_id: e.target.value, lote_id: '' }))}>
                  {safras.map(s => <option key={s.id} value={s.id}>{s.descricao ?? `Safra ${s.ano}`}{s.status === 'em_andamento' ? ' ★' : ''}</option>)}
                </Select>
              </Field>
              <Field label="Lote *">
                <Select value={form.lote_id} onChange={e => setForm(f => ({ ...f, lote_id: e.target.value }))}>
                  <option value="">Selecionar...</option>
                  {lotesFiltrados.map(l => <option key={l.id} value={l.id}>{l.codigo}</option>)}
                </Select>
              </Field>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <Field label="Comprador *">
                <Select value={form.comprador_id} onChange={e => setForm(f => ({ ...f, comprador_id: e.target.value }))}>
                  <option value="">Selecionar...</option>
                  {compradores.filter(c => c.ativo).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </Select>
              </Field>
              <Field label="Data da venda *">
                <Input type="date" value={form.data_venda} onChange={e => setForm(f => ({ ...f, data_venda: e.target.value }))} />
              </Field>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <Field label="Quantidade (kg) *">
                <Input type="number" step="0.001" value={form.quantidade_kg} onChange={e => setForm(f => ({ ...f, quantidade_kg: e.target.value }))} />
              </Field>
              <Field label="Preço/kg (R$) *">
                <Input type="number" step="0.01" value={form.preco_kg} onChange={e => setForm(f => ({ ...f, preco_kg: e.target.value }))} />
              </Field>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <Field label="Taxa cooperativa (%)">
                <Input type="number" step="0.01" value={form.taxa_comercializacao_pct} onChange={e => setForm(f => ({ ...f, taxa_comercializacao_pct: e.target.value }))} />
              </Field>
              <Field label="Custos logística (R$)">
                <Input type="number" step="0.01" value={form.custos_logistica} onChange={e => setForm(f => ({ ...f, custos_logistica: e.target.value }))} />
              </Field>
            </div>

            {qtd > 0 && preco > 0 && (
              <div style={{ background: COM_C.marromLt, border: '1px solid #FDE68A', borderRadius: 8, padding: '12px 16px', fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: COM_C.txtSub }}>Valor bruto</span><span>{fmtReal(valorBruto)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: COM_C.txtSub }}>Taxa ({taxa}%)</span><span>− {fmtReal(valorTaxa)}</span>
                </div>
                {custos > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: COM_C.txtSub }}>Logística</span><span>− {fmtReal(custos)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #FDE68A', paddingTop: 8, fontWeight: 700, color: COM_C.marrom }}>
                  <span>Valor líquido</span><span>{fmtReal(valorLiquido)}</span>
                </div>
              </div>
            )}

            <Field label="Observações">
              <Input value={form.observacoes} placeholder="Opcional" onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} />
            </Field>
          </div>

          {status === 'erro' && <div style={{ marginTop: 12, color: COM_C.vermelho, fontSize: 13 }}>{erroMsg}</div>}
        </Modal>
      )}
    </PageLayout>
  )
}