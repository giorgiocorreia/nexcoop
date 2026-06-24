'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { iniciarLote, listarSafras } from './actions'
import { fmt } from '@/lib/fmt'

const STATUS_LABEL: Record<string, string> = {
  rascunho: 'Rascunho',
  aberto:   'Aberto',
  em_venda: 'Em venda',
  entregue: 'Entregue',
}

const STATUS_COLOR: Record<string, string> = {
  rascunho: '#888780',
  aberto:   '#1D9E75',
  em_venda: '#E07B30',
  entregue: '#555',
}

const inp: React.CSSProperties = {
  width: '100%', padding: '8px 12px',
  border: '1.5px solid #d1d5db', borderRadius: 8,
  fontSize: 13, outline: 'none', boxSizing: 'border-box',
  background: '#fff',
}

interface Safra { id: string; ano: number; descricao: string | null }

export default function LotesLista({ lotes }: { lotes: any[] }) {
  const router = useRouter()

  const [modalAberto, setModalAberto] = useState(false)
  const [safras, setSafras] = useState<Safra[]>([])
  const [safraId, setSafraId] = useState('')
  const [descricao, setDescricao] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  async function abrirModal() {
    setErro('')
    setSafraId('')
    setDescricao('')
    setModalAberto(true)
    const lista = await listarSafras()
    setSafras(lista)
    if (lista.length === 1) setSafraId(lista[0].id)
  }

  async function handleConfirmar() {
    if (!safraId) { setErro('Selecione uma safra.'); return }
    if (!descricao.trim()) { setErro('Informe a descrição do produto.'); return }
    setCarregando(true)
    setErro('')
    try {
      const lote = await iniciarLote(descricao.trim(), safraId)
      router.push(`/comercializacao/lotes/${lote.id}`)
    } catch (e: any) {
      setErro(e.message)
      setCarregando(false)
    }
  }

  return (
    <div style={{ padding: '2rem', maxWidth: 900, margin: '0 auto' }}>

      {modalAberto && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 28, width: 420, maxWidth: '90vw' }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: '#1a1a2e' }}>
              Iniciar novo lote
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>
                Safra <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <select value={safraId} onChange={e => setSafraId(e.target.value)} style={inp}>
                <option value="">Selecione a safra...</option>
                {safras.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.ano}{s.descricao ? ` — ${s.descricao}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>
                Descrição do produto <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                value={descricao}
                onChange={e => setDescricao(e.target.value)}
                placeholder="Ex: Cacau amêndoa seca, Melancia, Milho..."
                style={inp}
              />
            </div>

            {erro && (
              <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#dc2626', marginBottom: 14 }}>
                {erro}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setModalAberto(false)}
                disabled={carregando}
                style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', color: '#374151', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmar}
                disabled={carregando || !safraId}
                style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, borderRadius: 8, border: 'none', background: '#92400e', color: '#fff', cursor: carregando || !safraId ? 'not-allowed' : 'pointer', opacity: carregando || !safraId ? 0.7 : 1 }}
              >
                {carregando ? 'Criando...' : 'Iniciar lote'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0 }}>Lotes de comercialização</h1>
          <p style={{ fontSize: 13, color: '#888', margin: '4px 0 0' }}>Formação e gestão de lotes para venda</p>
        </div>
        <button
          onClick={abrirModal}
          style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, borderRadius: 8, border: 'none', background: '#92400e', color: '#fff', cursor: 'pointer' }}
        >
          + Iniciar lote
        </button>
      </div>

      {lotes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#888', fontSize: 14 }}>
          Nenhum lote criado. Clique em "Iniciar lote" para começar.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {lotes.map(lote => (
            <div
              key={lote.id}
              onClick={() => router.push(`/comercializacao/lotes/${lote.id}`)}
              style={{
                background: '#fff', border: '1px solid #e5e3dc', borderRadius: 12,
                padding: '1rem 1.25rem', cursor: 'pointer',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: 15, fontWeight: 500 }}>Lote {lote.codigo}</div>
                <div style={{ fontSize: 13, color: '#666', marginTop: 2 }}>
                  {lote.produto_descricao ?? lote.produtos?.nome ?? '—'} · {fmt.peso(lote.peso_total_kg)}
                </div>
                {lote.safras && (
                  <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>Safra {lote.safras.ano}</div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 12, color: '#888' }}>{fmt.data(lote.created_at)}</div>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                  background: (STATUS_COLOR[lote.status] ?? '#888') + '20',
                  color: STATUS_COLOR[lote.status] ?? '#888',
                }}>
                  {STATUS_LABEL[lote.status] ?? lote.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
