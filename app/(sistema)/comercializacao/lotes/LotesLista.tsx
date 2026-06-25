'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { iniciarLote, listarSafras } from './actions'
import { fmt } from '@/lib/fmt'

const C = {
  cor:    '#92400e',
  corLt:  '#FDF8F4',
  borda:  '#E5E3DC',
  bg:     '#F8F7F4',
  txt:    '#1C1917',
  sub:    '#78716C',
}

const STATUS: Record<string, { label: string; bg: string; cor: string; icon: string }> = {
  rascunho: { label: 'Rascunho', bg: '#F3F4F6', cor: '#6B7280',   icon: 'ti-pencil'        },
  aberto:   { label: 'Aberto',   bg: '#F0FDF4', cor: '#16A34A',   icon: 'ti-lock-open'     },
  em_venda: { label: 'Em venda', bg: '#FFF7ED', cor: '#C2410C',   icon: 'ti-arrow-up-right' },
  entregue: { label: 'Entregue', bg: '#EFF6FF', cor: '#185FA5',   icon: 'ti-circle-check'  },
}

interface Safra { id: string; ano: number; descricao: string | null }

export default function LotesLista({ lotes }: { lotes: any[] }) {
  const router = useRouter()

  const [modalAberto, setModalAberto]   = useState(false)
  const [safras, setSafras]             = useState<Safra[]>([])
  const [safraId, setSafraId]           = useState('')
  const [descricao, setDescricao]       = useState('')
  const [carregando, setCarregando]     = useState(false)
  const [erro, setErro]                 = useState('')

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
    if (!safraId)            { setErro('Selecione uma safra.'); return }
    if (!descricao.trim())   { setErro('Informe a descrição do produto.'); return }
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

  const totais = {
    total:    lotes.length,
    abertos:  lotes.filter(l => l.status === 'aberto').length,
    emVenda:  lotes.filter(l => l.status === 'em_venda').length,
    kgTotal:  lotes.reduce((acc, l) => acc + (l.peso_total_kg ?? 0), 0),
  }

  return (
    <div style={{ background: C.bg, minHeight: '100vh' }}>

      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: '#fff', borderBottom: `1px solid ${C.borda}`,
      }}>
        <div style={{
          padding: '0 32px', minHeight: 88,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: C.corLt, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <i className="ti ti-stack-2" style={{ fontSize: 22, color: C.cor }} />
            </div>
            <div>
              <h1 style={{ fontSize: 19, fontWeight: 800, color: C.txt, margin: 0 }}>Lotes</h1>
              <div style={{ fontSize: 12, color: C.sub }}>Comercialização · formação e gestão de lotes</div>
            </div>
          </div>
          <button
            onClick={abrirModal}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 18px', fontSize: 13, fontWeight: 700,
              borderRadius: 10, border: 'none', background: C.cor, color: '#fff',
              cursor: 'pointer',
            }}
          >
            <i className="ti ti-plus" style={{ fontSize: 15 }} />
            Iniciar lote
          </button>
        </div>
      </div>

      <div style={{ padding: '28px 32px' }}>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
          {[
            { label: 'Total de lotes',  valor: String(totais.total),              icon: 'ti-stack-2',        cor: C.cor,     bg: C.corLt  },
            { label: 'Abertos',         valor: String(totais.abertos),             icon: 'ti-lock-open',      cor: '#16A34A', bg: '#F0FDF4' },
            { label: 'Em venda',        valor: String(totais.emVenda),             icon: 'ti-arrow-up-right', cor: '#C2410C', bg: '#FFF7ED' },
            { label: 'Kg acumulado',    valor: fmt.peso(totais.kgTotal),           icon: 'ti-weight',         cor: '#185FA5', bg: '#EFF6FF' },
          ].map(k => (
            <div key={k.label} style={{ background: '#fff', borderRadius: 14, border: `1px solid ${C.borda}`, padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.sub, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k.label}</span>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: k.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className={`ti ${k.icon}`} style={{ fontSize: 14, color: k.cor }} />
                </div>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: C.txt }}>{k.valor}</div>
            </div>
          ))}
        </div>

        {/* Lista */}
        {lotes.length === 0 ? (
          <div style={{
            background: '#fff', borderRadius: 16, border: `1px solid ${C.borda}`,
            padding: '4rem', textAlign: 'center',
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.txt, marginBottom: 6 }}>Nenhum lote criado</div>
            <div style={{ fontSize: 13, color: C.sub, marginBottom: 20 }}>Inicie um lote para começar a comercialização</div>
            <button
              onClick={abrirModal}
              style={{ padding: '9px 20px', fontSize: 13, fontWeight: 700, borderRadius: 10, border: 'none', background: C.cor, color: '#fff', cursor: 'pointer' }}
            >
              + Iniciar lote
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {lotes.map(lote => {
              const st = STATUS[lote.status] ?? STATUS.rascunho
              const vendas = (lote.vendas_externas as any[]) ?? []
              const nfeAutorizada = vendas.find((v: any) => v.status_nfe === 'autorizada')

              return (
                <div
                  key={lote.id}
                  onClick={() => router.push(`/comercializacao/lotes/${lote.id}`)}
                  style={{
                    background: '#fff', border: `1px solid ${C.borda}`, borderRadius: 14,
                    padding: '16px 20px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
                    transition: 'box-shadow 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.07)')}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
                >
                  {/* Esquerda */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10,
                      background: st.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <i className={`ti ${st.icon}`} style={{ fontSize: 18, color: st.cor }} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.txt }}>Lote {lote.codigo}</div>
                      <div style={{ fontSize: 12, color: C.sub, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {lote.produto_descricao ?? '—'}
                        {lote.safras ? ` · Safra ${lote.safras.ano}` : ''}
                      </div>
                    </div>
                  </div>

                  {/* Centro */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.txt }}>{fmt.peso(lote.peso_total_kg)}</div>
                      <div style={{ fontSize: 11, color: C.sub }}>peso total</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 13, color: C.sub }}>{fmt.data(lote.created_at)}</div>
                      <div style={{ fontSize: 11, color: C.sub }}>criado em</div>
                    </div>
                  </div>

                  {/* Direita — badges */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8,
                      background: st.bg, color: st.cor,
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                    }}>
                      <i className={`ti ${st.icon}`} style={{ fontSize: 11 }} />
                      {st.label}
                    </span>
                    {nfeAutorizada && (
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8,
                        background: '#F0FDF4', color: '#16A34A',
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                      }}>
                        <i className="ti ti-file-check" style={{ fontSize: 11 }} />
                        NF-e {nfeAutorizada.numero_nfe}
                      </span>
                    )}
                    <i className="ti ti-chevron-right" style={{ fontSize: 16, color: C.sub }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal Iniciar Lote */}
      {modalAberto && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            background: '#fff', borderRadius: 16, padding: '28px 32px',
            width: 440, maxWidth: '90vw', boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800, color: C.txt }}>Iniciar novo lote</div>
                <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>Preencha os dados para criar o lote</div>
              </div>
              <button
                onClick={() => setModalAberto(false)}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.sub, lineHeight: 1 }}
              >✕</button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: C.txt, display: 'block', marginBottom: 6 }}>
                Safra <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <select
                value={safraId}
                onChange={e => setSafraId(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${C.borda}`, borderRadius: 8, fontSize: 13, background: '#fff', color: C.txt, outline: 'none', boxSizing: 'border-box' }}
              >
                <option value="">Selecione a safra...</option>
                {safras.map(s => (
                  <option key={s.id} value={s.id}>{s.ano}{s.descricao ? ` — ${s.descricao}` : ''}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: C.txt, display: 'block', marginBottom: 6 }}>
                Descrição do produto <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input
                type="text"
                value={descricao}
                onChange={e => setDescricao(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleConfirmar()}
                placeholder="Ex: Cacau amêndoa seca, Melancia, Milho..."
                style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${C.borda}`, borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            {erro && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#DC2626', marginBottom: 16 }}>
                {erro}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setModalAberto(false)}
                disabled={carregando}
                style={{ flex: 1, padding: '10px 0', fontSize: 13, fontWeight: 600, borderRadius: 9, border: `1px solid ${C.borda}`, background: '#fff', color: C.txt, cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmar}
                disabled={carregando || !safraId || !descricao.trim()}
                style={{
                  flex: 1, padding: '10px 0', fontSize: 13, fontWeight: 700, borderRadius: 9,
                  border: 'none', background: C.cor, color: '#fff',
                  cursor: carregando || !safraId || !descricao.trim() ? 'not-allowed' : 'pointer',
                  opacity: carregando || !safraId || !descricao.trim() ? 0.6 : 1,
                }}
              >
                {carregando ? 'Criando...' : 'Iniciar lote'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
