'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { listarCotacoes, registrarCotacao } from '@/lib/comercializacao/cotacoes.actions'
import { listarProdutos } from '@/lib/comercializacao/produtos.actions'
import { fmtReal } from '@/lib/comercializacao/fmt'

const C = {
  cor: '#92400e', corLt: '#FDF8F4',
  borda: '#E5E3DC', bg: '#F8F7F4',
  txt: '#1C1917', sub: '#78716C',
}

type Produto = { id: string; nome: string; unidade: string }
type Cotacao = {
  id: string
  vigente_a_partir_de: string
  produto_id: string
  preco_externo: number
  preco_cooperado: number
  observacoes: string | null
  produtos: { nome: string; unidade: string }
}

function mascaraPreco(valor: string): string {
  const digits = valor.replace(/\D/g, '')
  if (!digits) return ''
  const num = parseInt(digits, 10) / 100
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function parsePreco(valor: string): number {
  return parseFloat(valor.replace(/\./g, '').replace(',', '.')) || 0
}

export default function CotacoesClient({ podeRegistrar }: { podeRegistrar: boolean }) {
  const agora = new Date().toISOString().slice(0, 16)
  const [cotacoes, setCotacoes] = useState<Cotacao[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [form, setForm] = useState({ produto_id: '', vigente_a_partir_de: agora, preco_externo: '', preco_cooperado: '', observacoes: '' })
  const [status, setStatus] = useState<'idle' | 'salvando' | 'sucesso' | 'erro'>('idle')
  const [erroMsg, setErroMsg] = useState('')

  useEffect(() => { carregar() }, [])

  async function carregar() {
    const [c, p] = await Promise.all([listarCotacoes(), listarProdutos()])
    setCotacoes(c)
    setProdutos(p.filter((p: any) => p.ativo))
    if (p.length > 0 && !form.produto_id) setForm(f => ({ ...f, produto_id: p[0].id }))
  }

  const precoExt  = parsePreco(form.preco_externo)
  const precoCoop = parsePreco(form.preco_cooperado)
  const avisoPreco = form.preco_externo && form.preco_cooperado && precoCoop < precoExt

  async function handleSalvar() {
    if (!form.produto_id || !form.preco_externo || !form.preco_cooperado) return
    setStatus('salvando')
    try {
      await registrarCotacao({ produto_id: form.produto_id, vigente_a_partir_de: new Date(form.vigente_a_partir_de).toISOString(), preco_externo: precoExt, preco_cooperado: precoCoop, observacoes: form.observacoes })
      setForm(f => ({ ...f, preco_externo: '', preco_cooperado: '', observacoes: '' }))
      await carregar()
      setStatus('sucesso')
      setTimeout(() => setStatus('idle'), 3000)
    } catch (e: any) { setErroMsg(e.message); setStatus('erro') }
  }

  const ultimasPorProduto = produtos.map(p => ({ produto: p, cotacao: cotacoes.find(c => c.produto_id === p.id) ?? null }))

  const inp: React.CSSProperties = { padding: '8px 12px', border: `1px solid ${C.borda}`, borderRadius: 8, fontSize: 13, background: '#fff' }

  return (
    <>
      <style>{`
        .cot-header  { padding: 0 32px; min-height: 88px; display: flex; align-items: center; }
        .cot-content { padding: 28px 32px; }
        @media (max-width: 640px) {
          .cot-header  { padding: 0 16px 0 56px; min-height: 60px; }
          .cot-content { padding: 16px; }
        }
      `}</style>

      <header className="cot-header" style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: '#fff', borderBottom: `1px solid ${C.borda}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, margin: '0 -2rem 0 -2rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: C.corLt, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <i className="ti ti-chart-line" style={{ fontSize: 20, color: C.cor }} />
          </div>
          <div>
            <h1 style={{ fontSize: 19, fontWeight: 800, color: C.txt, margin: 0, lineHeight: 1.2 }}>Cotações</h1>
            <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>
              <Link href="/comercializacao" style={{ color: C.sub, textDecoration: 'none' }}>Comercialização</Link>
              {' / '}Cotações
            </div>
          </div>
        </div>
      </header>

      <div className="cot-content" style={{ background: C.bg, margin: '0 -2rem -2rem -2rem', minHeight: 'calc(100vh - 88px)' }}>

        {/* Cards última cotação por produto */}
        {ultimasPorProduto.length > 0 && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
            {ultimasPorProduto.map(({ produto, cotacao }) => (
              <div key={produto.id} style={{ background: '#fff', border: `1px solid ${C.borda}`, borderRadius: 12, padding: '16px 20px', minWidth: 200 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.sub, marginBottom: 8 }}>{produto.nome}</div>
                {cotacao ? (
                  <>
                    <div style={{ fontSize: 11, color: C.sub, marginBottom: 6 }}>{new Date(cotacao.vigente_a_partir_de).toLocaleString('pt-BR')}</div>
                    <div style={{ fontSize: 13, color: C.sub }}>Externo: <strong style={{ color: C.txt }}>{fmtReal(cotacao.preco_externo)}/{produto.unidade}</strong></div>
                    <div style={{ fontSize: 13, color: C.cor, marginTop: 2 }}>Cooperado: <strong>{fmtReal(cotacao.preco_cooperado)}/{produto.unidade}</strong></div>
                  </>
                ) : (
                  <div style={{ fontSize: 13, color: C.sub }}>Sem cotação</div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Formulário */}
        {podeRegistrar && (
          <div style={{ background: '#fff', border: `1px solid ${C.borda}`, borderRadius: 12, padding: '20px', marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.txt, marginBottom: 16 }}>Registrar cotação</div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 12, color: C.sub }}>Produto</label>
                <select value={form.produto_id} onChange={e => setForm(f => ({ ...f, produto_id: e.target.value }))} style={inp}>
                  {produtos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 12, color: C.sub }}>Vigente a partir de</label>
                <input type="datetime-local" value={form.vigente_a_partir_de} onChange={e => setForm(f => ({ ...f, vigente_a_partir_de: e.target.value }))} style={inp} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 12, color: C.sub }}>Preço externo (R$/kg)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: C.sub }}>R$</span>
                  <input type="text" inputMode="numeric" placeholder="0,00" value={form.preco_externo}
                    onChange={e => setForm(f => ({ ...f, preco_externo: mascaraPreco(e.target.value) }))}
                    style={{ ...inp, paddingLeft: 32, width: 120 }} />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 12, color: C.sub }}>Preço cooperado (R$/kg)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: C.sub }}>R$</span>
                  <input type="text" inputMode="numeric" placeholder="0,00" value={form.preco_cooperado}
                    onChange={e => setForm(f => ({ ...f, preco_cooperado: mascaraPreco(e.target.value) }))}
                    style={{ ...inp, paddingLeft: 32, width: 120 }} />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 160 }}>
                <label style={{ fontSize: 12, color: C.sub }}>Observações</label>
                <input placeholder="Opcional" value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} style={inp} />
              </div>
              <button onClick={handleSalvar} disabled={status === 'salvando'}
                style={{ padding: '9px 18px', background: C.cor, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {status === 'salvando' ? 'Salvando...' : 'Registrar'}
              </button>
            </div>
            {avisoPreco && <div style={{ marginTop: 8, color: '#B45309', fontSize: 12 }}>Atenção: preço cooperado está menor que preço externo.</div>}
            {status === 'sucesso' && <div style={{ marginTop: 10, color: '#166534', fontSize: 13 }}>✓ Cotação registrada.</div>}
            {status === 'erro'    && <div style={{ marginTop: 10, color: '#DC2626', fontSize: 13 }}>{erroMsg}</div>}
          </div>
        )}

        {/* Histórico */}
        <div style={{ background: '#fff', border: `1px solid ${C.borda}`, borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.borda}` }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.sub }}>Histórico de cotações</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#FAFAF8' }}>
                {['Data/hora', 'Produto', 'Externo', 'Cooperado', 'Diferença'].map((h, i) => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: i >= 2 ? 'right' : 'left', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.sub }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cotacoes.map((c, i) => {
                const diff = ((c.preco_cooperado - c.preco_externo) / c.preco_externo * 100).toFixed(1)
                return (
                  <tr key={c.id} style={{ borderTop: `1px solid ${C.borda}`, background: i % 2 === 0 ? '#fff' : '#FAFAF8' }}>
                    <td style={{ padding: '12px 16px', color: C.sub }}>{new Date(c.vigente_a_partir_de).toLocaleString('pt-BR')}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: C.txt }}>{c.produtos?.nome}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: C.sub }}>{fmtReal(c.preco_externo)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: C.cor }}>{fmtReal(c.preco_cooperado)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#166534', fontSize: 12 }}>+{diff}%</td>
                  </tr>
                )
              })}
              {cotacoes.length === 0 && (
                <tr><td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: C.sub }}>Nenhuma cotação registrada ainda.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
