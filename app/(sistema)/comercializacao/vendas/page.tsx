'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { listarVendas, criarVenda, atualizarStatusVenda, editarVenda } from '@/lib/comercializacao/vendas.actions'
import { fmtReal } from '@/lib/comercializacao/fmt'
import { listarSafras } from '@/lib/comercializacao/safras.actions'
import { listarLotes } from '@/lib/comercializacao/lotes.actions'
import { listarCompradores } from '@/lib/comercializacao/compradores.actions'

const C = {
  cor: '#92400e', corLt: '#FDF8F4',
  borda: '#E5E3DC', bg: '#F8F7F4',
  txt: '#1C1917', sub: '#78716C',
}

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

const STATUS_CORES: Record<string, { bg: string; color: string }> = {
  rascunho:  { bg: '#F1F0EB', color: '#78716C' },
  confirmada: { bg: '#DBEAFE', color: '#1E40AF' },
  entregue:  { bg: '#FEF3C7', color: '#92400E' },
  paga:      { bg: '#DCFCE7', color: '#166534' }
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

  async function handleSalvar() {
    if (!form.safra_id || !form.lote_id || !form.comprador_id || !form.quantidade_kg || !form.preco_kg) return
    setStatus('salvando')
    try {
      const payload = { safra_id: form.safra_id, lote_id: form.lote_id, comprador_id: form.comprador_id, data_venda: form.data_venda, quantidade_kg: parseFloat(form.quantidade_kg), preco_kg: parseFloat(form.preco_kg), taxa_comercializacao_pct: parseFloat(form.taxa_comercializacao_pct), custos_logistica: parseFloat(form.custos_logistica || '0'), observacoes: form.observacoes || undefined }
      if (editando) { await editarVenda(editando.id, payload) } else { await criarVenda(payload) }
      setAbrirModal(false); setEditando(null)
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

  const inp: React.CSSProperties = { padding: '8px 12px', border: `1px solid ${C.borda}`, borderRadius: 8, fontSize: 14 }

  return (
    <>
      <style>{`
        .vend-header  { padding: 0 32px; min-height: 88px; display: flex; align-items: center; }
        .vend-content { padding: 28px 32px; }
        @media (max-width: 640px) {
          .vend-header  { padding: 0 16px 0 56px; min-height: 60px; }
          .vend-content { padding: 16px; }
        }
      `}</style>

      <header className="vend-header" style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: '#fff', borderBottom: `1px solid ${C.borda}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, margin: '0 -2rem 0 -2rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: C.corLt, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <i className="ti ti-arrows-exchange" style={{ fontSize: 20, color: C.cor }} />
          </div>
          <div>
            <h1 style={{ fontSize: 19, fontWeight: 800, color: C.txt, margin: 0, lineHeight: 1.2 }}>Vendas Externas</h1>
            <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>
              <Link href="/comercializacao" style={{ color: C.sub, textDecoration: 'none' }}>Comercialização</Link>
              {' / '}Vendas Externas
            </div>
          </div>
        </div>
        <button onClick={abrirNovo}
          style={{ padding: '9px 18px', background: C.cor, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          + Nova venda
        </button>
      </header>

      <div className="vend-content" style={{ background: C.bg, margin: '0 -2rem -2rem -2rem', minHeight: 'calc(100vh - 88px)' }}>

        {status === 'sucesso' && (
          <div style={{ marginBottom: 16, color: '#166534', fontSize: 13 }}>Venda salva com sucesso.</div>
        )}

        {/* Filtro status */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {['todos', 'rascunho', 'confirmada', 'entregue', 'paga'].map(s => (
            <button key={s} onClick={() => setFiltroStatus(s)} style={{
              padding: '6px 16px', border: `1px solid ${C.borda}`, borderRadius: 99, fontSize: 13, cursor: 'pointer',
              background: filtroStatus === s ? C.cor : '#fff',
              color:      filtroStatus === s ? '#fff' : C.sub,
            }}>
              {s === 'todos' ? 'Todas' : STATUS_LABEL[s]}
            </button>
          ))}
        </div>

        <div style={{ background: '#fff', border: `1px solid ${C.borda}`, borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.borda}`, background: '#FAFAF8' }}>
                {['Data', 'Lote', 'Comprador', 'Qtd (kg)', 'Preço/kg', 'Valor líquido', 'Status', ''].map((h, i) => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: i >= 3 && i <= 5 ? 'right' : i === 7 ? 'right' : 'left', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.sub }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vendasFiltradas.map(v => (
                <tr key={v.id} style={{ borderBottom: `1px solid #F0EDE8` }}>
                  <td style={{ padding: '12px 16px', color: C.sub }}>{new Date(v.data_venda).toLocaleDateString('pt-BR')}</td>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 13 }}>{v.lotes?.codigo ?? '—'}</td>
                  <td style={{ padding: '12px 16px', color: C.txt }}>{v.compradores?.nome ?? '—'}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: C.sub }}>{v.quantidade_kg.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: C.sub }}>{fmtReal(v.preco_kg)}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#166534' }}>
                    {v.valor_liquido != null ? fmtReal(v.valor_liquido) : '—'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: 12, padding: '2px 10px', borderRadius: 99, background: STATUS_CORES[v.status].bg, color: STATUS_CORES[v.status].color }}>
                      {STATUS_LABEL[v.status]}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      {v.status !== 'paga' && (
                        <button onClick={() => handleAvancarStatus(v)} style={{ fontSize: 12, color: '#1E40AF', background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 600 }}>
                          {PROXIMO_STATUS[v.status]}
                        </button>
                      )}
                      {v.status === 'rascunho' && (
                        <button onClick={() => abrirEdicao(v)} style={{ fontSize: 12, color: C.cor, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                          Editar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {vendasFiltradas.length === 0 && (
                <tr><td colSpan={8} style={{ padding: 24, textAlign: 'center', color: C.sub }}>Nenhuma venda encontrada.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {abrirModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 24 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 560, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: C.txt, marginBottom: 20 }}>
              {editando ? 'Editar venda' : 'Nova venda'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                  <label style={{ fontSize: 12, color: C.sub }}>Safra *</label>
                  <select value={form.safra_id} onChange={e => setForm(f => ({ ...f, safra_id: e.target.value, lote_id: '' }))} style={inp}>
                    {safras.map(s => <option key={s.id} value={s.id}>{s.descricao ?? `Safra ${s.ano}`}{s.status === 'em_andamento' ? ' ★' : ''}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                  <label style={{ fontSize: 12, color: C.sub }}>Lote *</label>
                  <select value={form.lote_id} onChange={e => setForm(f => ({ ...f, lote_id: e.target.value }))} style={inp}>
                    <option value="">Selecionar...</option>
                    {lotesFiltrados.map(l => <option key={l.id} value={l.id}>{l.codigo}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 2 }}>
                  <label style={{ fontSize: 12, color: C.sub }}>Comprador *</label>
                  <select value={form.comprador_id} onChange={e => setForm(f => ({ ...f, comprador_id: e.target.value }))} style={inp}>
                    <option value="">Selecionar...</option>
                    {compradores.filter(c => c.ativo).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                  <label style={{ fontSize: 12, color: C.sub }}>Data da venda *</label>
                  <input type="date" value={form.data_venda} onChange={e => setForm(f => ({ ...f, data_venda: e.target.value }))} style={inp} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                  <label style={{ fontSize: 12, color: C.sub }}>Quantidade (kg) *</label>
                  <input type="number" step="0.001" value={form.quantidade_kg} onChange={e => setForm(f => ({ ...f, quantidade_kg: e.target.value }))} style={inp} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                  <label style={{ fontSize: 12, color: C.sub }}>Preço/kg (R$) *</label>
                  <input type="number" step="0.01" value={form.preco_kg} onChange={e => setForm(f => ({ ...f, preco_kg: e.target.value }))} style={inp} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                  <label style={{ fontSize: 12, color: C.sub }}>Taxa cooperativa (%)</label>
                  <input type="number" step="0.01" value={form.taxa_comercializacao_pct} onChange={e => setForm(f => ({ ...f, taxa_comercializacao_pct: e.target.value }))} style={inp} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                  <label style={{ fontSize: 12, color: C.sub }}>Custos logística (R$)</label>
                  <input type="number" step="0.01" value={form.custos_logistica} onChange={e => setForm(f => ({ ...f, custos_logistica: e.target.value }))} style={inp} />
                </div>
              </div>

              {qtd > 0 && preco > 0 && (
                <div style={{ background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 8, padding: '12px 16px', fontSize: 13 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: C.sub }}>Valor bruto</span><span>{fmtReal(valorBruto)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: C.sub }}>Taxa ({taxa}%)</span><span>− {fmtReal(valorTaxa)}</span>
                  </div>
                  {custos > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ color: C.sub }}>Logística</span><span>− {fmtReal(custos)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #FDE68A', paddingTop: 8, fontWeight: 700, color: C.cor }}>
                    <span>Valor líquido</span><span>{fmtReal(valorLiquido)}</span>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 12, color: C.sub }}>Observações</label>
                <input value={form.observacoes} placeholder="Opcional" onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} style={inp} />
              </div>
            </div>

            {status === 'erro' && <div style={{ marginTop: 12, color: '#991B1B', fontSize: 13 }}>{erroMsg}</div>}

            <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
              <button onClick={() => { setAbrirModal(false); setEditando(null) }} style={{ padding: '8px 16px', border: `1px solid ${C.borda}`, borderRadius: 8, background: '#fff', fontSize: 14, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={handleSalvar} disabled={status === 'salvando'} style={{ padding: '8px 20px', background: C.cor, color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>
                {status === 'salvando' ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
