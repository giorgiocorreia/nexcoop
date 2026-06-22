'use client'

import { useRouter } from 'next/navigation'
import { iniciarLote } from './actions'
import { fmt } from '@/lib/fmt'

const STATUS_LABEL: Record<string, string> = {
  rascunho: 'Rascunho',
  aberto: 'Aberto',
  em_venda: 'Em venda',
  entregue: 'Entregue',
}

const STATUS_COLOR: Record<string, string> = {
  rascunho: '#888780',
  aberto: '#1D9E75',
  em_venda: '#E07B30',
  entregue: '#555',
}

export default function LotesLista({ lotes }: { lotes: any[] }) {
  const router = useRouter()

  async function handleIniciarLote() {
    try {
      const lote = await iniciarLote('Cacau amêndoa seca')
      router.push(`/comercializacao/lotes/${lote.id}`)
    } catch (e: any) {
      alert(e.message)
    }
  }

  return (
    <div style={{ padding: '2rem', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0 }}>Lotes de comercialização</h1>
          <p style={{ fontSize: 13, color: '#888', margin: '4px 0 0' }}>Formação e gestão de lotes para venda</p>
        </div>
        <button
          onClick={handleIniciarLote}
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
                background: '#fff',
                border: '1px solid #e5e3dc',
                borderRadius: 12,
                padding: '1rem 1.25rem',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
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
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '3px 10px',
                  borderRadius: 20,
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
