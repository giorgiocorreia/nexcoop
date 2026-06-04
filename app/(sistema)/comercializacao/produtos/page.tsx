'use client'

import { useEffect, useState } from 'react'
import { listarProdutos, criarProduto, editarProduto } from '@/lib/comercializacao/produtos.actions'

type Produto = {
  id: string
  nome: string
  categoria: string | null
  unidade: string
  ativo: boolean
}

export default function ProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [form, setForm] = useState({ nome: '', categoria: '', unidade: 'kg' })
  const [editando, setEditando] = useState<Produto | null>(null)
  const [status, setStatus] = useState<'idle' | 'salvando' | 'sucesso' | 'erro'>('idle')
  const [erroMsg, setErroMsg] = useState('')

  useEffect(() => { carregar() }, [])

  async function carregar() {
    const data = await listarProdutos()
    setProdutos(data)
  }

  async function handleCriar() {
    if (!form.nome) return
    setStatus('salvando')
    try {
      await criarProduto(form)
      setForm({ nome: '', categoria: '', unidade: 'kg' })
      await carregar()
      setStatus('sucesso')
      setTimeout(() => setStatus('idle'), 3000)
    } catch (e: any) {
      setErroMsg(e.message)
      setStatus('erro')
    }
  }

  async function handleEditar() {
    if (!editando) return
    setStatus('salvando')
    try {
      await editarProduto(editando.id, {
        nome: editando.nome,
        categoria: editando.categoria ?? '',
        unidade: editando.unidade,
        ativo: editando.ativo
      })
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
      <h1 style={{ fontSize: '22px', fontWeight: 500, marginBottom: '24px' }}>Produtos</h1>

      {/* Formulário novo produto */}
      <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
        <div style={{ fontWeight: 500, marginBottom: '16px', fontSize: '14px' }}>Novo produto</div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <input
            placeholder="Nome do produto"
            value={form.nome}
            onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
            style={{ flex: 2, minWidth: '160px', padding: '8px 12px', border: '1px solid #e5e3dc', borderRadius: '8px', fontSize: '14px' }}
          />
          <input
            placeholder="Categoria"
            value={form.categoria}
            onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
            style={{ flex: 1, minWidth: '120px', padding: '8px 12px', border: '1px solid #e5e3dc', borderRadius: '8px', fontSize: '14px' }}
          />
          <select
            value={form.unidade}
            onChange={e => setForm(f => ({ ...f, unidade: e.target.value }))}
            style={{ padding: '8px 12px', border: '1px solid #e5e3dc', borderRadius: '8px', fontSize: '14px' }}
          >
            <option value="kg">kg</option>
            <option value="unidade">unidade</option>
            <option value="litro">litro</option>
            <option value="caixa">caixa</option>
          </select>
          <button
            onClick={handleCriar}
            disabled={status === 'salvando'}
            style={{ padding: '8px 20px', background: '#92400e', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}
          >
            {status === 'salvando' ? 'Salvando...' : 'Adicionar'}
          </button>
        </div>
        {status === 'sucesso' && (
          <div style={{ marginTop: '12px', color: '#166534', fontSize: '13px' }}>Produto salvo com sucesso.</div>
        )}
        {status === 'erro' && (
          <div style={{ marginTop: '12px', color: '#991b1b', fontSize: '13px' }}>{erroMsg}</div>
        )}
      </div>

      {/* Tabela */}
      <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e5e3dc', background: '#fafaf8' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500 }}>Nome</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500 }}>Categoria</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500 }}>Unidade</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500 }}>Status</th>
              <th style={{ padding: '12px 16px' }}></th>
            </tr>
          </thead>
          <tbody>
            {produtos.map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid #f0ede8' }}>
                <td style={{ padding: '12px 16px' }}>{p.nome}</td>
                <td style={{ padding: '12px 16px', color: '#6b6b6b' }}>{p.categoria || '—'}</td>
                <td style={{ padding: '12px 16px', color: '#6b6b6b' }}>{p.unidade}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    fontSize: '12px', padding: '2px 10px', borderRadius: '20px',
                    background: p.ativo ? '#dcfce7' : '#f1f0eb',
                    color: p.ativo ? '#166534' : '#6b6b6b'
                  }}>
                    {p.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                  <button
                    onClick={() => setEditando(p)}
                    style={{ fontSize: '13px', color: '#92400e', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))}
            {produtos.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#6b6b6b' }}>
                  Nenhum produto cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal edição */}
      {editando && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50
        }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '28px', width: '400px', maxWidth: '90vw' }}>
            <div style={{ fontWeight: 500, marginBottom: '20px', fontSize: '16px' }}>Editar produto</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                value={editando.nome}
                onChange={e => setEditando(p => p && ({ ...p, nome: e.target.value }))}
                style={{ padding: '8px 12px', border: '1px solid #e5e3dc', borderRadius: '8px', fontSize: '14px' }}
              />
              <input
                value={editando.categoria ?? ''}
                onChange={e => setEditando(p => p && ({ ...p, categoria: e.target.value }))}
                placeholder="Categoria"
                style={{ padding: '8px 12px', border: '1px solid #e5e3dc', borderRadius: '8px', fontSize: '14px' }}
              />
              <select
                value={editando.unidade}
                onChange={e => setEditando(p => p && ({ ...p, unidade: e.target.value }))}
                style={{ padding: '8px 12px', border: '1px solid #e5e3dc', borderRadius: '8px', fontSize: '14px' }}
              >
                <option value="kg">kg</option>
                <option value="unidade">unidade</option>
                <option value="litro">litro</option>
                <option value="caixa">caixa</option>
              </select>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                <input
                  type="checkbox"
                  checked={editando.ativo}
                  onChange={e => setEditando(p => p && ({ ...p, ativo: e.target.checked }))}
                />
                Ativo
              </label>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setEditando(null)}
                style={{ padding: '8px 16px', border: '1px solid #e5e3dc', borderRadius: '8px', background: '#fff', fontSize: '14px', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleEditar}
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
