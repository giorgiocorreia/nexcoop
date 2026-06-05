'use client'

import { useEffect, useState } from 'react'
import { listarLotes, criarLote, editarLote, getProximoCodigoLote } from '@/lib/comercializacao/lotes.actions'
import { listarSafras } from '@/lib/comercializacao/safras.actions'
import { listarProdutos } from '@/lib/comercializacao/produtos.actions'

type Lote = {
  id: string
  codigo: string
  safra_id: string
  produto_id: string
  peso_total_kg: number
  status: 'aberto' | 'em_venda' | 'entregue'
  observacoes: string | null
  created_at: string
  safras: { ano: number; descricao: string | null } | null
  produtos: { nome: string; unidade: string } | null
}

type Safra = { id: string; ano: number; descricao: string | null; status: string }
type Produto = { id: string; nome: string; unidade: string }

const STATUS_LABEL: Record<string, string> = {
  aberto: 'Aberto',
  em_venda: 'Em venda',
  entregue: 'Entregue'
}

const STATUS_CORES: Record<string, { bg: string; color: string }> = {
  aberto: { bg: '#dbeafe', color: '#1e40af' },
  em_venda: { bg: '#fef3c7', color: '#92400e' },
  entregue: { bg: '#dcfce7', color: '#166534' }
}

const formVazio = {
  safra_id: '',
  produto_id: '',
  codigo: '',
  peso_total_kg: '',
  observacoes: ''
}

export default function LotesPage() {
  const [lotes, setLotes] = useState<Lote[]>([])
  const [safras, setSafras] = useState<Safra[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [editando, setEditando] = useState<Lote | null>(null)
  const [form, setForm] = useState(formVazio)
  const [abrirModal, setAbrirModal] = useState(false)
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')
  const [status, setStatus] = useState<'idle' | 'salvando' | 'sucesso' | 'erro'>('idle')
  const [erroMsg, setErroMsg] = useState('')

  useEffect(() => { carregar() }, [])

  async function carregar() {
    const [l, s, p] = await Promise.all([listarLotes(), listarSafras(), listarProdutos()])
    setLotes((l ?? []) as unknown as Lote[])
    setSafras((s ?? []) as unknown as Safra[])
    setProdutos(((p ?? []) as any[]).filter((pr) => pr.ativo !== false) as Produto[])
  }

  async function abrirNovo() {
    const [codigo, s, p] = await Promise.all([getProximoCodigoLote(), listarSafras(), listarProdutos()])
    const safraAtiva = (s as any[]).find(x => x.status === 'em_andamento')
    setSafras((s ?? []) as unknown as Safra[])
    setProdutos(((p ?? []) as any[]).filter((pr) => pr.ativo !== false) as Produto[])
    setEditando(null)
    setForm({
      ...formVazio,
      codigo,
      safra_id: safraAtiva?.id ?? (s as any[])[0]?.id ?? '',
      produto_id: (p as any[])[0]?.id ?? ''
    })
    setAbrirModal(true)
  }

  function abrirEdicao(l: Lote) {
    setEditando(l)
    setForm({
      safra_id: l.safra_id,
      produto_id: l.produto_id,
      codigo: l.codigo,
      peso_total_kg: l.peso_total_kg.toString(),
      observacoes: l.observacoes ?? ''
    })
    setAbrirModal(true)
  }

  async function handleSalvar() {
    if (!form.codigo || !form.peso_total_kg || !form.safra_id || !form.produto_id) return
    setStatus('salvando')
    try {
      if (editando) {
        await editarLote(editando.id, {
          codigo: form.codigo,
          peso_total_kg: parseFloat(form.peso_total_kg),
          observacoes: form.observacoes || undefined,
          status: editando.status
        })
      } else {
        await criarLote({
          safra_id: form.safra_id,
          produto_id: form.produto_id,
          codigo: form.codigo,
          peso_total_kg: parseFloat(form.peso_total_kg),
          observacoes: form.observacoes || undefined
        })
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

  const lotesFiltrados = filtroStatus === 'todos'
    ? lotes
    : lotes.filter(l => l.status === filtroStatus)

  return (
    <div style={{ padding: '32px', background: '#f8f7f4', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 500, margin: 0 }}>Lotes</h1>
        <button
          onClick={abrirNovo}
          style={{ padding: '8px 20px', background: '#92400e', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}
        >
          + Novo lote
        </button>
      </div>

      {status === 'sucesso' && (
        <div style={{ marginBottom: '16px', color: '#166534', fontSize: '13px' }}>Lote salvo com sucesso.</div>
      )}

      {/* Filtro status */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {['todos', 'aberto', 'em_venda', 'entregue'].map(s => (
          <button key={s} onClick={() => setFiltroStatus(s)} style={{
            padding: '6px 16px', border: '1px solid #e5e3dc', borderRadius: '20px',
            fontSize: '13px', cursor: 'pointer',
            background: filtroStatus === s ? '#92400e' : '#fff',
            color: filtroStatus === s ? '#fff' : '#6b6b6b'
          }}>
            {s === 'todos' ? 'Todos' : STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e5e3dc', background: '#fafaf8' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500 }}>Código</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500 }}>Produto</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500 }}>Safra</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 500 }}>Peso total</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500 }}>Status</th>
              <th style={{ padding: '12px 16px' }}></th>
            </tr>
          </thead>
          <tbody>
            {lotesFiltrados.map(l => (
              <tr key={l.id} style={{ borderBottom: '1px solid #f0ede8' }}>
                <td style={{ padding: '12px 16px', fontWeight: 500, fontFamily: 'monospace', fontSize: '13px' }}>
                  {l.codigo}
                </td>
                <td style={{ padding: '12px 16px' }}>{l.produtos?.nome ?? '—'}</td>
                <td style={{ padding: '12px 16px', color: '#6b6b6b' }}>
                  {l.safras?.descricao ?? `Safra ${l.safras?.ano}`}
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right', color: '#6b6b6b' }}>
                  {l.peso_total_kg.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} {l.produtos?.unidade ?? 'kg'}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    fontSize: '12px', padding: '2px 10px', borderRadius: '20px',
                    background: STATUS_CORES[l.status].bg,
                    color: STATUS_CORES[l.status].color
                  }}>
                    {STATUS_LABEL[l.status]}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                  <button
                    onClick={() => abrirEdicao(l)}
                    style={{ fontSize: '13px', color: '#92400e', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))}
            {lotesFiltrados.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#6b6b6b' }}>
                  Nenhum lote encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {abrirModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50
        }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '28px', width: '480px', maxWidth: '95vw' }}>
            <div style={{ fontWeight: 500, fontSize: '16px', marginBottom: '20px' }}>
              {editando ? 'Editar lote' : 'Novo lote'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                  <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Código *</label>
                  <input value={form.codigo}
                    onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))}
                    style={{ padding: '8px 12px', border: '1px solid #e5e3dc', borderRadius: '8px', fontSize: '14px', fontFamily: 'monospace' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                  <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Peso total (kg) *</label>
                  <input type="number" step="0.001" value={form.peso_total_kg}
                    onChange={e => setForm(f => ({ ...f, peso_total_kg: e.target.value }))}
                    style={{ padding: '8px 12px', border: '1px solid #e5e3dc', borderRadius: '8px', fontSize: '14px' }} />
                </div>
              </div>

              {!editando && (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Safra *</label>
                    <select value={form.safra_id} onChange={e => setForm(f => ({ ...f, safra_id: e.target.value }))}
                      style={{ padding: '8px 12px', border: '1px solid #e5e3dc', borderRadius: '8px', fontSize: '14px' }}>
                      {safras.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.descricao ?? `Safra ${s.ano}`}{s.status === 'em_andamento' ? ' ★' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Produto *</label>
                    <select value={form.produto_id} onChange={e => setForm(f => ({ ...f, produto_id: e.target.value }))}
                      style={{ padding: '8px 12px', border: '1px solid #e5e3dc', borderRadius: '8px', fontSize: '14px' }}>
                      {produtos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                    </select>
                  </div>
                </>
              )}

              {editando && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Status</label>
                  <select value={editando.status}
                    onChange={e => setEditando(l => l && ({ ...l, status: e.target.value as 'aberto' | 'em_venda' | 'entregue' }))}
                    style={{ padding: '8px 12px', border: '1px solid #e5e3dc', borderRadius: '8px', fontSize: '14px' }}>
                    <option value="aberto">Aberto</option>
                    <option value="em_venda">Em venda</option>
                    <option value="entregue">Entregue</option>
                  </select>
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
