'use client'

import { useEffect, useState } from 'react'
import {
  listarRetiradas,
  registrarRetirada,
  confirmarPesoRetirada,
  getEstoqueFisico
} from '@/lib/comercializacao/retiradas.actions'
import { listarProdutos } from '@/lib/comercializacao/produtos.actions'
import { listarVendas } from '@/lib/comercializacao/vendas.actions'
import { listarSafras } from '@/lib/comercializacao/safras.actions'

type Retirada = {
  id: string
  produto_id: string
  data_retirada: string
  destino: string
  quantidade_retirada: number
  quantidade_confirmada: number | null
  numero_nf: string | null
  observacoes: string | null
  produtos: { nome: string; unidade: string } | null
  vendas_externas: {
    lotes: { codigo: string } | null
    compradores: { nome: string } | null
  } | null
}

type EstoqueFisico = {
  produto_id: string
  quantidade: number
  produtos: { nome: string; unidade: string } | null
}

type Produto = { id: string; nome: string; unidade: string }
type Venda = { id: string; lotes: { codigo: string } | null; compradores: { nome: string } | null; status: string }
type Safra = { id: string; ano: number; descricao: string | null; status: string }

const formVazio = {
  produto_id: '',
  data_retirada: new Date().toISOString().split('T')[0],
  destino: '',
  quantidade_retirada: '',
  numero_nf: '',
  venda_externa_id: '',
  safra_id: '',
  observacoes: ''
}

export default function RetiradasPage() {
  const [retiradas, setRetiradas] = useState<Retirada[]>([])
  const [estoque, setEstoque] = useState<EstoqueFisico[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [vendas, setVendas] = useState<Venda[]>([])
  const [safras, setSafras] = useState<Safra[]>([])
  const [form, setForm] = useState(formVazio)
  const [abrirModal, setAbrirModal] = useState(false)
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null)
  const [pesoConfirmado, setPesoConfirmado] = useState('')
  const [status, setStatus] = useState<'idle' | 'salvando' | 'sucesso' | 'erro'>('idle')
  const [erroMsg, setErroMsg] = useState('')

  useEffect(() => { carregar() }, [])

  async function carregar() {
    const [r, e, p, v, s] = await Promise.all([
      listarRetiradas(),
      getEstoqueFisico(),
      listarProdutos(),
      listarVendas(),
      listarSafras()
    ])
    setRetiradas(r as unknown as Retirada[])
    setEstoque(e as unknown as EstoqueFisico[])
    setProdutos(p.filter((x: any) => x.ativo))
    setVendas((v as unknown as Venda[]).filter(x => x.status === 'confirmada' || x.status === 'entregue'))
    setSafras(s as unknown as Safra[])
    if (p.length > 0) setForm(f => ({ ...f, produto_id: p[0].id }))
  }

  async function handleRegistrar() {
    if (!form.produto_id || !form.destino || !form.quantidade_retirada) return
    setStatus('salvando')
    try {
      await registrarRetirada({
        produto_id: form.produto_id,
        data_retirada: form.data_retirada,
        destino: form.destino,
        quantidade_retirada: parseFloat(form.quantidade_retirada),
        numero_nf: form.numero_nf || undefined,
        venda_externa_id: form.venda_externa_id || undefined,
        safra_id: form.safra_id || undefined,
        observacoes: form.observacoes || undefined
      })
      setForm(formVazio)
      setAbrirModal(false)
      await carregar()
      setStatus('sucesso')
      setTimeout(() => setStatus('idle'), 3000)
    } catch (e: any) {
      setErroMsg(e.message)
      setStatus('erro')
    }
  }

  async function handleConfirmarPeso() {
    if (!confirmandoId || !pesoConfirmado) return
    try {
      await confirmarPesoRetirada(confirmandoId, parseFloat(pesoConfirmado))
      setConfirmandoId(null)
      setPesoConfirmado('')
      await carregar()
    } catch (e: any) {
      alert(e.message)
    }
  }

  const estoqueAtual = form.produto_id
    ? estoque.find(e => e.produto_id === form.produto_id)
    : null

  return (
    <div style={{ padding: '32px', background: '#f8f7f4', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 500, margin: 0 }}>Retiradas</h1>
        <button
          onClick={() => setAbrirModal(true)}
          style={{ padding: '8px 20px', background: '#92400e', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}
        >
          + Registrar retirada
        </button>
      </div>

      {status === 'sucesso' && (
        <div style={{ marginBottom: '16px', color: '#166534', fontSize: '13px' }}>Retirada registrada com sucesso.</div>
      )}

      {/* Cards estoque físico atual */}
      {estoque.length > 0 && (
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
          {estoque.map(e => (
            <div key={e.produto_id} style={{
              background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px',
              padding: '16px 20px', minWidth: '160px'
            }}>
              <div style={{ fontSize: '12px', color: '#6b6b6b', marginBottom: '4px' }}>Estoque físico</div>
              <div style={{ fontSize: '20px', fontWeight: 600, color: '#92400e' }}>
                {e.quantidade.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} {e.produtos?.unidade ?? 'kg'}
              </div>
              <div style={{ fontSize: '13px', color: '#6b6b6b', marginTop: '2px' }}>{e.produtos?.nome}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabela retiradas */}
      <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e5e3dc', background: '#fafaf8' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500 }}>Data</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500 }}>Produto</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500 }}>Destino</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 500 }}>Qtd retirada</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 500 }}>Qtd confirmada</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500 }}>NF</th>
              <th style={{ padding: '12px 16px' }}></th>
            </tr>
          </thead>
          <tbody>
            {retiradas.map(r => (
              <tr key={r.id} style={{ borderBottom: '1px solid #f0ede8' }}>
                <td style={{ padding: '12px 16px', color: '#6b6b6b' }}>
                  {new Date(r.data_retirada).toLocaleDateString('pt-BR')}
                </td>
                <td style={{ padding: '12px 16px' }}>{r.produtos?.nome ?? '—'}</td>
                <td style={{ padding: '12px 16px', color: '#6b6b6b' }}>{r.destino}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 500 }}>
                  {r.quantidade_retirada.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} {r.produtos?.unidade ?? 'kg'}
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                  {r.quantidade_confirmada != null ? (
                    <span style={{ color: '#166534', fontWeight: 500 }}>
                      {r.quantidade_confirmada.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} {r.produtos?.unidade ?? 'kg'}
                      {r.quantidade_confirmada !== r.quantidade_retirada && (
                        <span style={{ color: '#991b1b', fontSize: '12px', marginLeft: '6px' }}>
                          (Δ {(r.quantidade_confirmada - r.quantidade_retirada).toFixed(1)})
                        </span>
                      )}
                    </span>
                  ) : (
                    confirmandoId === r.id ? (
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                        <input
                          type="number" step="0.001" placeholder="0,000"
                          value={pesoConfirmado}
                          onChange={e => setPesoConfirmado(e.target.value)}
                          style={{ width: '90px', padding: '4px 8px', border: '1px solid #e5e3dc', borderRadius: '6px', fontSize: '13px' }}
                        />
                        <button onClick={handleConfirmarPeso}
                          style={{ padding: '4px 10px', background: '#166534', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                          OK
                        </button>
                        <button onClick={() => setConfirmandoId(null)}
                          style={{ padding: '4px 8px', background: 'none', border: '1px solid #e5e3dc', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                          ✕
                        </button>
                      </div>
                    ) : (
                      <span style={{ color: '#9a9a9a', fontSize: '13px' }}>Pendente</span>
                    )
                  )}
                </td>
                <td style={{ padding: '12px 16px', color: '#6b6b6b', fontSize: '13px' }}>{r.numero_nf ?? '—'}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                  {r.quantidade_confirmada == null && confirmandoId !== r.id && (
                    <button
                      onClick={() => { setConfirmandoId(r.id); setPesoConfirmado(r.quantidade_retirada.toString()) }}
                      style={{ fontSize: '13px', color: '#92400e', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      Confirmar peso
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {retiradas.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#6b6b6b' }}>
                  Nenhuma retirada registrada ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {abrirModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '24px'
        }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '28px', width: '520px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ fontWeight: 500, fontSize: '16px', marginBottom: '20px' }}>Registrar retirada</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                  <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Produto *</label>
                  <select value={form.produto_id}
                    onChange={e => setForm(f => ({ ...f, produto_id: e.target.value }))}
                    style={{ padding: '8px 12px', border: '1px solid #e5e3dc', borderRadius: '8px', fontSize: '14px' }}>
                    {produtos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                  <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Data *</label>
                  <input type="date" value={form.data_retirada}
                    onChange={e => setForm(f => ({ ...f, data_retirada: e.target.value }))}
                    style={{ padding: '8px 12px', border: '1px solid #e5e3dc', borderRadius: '8px', fontSize: '14px' }} />
                </div>
              </div>

              {estoqueAtual && (
                <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#92400e' }}>
                  Estoque físico disponível: <strong>{estoqueAtual.quantidade.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} {estoqueAtual.produtos?.unidade ?? 'kg'}</strong>
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 2 }}>
                  <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Destino *</label>
                  <input value={form.destino} placeholder="Ex: Moageira Ouricana"
                    onChange={e => setForm(f => ({ ...f, destino: e.target.value }))}
                    style={{ padding: '8px 12px', border: '1px solid #e5e3dc', borderRadius: '8px', fontSize: '14px' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                  <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Quantidade (kg) *</label>
                  <input type="number" step="0.001" value={form.quantidade_retirada}
                    onChange={e => setForm(f => ({ ...f, quantidade_retirada: e.target.value }))}
                    style={{ padding: '8px 12px', border: '1px solid #e5e3dc', borderRadius: '8px', fontSize: '14px' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                  <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Número NF</label>
                  <input value={form.numero_nf} placeholder="Opcional"
                    onChange={e => setForm(f => ({ ...f, numero_nf: e.target.value }))}
                    style={{ padding: '8px 12px', border: '1px solid #e5e3dc', borderRadius: '8px', fontSize: '14px' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                  <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Safra</label>
                  <select value={form.safra_id}
                    onChange={e => setForm(f => ({ ...f, safra_id: e.target.value }))}
                    style={{ padding: '8px 12px', border: '1px solid #e5e3dc', borderRadius: '8px', fontSize: '14px' }}>
                    <option value="">Nenhuma</option>
                    {safras.map(s => (
                      <option key={s.id} value={s.id}>{s.descricao ?? `Safra ${s.ano}`}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Vincular à venda</label>
                <select value={form.venda_externa_id}
                  onChange={e => setForm(f => ({ ...f, venda_externa_id: e.target.value }))}
                  style={{ padding: '8px 12px', border: '1px solid #e5e3dc', borderRadius: '8px', fontSize: '14px' }}>
                  <option value="">Nenhuma</option>
                  {vendas.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.lotes?.codigo ?? '—'} — {v.compradores?.nome ?? '—'}
                    </option>
                  ))}
                </select>
              </div>

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
                onClick={() => { setAbrirModal(false) }}
                style={{ padding: '8px 16px', border: '1px solid #e5e3dc', borderRadius: '8px', background: '#fff', fontSize: '14px', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleRegistrar}
                disabled={status === 'salvando'}
                style={{ padding: '8px 20px', background: '#92400e', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}
              >
                {status === 'salvando' ? 'Salvando...' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
