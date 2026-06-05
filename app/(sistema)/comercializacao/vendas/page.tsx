'use client'

import { useEffect, useState } from 'react'
import { listarVendas, criarVenda, atualizarStatusVenda, editarVenda } from '@/lib/comercializacao/vendas.actions'
import { listarSafras } from '@/lib/comercializacao/safras.actions'
import { listarLotes } from '@/lib/comercializacao/lotes.actions'
import { listarCompradores } from '@/lib/comercializacao/compradores.actions'

type Venda = {
  id: string
  safra_id: string
  lote_id: string
  comprador_id: string
  data_venda: string
  quantidade_kg: number
  preco_kg: number
  valor_bruto: number
  taxa_comercializacao_pct: number
  valor_taxa: number | null
  custos_logistica: number
  valor_liquido: number | null
  status: 'rascunho' | 'confirmada' | 'entregue' | 'paga'
  observacoes: string | null
  safras: { ano: number; descricao: string | null } | null
  lotes: { codigo: string } | null
  compradores: { nome: string; tipo: string } | null
}

type Safra = { id: string; ano: number; descricao: string | null; status: string }
type Lote = { id: string; codigo: string; safra_id: string; status: string; produtos: { nome: string } | null }
type Comprador = { id: string; nome: string; tipo: string; ativo: boolean }

const STATUS_LABEL: Record<string, string> = {
  rascunho: 'Rascunho',
  confirmada: 'Confirmada',
  entregue: 'Entregue',
  paga: 'Paga'
}

const STATUS_CORES: Record<string, { bg: string; color: string }> = {
  rascunho: { bg: '#f1f0eb', color: '#6b6b6b' },
  confirmada: { bg: '#dbeafe', color: '#1e40af' },
  entregue: { bg: '#fef3c7', color: '#92400e' },
  paga: { bg: '#dcfce7', color: '#166534' }
}

const PROXIMO_STATUS: Record<string, string> = {
  rascunho: 'Confirmar venda',
  confirmada: 'Marcar entregue',
  entregue: 'Marcar paga',
  paga: ''
}

const formVazio = {
  safra_id: '',
  lote_id: '',
  comprador_id: '',
  data_venda: new Date().toISOString().split('T')[0],
  quantidade_kg: '',
  preco_kg: '',
  taxa_comercializacao_pct: '3',
  custos_logistica: '0',
  observacoes: ''
}

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
    const [v, s, l, c] = await Promise.all([listarVendas(), listarSafras(), listarLotes(), listarCompradores()])
    setVendas((v ?? []) as unknown as Venda[])
    setSafras((s ?? []) as unknown as Safra[])
    setLotes((l ?? []) as unknown as Lote[])
    setCompradores((c ?? []) as unknown as Comprador[])
  }

  function abrirNovo() {
    const safraAtiva = safras.find(s => s.status === 'em_andamento')
    const safraId = safraAtiva?.id ?? safras[0]?.id ?? ''
    const lotesDisponiveis = lotes.filter(l => l.safra_id === safraId && (l.status === 'aberto' || l.status === 'em_venda'))
    setEditando(null)
    setForm({
      ...formVazio,
      safra_id: safraId,
      lote_id: lotesDisponiveis[0]?.id ?? '',
      comprador_id: compradores.filter(c => c.ativo)[0]?.id ?? '',
      taxa_comercializacao_pct: '3'
    })
    setAbrirModal(true)
  }

  function abrirEdicao(v: Venda) {
    setEditando(v)
    setForm({
      safra_id: v.safra_id,
      lote_id: v.lote_id,
      comprador_id: v.comprador_id,
      data_venda: v.data_venda,
      quantidade_kg: v.quantidade_kg.toString(),
      preco_kg: v.preco_kg.toString(),
      taxa_comercializacao_pct: v.taxa_comercializacao_pct.toString(),
      custos_logistica: v.custos_logistica.toString(),
      observacoes: v.observacoes ?? ''
    })
    setAbrirModal(true)
  }

  async function handleSalvar() {
    if (!form.safra_id || !form.lote_id || !form.comprador_id || !form.quantidade_kg || !form.preco_kg) return
    setStatus('salvando')
    try {
      const payload = {
        safra_id: form.safra_id,
        lote_id: form.lote_id,
        comprador_id: form.comprador_id,
        data_venda: form.data_venda,
        quantidade_kg: parseFloat(form.quantidade_kg),
        preco_kg: parseFloat(form.preco_kg),
        taxa_comercializacao_pct: parseFloat(form.taxa_comercializacao_pct),
        custos_logistica: parseFloat(form.custos_logistica || '0'),
        observacoes: form.observacoes || undefined
      }
      if (editando) {
        await editarVenda(editando.id, payload)
      } else {
        await criarVenda(payload)
      }
      setAbrirModal(false)
      setEditando(null)
      await carregar()
      setStatus('sucesso')
      setTimeout(() => setStatus('idle'), 3000)
    } catch (e: any) {
      setErroMsg(e.message)
      setStatus('erro')
    }
  }

  async function handleAvancarStatus(venda: Venda) {
    const proximo: Record<string, 'rascunho' | 'confirmada' | 'entregue' | 'paga'> = {
      rascunho: 'confirmada',
      confirmada: 'entregue',
      entregue: 'paga'
    }
    const novoStatus = proximo[venda.status]
    if (!novoStatus) return
    try {
      await atualizarStatusVenda(venda.id, novoStatus)
      await carregar()
    } catch (e: any) {
      alert(e.message)
    }
  }

  const lotesFiltrados = lotes.filter(l =>
    l.safra_id === form.safra_id && (l.status === 'aberto' || l.status === 'em_venda')
  )

  const vendasFiltradas = filtroStatus === 'todos'
    ? vendas
    : vendas.filter(v => v.status === filtroStatus)

  const qtd = parseFloat(form.quantidade_kg || '0')
  const preco = parseFloat(form.preco_kg || '0')
  const taxa = parseFloat(form.taxa_comercializacao_pct || '0')
  const custos = parseFloat(form.custos_logistica || '0')
  const valorBruto = qtd * preco
  const valorTaxa = valorBruto * (taxa / 100)
  const valorLiquido = valorBruto - valorTaxa - custos

  return (
    <div style={{ padding: '32px', background: '#f8f7f4', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 500, margin: 0 }}>Vendas Externas</h1>
        <button
          onClick={abrirNovo}
          style={{ padding: '8px 20px', background: '#92400e', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}
        >
          + Nova venda
        </button>
      </div>

      {status === 'sucesso' && (
        <div style={{ marginBottom: '16px', color: '#166534', fontSize: '13px' }}>Venda salva com sucesso.</div>
      )}

      {/* Filtro status */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {['todos', 'rascunho', 'confirmada', 'entregue', 'paga'].map(s => (
          <button key={s} onClick={() => setFiltroStatus(s)} style={{
            padding: '6px 16px', border: '1px solid #e5e3dc', borderRadius: '20px',
            fontSize: '13px', cursor: 'pointer',
            background: filtroStatus === s ? '#92400e' : '#fff',
            color: filtroStatus === s ? '#fff' : '#6b6b6b'
          }}>
            {s === 'todos' ? 'Todas' : STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e5e3dc', background: '#fafaf8' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500 }}>Data</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500 }}>Lote</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500 }}>Comprador</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 500 }}>Qtd (kg)</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 500 }}>Preço/kg</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 500 }}>Valor líquido</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500 }}>Status</th>
              <th style={{ padding: '12px 16px' }}></th>
            </tr>
          </thead>
          <tbody>
            {vendasFiltradas.map(v => (
              <tr key={v.id} style={{ borderBottom: '1px solid #f0ede8' }}>
                <td style={{ padding: '12px 16px', color: '#6b6b6b' }}>
                  {new Date(v.data_venda).toLocaleDateString('pt-BR')}
                </td>
                <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '13px' }}>
                  {v.lotes?.codigo ?? '—'}
                </td>
                <td style={{ padding: '12px 16px' }}>{v.compradores?.nome ?? '—'}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', color: '#6b6b6b' }}>
                  {v.quantidade_kg.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right', color: '#6b6b6b' }}>
                  R$ {v.preco_kg.toFixed(2)}
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 500, color: '#166534' }}>
                  {v.valor_liquido != null ? `R$ ${v.valor_liquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    fontSize: '12px', padding: '2px 10px', borderRadius: '20px',
                    background: STATUS_CORES[v.status].bg,
                    color: STATUS_CORES[v.status].color
                  }}>
                    {STATUS_LABEL[v.status]}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    {v.status !== 'paga' && (
                      <button
                        onClick={() => handleAvancarStatus(v)}
                        style={{ fontSize: '12px', color: '#1e40af', background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        {PROXIMO_STATUS[v.status]}
                      </button>
                    )}
                    {v.status === 'rascunho' && (
                      <button
                        onClick={() => abrirEdicao(v)}
                        style={{ fontSize: '12px', color: '#92400e', background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        Editar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {vendasFiltradas.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: '#6b6b6b' }}>
                  Nenhuma venda encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {abrirModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
          padding: '24px'
        }}>
          <div style={{
            background: '#fff', borderRadius: '12px', padding: '28px',
            width: '560px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto'
          }}>
            <div style={{ fontWeight: 500, fontSize: '16px', marginBottom: '20px' }}>
              {editando ? 'Editar venda' : 'Nova venda'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                  <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Safra *</label>
                  <select value={form.safra_id}
                    onChange={e => setForm(f => ({ ...f, safra_id: e.target.value, lote_id: '' }))}
                    style={{ padding: '8px 12px', border: '1px solid #e5e3dc', borderRadius: '8px', fontSize: '14px' }}>
                    {safras.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.descricao ?? `Safra ${s.ano}`}{s.status === 'em_andamento' ? ' ★' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                  <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Lote *</label>
                  <select value={form.lote_id}
                    onChange={e => setForm(f => ({ ...f, lote_id: e.target.value }))}
                    style={{ padding: '8px 12px', border: '1px solid #e5e3dc', borderRadius: '8px', fontSize: '14px' }}>
                    <option value="">Selecionar...</option>
                    {lotesFiltrados.map(l => (
                      <option key={l.id} value={l.id}>{l.codigo}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 2 }}>
                  <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Comprador *</label>
                  <select value={form.comprador_id}
                    onChange={e => setForm(f => ({ ...f, comprador_id: e.target.value }))}
                    style={{ padding: '8px 12px', border: '1px solid #e5e3dc', borderRadius: '8px', fontSize: '14px' }}>
                    <option value="">Selecionar...</option>
                    {compradores.filter(c => c.ativo).map(c => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                  <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Data da venda *</label>
                  <input type="date" value={form.data_venda}
                    onChange={e => setForm(f => ({ ...f, data_venda: e.target.value }))}
                    style={{ padding: '8px 12px', border: '1px solid #e5e3dc', borderRadius: '8px', fontSize: '14px' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                  <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Quantidade (kg) *</label>
                  <input type="number" step="0.001" value={form.quantidade_kg}
                    onChange={e => setForm(f => ({ ...f, quantidade_kg: e.target.value }))}
                    style={{ padding: '8px 12px', border: '1px solid #e5e3dc', borderRadius: '8px', fontSize: '14px' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                  <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Preço/kg (R$) *</label>
                  <input type="number" step="0.01" value={form.preco_kg}
                    onChange={e => setForm(f => ({ ...f, preco_kg: e.target.value }))}
                    style={{ padding: '8px 12px', border: '1px solid #e5e3dc', borderRadius: '8px', fontSize: '14px' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                  <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Taxa cooperativa (%)</label>
                  <input type="number" step="0.01" value={form.taxa_comercializacao_pct}
                    onChange={e => setForm(f => ({ ...f, taxa_comercializacao_pct: e.target.value }))}
                    style={{ padding: '8px 12px', border: '1px solid #e5e3dc', borderRadius: '8px', fontSize: '14px' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                  <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Custos logística (R$)</label>
                  <input type="number" step="0.01" value={form.custos_logistica}
                    onChange={e => setForm(f => ({ ...f, custos_logistica: e.target.value }))}
                    style={{ padding: '8px 12px', border: '1px solid #e5e3dc', borderRadius: '8px', fontSize: '14px' }} />
                </div>
              </div>

              {/* Preview do cálculo */}
              {qtd > 0 && preco > 0 && (
                <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '8px', padding: '12px 16px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: '#6b6b6b' }}>Valor bruto</span>
                    <span>R$ {valorBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: '#6b6b6b' }}>Taxa ({taxa}%)</span>
                    <span>− R$ {valorTaxa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  {custos > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ color: '#6b6b6b' }}>Logística</span>
                      <span>− R$ {custos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #fde68a', paddingTop: '8px', fontWeight: 600, color: '#92400e' }}>
                    <span>Valor líquido</span>
                    <span>R$ {valorLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Observações</label>
                <input value={form.observacoes} placeholder="Opcional"
                  onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                  style={{ padding: '8px 12px', border: '1px solid #e5e3dc', borderRadius: '8px', fontSize: '14px' }} />
              </div>

            </div>

            {status === 'erro' && (
              <div style={{ marginTop: '12px', color: '#991b1b', fontSize: '13px' }}>{erroMsg}</div>
            )}

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setAbrirModal(false); setEditando(null) }}
                style={{ padding: '8px 16px', border: '1px solid #e5e3dc', borderRadius: '8px', background: '#fff', fontSize: '14px', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSalvar}
                disabled={status === 'salvando'}
                style={{ padding: '8px 20px', background: '#92400e', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}
              >
                {status === 'salvando' ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
