'use client'

import { useEffect, useState } from 'react'
import { listarSafras, criarSafra, editarSafra } from '@/lib/comercializacao/safras.actions'

type Safra = {
  id: string
  ano: number
  descricao: string | null
  estimativa_kg: number | null
  taxa_comercializacao: number
  status: 'planejamento' | 'em_andamento' | 'encerrada'
}

const STATUS_LABEL: Record<string, string> = {
  planejamento: 'Planejamento',
  em_andamento: 'Em andamento',
  encerrada: 'Encerrada'
}

const STATUS_CORES: Record<string, { bg: string; color: string }> = {
  planejamento: { bg: '#f1f0eb', color: '#6b6b6b' },
  em_andamento: { bg: '#dcfce7', color: '#166534' },
  encerrada: { bg: '#f1f0eb', color: '#9a9a9a' }
}

const formVazio = {
  ano: new Date().getFullYear(),
  descricao: '',
  estimativa_kg: '',
  taxa_comercializacao: '3',
  status: 'planejamento' as 'planejamento' | 'em_andamento' | 'encerrada'
}

export default function SafrasPage() {
  const [safras, setSafras] = useState<Safra[]>([])
  const [editando, setEditando] = useState<Safra | null>(null)
  const [form, setForm] = useState(formVazio)
  const [abrirModal, setAbrirModal] = useState(false)
  const [status, setStatus] = useState<'idle' | 'salvando' | 'sucesso' | 'erro'>('idle')
  const [erroMsg, setErroMsg] = useState('')

  useEffect(() => { carregar() }, [])

  async function carregar() {
    const data = await listarSafras()
    setSafras((data ?? []) as unknown as Safra[])
  }

  function abrirEdicao(s: Safra) {
    setEditando(s)
    setForm({
      ano: s.ano,
      descricao: s.descricao ?? '',
      estimativa_kg: s.estimativa_kg?.toString() ?? '',
      taxa_comercializacao: s.taxa_comercializacao.toString(),
      status: s.status
    })
    setAbrirModal(true)
  }

  function abrirNovo() {
    setEditando(null)
    setForm(formVazio)
    setAbrirModal(true)
  }

  async function handleSalvar() {
    setStatus('salvando')
    try {
      const payload = {
        ano: Number(form.ano),
        descricao: form.descricao || undefined,
        estimativa_kg: form.estimativa_kg ? parseFloat(form.estimativa_kg) : undefined,
        taxa_comercializacao: parseFloat(form.taxa_comercializacao),
        status: form.status
      }
      if (editando) {
        await editarSafra(editando.id, payload)
      } else {
        await criarSafra(payload)
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

  const safraAtiva = safras.find(s => s.status === 'em_andamento')

  return (
    <div style={{ padding: '32px', background: '#f8f7f4', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 500, margin: 0 }}>Safras</h1>
          {safraAtiva && (
            <div style={{ fontSize: '13px', color: '#166534', marginTop: '4px' }}>
              Safra ativa: <strong>{safraAtiva.descricao ?? `Safra ${safraAtiva.ano}`}</strong> · Taxa: {safraAtiva.taxa_comercializacao}%
            </div>
          )}
        </div>
        <button
          onClick={abrirNovo}
          style={{ padding: '8px 20px', background: '#92400e', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}
        >
          + Nova safra
        </button>
      </div>

      {status === 'sucesso' && (
        <div style={{ marginBottom: '16px', color: '#166534', fontSize: '13px' }}>Safra salva com sucesso.</div>
      )}

      <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e5e3dc', background: '#fafaf8' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500 }}>Safra</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500 }}>Ano</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 500 }}>Estimativa</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 500 }}>Taxa</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500 }}>Status</th>
              <th style={{ padding: '12px 16px' }}></th>
            </tr>
          </thead>
          <tbody>
            {safras.map(s => (
              <tr key={s.id} style={{ borderBottom: '1px solid #f0ede8' }}>
                <td style={{ padding: '12px 16px', fontWeight: 500 }}>
                  {s.descricao ?? `Safra ${s.ano}`}
                </td>
                <td style={{ padding: '12px 16px', color: '#6b6b6b' }}>{s.ano}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', color: '#6b6b6b' }}>
                  {s.estimativa_kg ? `${s.estimativa_kg.toLocaleString('pt-BR')} kg` : '—'}
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right', color: '#6b6b6b' }}>
                  {s.taxa_comercializacao}%
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    fontSize: '12px', padding: '2px 10px', borderRadius: '20px',
                    background: STATUS_CORES[s.status].bg,
                    color: STATUS_CORES[s.status].color
                  }}>
                    {STATUS_LABEL[s.status]}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                  <button
                    onClick={() => abrirEdicao(s)}
                    style={{ fontSize: '13px', color: '#92400e', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))}
            {safras.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#6b6b6b' }}>
                  Nenhuma safra cadastrada ainda.
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
          <div style={{ background: '#fff', borderRadius: '12px', padding: '28px', width: '440px', maxWidth: '95vw' }}>
            <div style={{ fontWeight: 500, fontSize: '16px', marginBottom: '20px' }}>
              {editando ? 'Editar safra' : 'Nova safra'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                  <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Ano *</label>
                  <input
                    type="number" value={form.ano}
                    onChange={e => setForm(f => ({ ...f, ano: parseInt(e.target.value) }))}
                    style={{ padding: '8px 12px', border: '1px solid #e5e3dc', borderRadius: '8px', fontSize: '14px' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                  <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Taxa comercialização (%)</label>
                  <input
                    type="number" step="0.01" value={form.taxa_comercializacao}
                    onChange={e => setForm(f => ({ ...f, taxa_comercializacao: e.target.value }))}
                    style={{ padding: '8px 12px', border: '1px solid #e5e3dc', borderRadius: '8px', fontSize: '14px' }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Descrição</label>
                <input
                  value={form.descricao} placeholder="Ex: Safra Principal 2026"
                  onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                  style={{ padding: '8px 12px', border: '1px solid #e5e3dc', borderRadius: '8px', fontSize: '14px' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Estimativa de produção (kg)</label>
                <input
                  type="number" step="0.001" value={form.estimativa_kg} placeholder="Opcional"
                  onChange={e => setForm(f => ({ ...f, estimativa_kg: e.target.value }))}
                  style={{ padding: '8px 12px', border: '1px solid #e5e3dc', borderRadius: '8px', fontSize: '14px' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Status</label>
                <select
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value as 'planejamento' | 'em_andamento' | 'encerrada' }))}
                  style={{ padding: '8px 12px', border: '1px solid #e5e3dc', borderRadius: '8px', fontSize: '14px' }}
                >
                  <option value="planejamento">Planejamento</option>
                  <option value="em_andamento">Em andamento</option>
                  <option value="encerrada">Encerrada</option>
                </select>
                {form.status === 'em_andamento' && (
                  <span style={{ fontSize: '12px', color: '#b45309' }}>
                    A safra atual em andamento será encerrada automaticamente.
                  </span>
                )}
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
