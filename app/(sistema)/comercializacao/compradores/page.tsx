'use client'

import { useEffect, useState } from 'react'
import { listarCompradores, criarComprador, editarComprador } from '@/lib/comercializacao/compradores.actions'

type Comprador = {
  id: string
  nome: string
  tipo: 'exportador' | 'industria' | 'trader' | 'outro'
  cnpj: string | null
  contato: string | null
  email: string | null
  telefone: string | null
  ativo: boolean
}

const TIPO_LABEL: Record<string, string> = {
  exportador: 'Exportador',
  industria: 'Indústria',
  trader: 'Trader',
  outro: 'Outro'
}

const TIPO_CORES: Record<string, { bg: string; color: string }> = {
  exportador: { bg: '#dbeafe', color: '#1e40af' },
  industria: { bg: '#f3e8ff', color: '#6b21a8' },
  trader: { bg: '#fef3c7', color: '#92400e' },
  outro: { bg: '#f1f0eb', color: '#6b6b6b' }
}

const formVazio = {
  nome: '',
  tipo: 'industria' as 'exportador' | 'industria' | 'trader' | 'outro',
  cnpj: '',
  contato: '',
  email: '',
  telefone: ''
}

export default function CompradoresPage() {
  const [compradores, setCompradores] = useState<Comprador[]>([])
  const [editando, setEditando] = useState<Comprador | null>(null)
  const [form, setForm] = useState(formVazio)
  const [abrirModal, setAbrirModal] = useState(false)
  const [status, setStatus] = useState<'idle' | 'salvando' | 'sucesso' | 'erro'>('idle')
  const [erroMsg, setErroMsg] = useState('')

  useEffect(() => { carregar() }, [])

  async function carregar() {
    const data = await listarCompradores()
    setCompradores((data ?? []) as unknown as Comprador[])
  }

  function abrirNovo() {
    setEditando(null)
    setForm(formVazio)
    setAbrirModal(true)
  }

  function abrirEdicao(c: Comprador) {
    setEditando(c)
    setForm({
      nome: c.nome,
      tipo: c.tipo,
      cnpj: c.cnpj ?? '',
      contato: c.contato ?? '',
      email: c.email ?? '',
      telefone: c.telefone ?? ''
    })
    setAbrirModal(true)
  }

  async function handleSalvar() {
    if (!form.nome) return
    setStatus('salvando')
    try {
      const payload = {
        nome: form.nome,
        tipo: form.tipo,
        cnpj: form.cnpj || undefined,
        contato: form.contato || undefined,
        email: form.email || undefined,
        telefone: form.telefone || undefined
      }
      if (editando) {
        await editarComprador(editando.id, { ...payload, ativo: editando.ativo })
      } else {
        await criarComprador(payload)
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

  return (
    <div style={{ padding: '32px', background: '#f8f7f4', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 500, margin: 0 }}>Compradores</h1>
        <button
          onClick={abrirNovo}
          style={{ padding: '8px 20px', background: '#92400e', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}
        >
          + Novo comprador
        </button>
      </div>

      {status === 'sucesso' && (
        <div style={{ marginBottom: '16px', color: '#166534', fontSize: '13px' }}>Comprador salvo com sucesso.</div>
      )}

      <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e5e3dc', background: '#fafaf8' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500 }}>Nome</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500 }}>Tipo</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500 }}>CNPJ</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500 }}>Contato</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500 }}>Telefone</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500 }}>Status</th>
              <th style={{ padding: '12px 16px' }}></th>
            </tr>
          </thead>
          <tbody>
            {compradores.map(c => (
              <tr key={c.id} style={{ borderBottom: '1px solid #f0ede8' }}>
                <td style={{ padding: '12px 16px', fontWeight: 500 }}>{c.nome}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    fontSize: '12px', padding: '2px 10px', borderRadius: '20px',
                    background: TIPO_CORES[c.tipo].bg,
                    color: TIPO_CORES[c.tipo].color
                  }}>
                    {TIPO_LABEL[c.tipo]}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', color: '#6b6b6b' }}>{c.cnpj ?? '—'}</td>
                <td style={{ padding: '12px 16px', color: '#6b6b6b' }}>{c.contato ?? '—'}</td>
                <td style={{ padding: '12px 16px', color: '#6b6b6b' }}>{c.telefone ?? '—'}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    fontSize: '12px', padding: '2px 10px', borderRadius: '20px',
                    background: c.ativo ? '#dcfce7' : '#f1f0eb',
                    color: c.ativo ? '#166534' : '#6b6b6b'
                  }}>
                    {c.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                  <button
                    onClick={() => abrirEdicao(c)}
                    style={{ fontSize: '13px', color: '#92400e', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))}
            {compradores.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#6b6b6b' }}>
                  Nenhum comprador cadastrado ainda.
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
              {editando ? 'Editar comprador' : 'Novo comprador'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 2 }}>
                  <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Nome *</label>
                  <input value={form.nome}
                    onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                    style={{ padding: '8px 12px', border: '1px solid #e5e3dc', borderRadius: '8px', fontSize: '14px' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                  <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Tipo *</label>
                  <select value={form.tipo}
                    onChange={e => setForm(f => ({ ...f, tipo: e.target.value as 'exportador' | 'industria' | 'trader' | 'outro' }))}
                    style={{ padding: '8px 12px', border: '1px solid #e5e3dc', borderRadius: '8px', fontSize: '14px' }}>
                    <option value="exportador">Exportador</option>
                    <option value="industria">Indústria</option>
                    <option value="trader">Trader</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: '#6b6b6b' }}>CNPJ</label>
                <input value={form.cnpj} placeholder="00.000.000/0001-00"
                  onChange={e => setForm(f => ({ ...f, cnpj: e.target.value }))}
                  style={{ padding: '8px 12px', border: '1px solid #e5e3dc', borderRadius: '8px', fontSize: '14px' }} />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                  <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Contato (nome)</label>
                  <input value={form.contato}
                    onChange={e => setForm(f => ({ ...f, contato: e.target.value }))}
                    style={{ padding: '8px 12px', border: '1px solid #e5e3dc', borderRadius: '8px', fontSize: '14px' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                  <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Telefone</label>
                  <input value={form.telefone}
                    onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
                    style={{ padding: '8px 12px', border: '1px solid #e5e3dc', borderRadius: '8px', fontSize: '14px' }} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: '#6b6b6b' }}>E-mail</label>
                <input value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  style={{ padding: '8px 12px', border: '1px solid #e5e3dc', borderRadius: '8px', fontSize: '14px' }} />
              </div>

              {editando && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                  <input type="checkbox" checked={editando.ativo}
                    onChange={e => setEditando(c => c && ({ ...c, ativo: e.target.checked }))} />
                  Ativo
                </label>
              )}

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
