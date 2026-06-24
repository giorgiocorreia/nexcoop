'use client'

import { useEffect, useState } from 'react'
import { listarCotacoes, registrarCotacao } from '@/lib/comercializacao/cotacoes.actions'
import { listarProdutos } from '@/lib/comercializacao/produtos.actions'
import { fmtReal } from '@/lib/comercializacao/fmt'

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
  const [form, setForm] = useState({
    produto_id: '',
    vigente_a_partir_de: agora,
    preco_externo: '',
    preco_cooperado: '',
    observacoes: ''
  })
  const [status, setStatus] = useState<'idle' | 'salvando' | 'sucesso' | 'erro'>('idle')
  const [erroMsg, setErroMsg] = useState('')

  useEffect(() => { carregar() }, [])

  async function carregar() {
    const [c, p] = await Promise.all([listarCotacoes(), listarProdutos()])
    setCotacoes(c)
    setProdutos(p.filter((p: any) => p.ativo))
    if (p.length > 0 && !form.produto_id) {
      setForm(f => ({ ...f, produto_id: p[0].id }))
    }
  }

  const precoExt = parsePreco(form.preco_externo)
  const precoCoop = parsePreco(form.preco_cooperado)
  const avisoPreco = form.preco_externo && form.preco_cooperado && precoCoop < precoExt

  async function handleSalvar() {
    if (!form.produto_id || !form.preco_externo || !form.preco_cooperado) return
    setStatus('salvando')
    try {
      await registrarCotacao({
        produto_id: form.produto_id,
        vigente_a_partir_de: new Date(form.vigente_a_partir_de).toISOString(),
        preco_externo: precoExt,
        preco_cooperado: precoCoop,
        observacoes: form.observacoes
      })
      setForm(f => ({ ...f, preco_externo: '', preco_cooperado: '', observacoes: '' }))
      await carregar()
      setStatus('sucesso')
      setTimeout(() => setStatus('idle'), 3000)
    } catch (e: any) {
      setErroMsg(e.message)
      setStatus('erro')
    }
  }

  const ultimasPorProduto = produtos.map(p => ({
    produto: p,
    cotacao: cotacoes.find(c => c.produto_id === p.id) ?? null
  }))

  return (
    <div style={{ padding: '32px', background: '#f8f7f4', minHeight: '100vh' }}>

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24 }}>
        <a href="/dashboard" style={{ fontSize: 13, color: '#78716c', textDecoration: 'none' }}>NexCoop</a>
        <span style={{ fontSize: 13, color: '#e5e3dc' }}>/</span>
        <a href="/comercializacao" style={{ fontSize: 13, color: '#78716c', textDecoration: 'none' }}>Comercialização</a>
        <span style={{ fontSize: 13, color: '#e5e3dc' }}>/</span>
        <span style={{ fontSize: 13, color: '#78716c', fontWeight: 600 }}>Cotações</span>
      </div>

      {/* Cards última cotação por produto */}
      {ultimasPorProduto.length > 0 && (
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
          {ultimasPorProduto.map(({ produto, cotacao }) => (
            <div key={produto.id} style={{
              background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px',
              padding: '16px 20px', minWidth: '200px'
            }}>
              <div style={{ fontSize: '13px', color: '#6b6b6b', marginBottom: '8px' }}>{produto.nome}</div>
              {cotacao ? (
                <>
                  <div style={{ fontSize: '12px', color: '#9a9a9a', marginBottom: '4px' }}>
                    {new Date(cotacao.vigente_a_partir_de).toLocaleString('pt-BR')}
                  </div>
                  <div style={{ fontSize: '13px', color: '#6b6b6b' }}>
                    Externo: <strong>{fmtReal(cotacao.preco_externo)}/{produto.unidade}</strong>
                  </div>
                  <div style={{ fontSize: '13px', color: '#92400e' }}>
                    Cooperado: <strong>{fmtReal(cotacao.preco_cooperado)}/{produto.unidade}</strong>
                  </div>
                </>
              ) : (
                <div style={{ fontSize: '13px', color: '#9a9a9a' }}>Sem cotação</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Formulário */}
      {podeRegistrar && (
        <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
          <div style={{ fontWeight: 500, marginBottom: '16px', fontSize: '14px' }}>Registrar cotação</div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Produto</label>
              <select
                value={form.produto_id}
                onChange={e => setForm(f => ({ ...f, produto_id: e.target.value }))}
                style={{ padding: '8px 12px', border: '1px solid #e5e3dc', borderRadius: '8px', fontSize: '14px' }}
              >
                {produtos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Vigente a partir de</label>
              <input
                type="datetime-local"
                value={form.vigente_a_partir_de}
                onChange={e => setForm(f => ({ ...f, vigente_a_partir_de: e.target.value }))}
                style={{ padding: '8px 12px', border: '1px solid #e5e3dc', borderRadius: '8px', fontSize: '14px' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Preço externo (R$/kg)</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: '#6b6b6b' }}>R$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0,00"
                  value={form.preco_externo}
                  onChange={e => setForm(f => ({ ...f, preco_externo: mascaraPreco(e.target.value) }))}
                  style={{ padding: '8px 12px 8px 32px', border: '1px solid #e5e3dc', borderRadius: '8px', fontSize: '14px', width: '130px' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Preço cooperado (R$/kg)</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: '#6b6b6b' }}>R$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0,00"
                  value={form.preco_cooperado}
                  onChange={e => setForm(f => ({ ...f, preco_cooperado: mascaraPreco(e.target.value) }))}
                  style={{ padding: '8px 12px 8px 32px', border: '1px solid #e5e3dc', borderRadius: '8px', fontSize: '14px', width: '130px' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '160px' }}>
              <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Observações</label>
              <input
                placeholder="Opcional"
                value={form.observacoes}
                onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                style={{ padding: '8px 12px', border: '1px solid #e5e3dc', borderRadius: '8px', fontSize: '14px' }}
              />
            </div>
            <button
              onClick={handleSalvar}
              disabled={status === 'salvando'}
              style={{ padding: '8px 20px', background: '#92400e', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              {status === 'salvando' ? 'Salvando...' : 'Registrar'}
            </button>
          </div>
          {avisoPreco && (
            <div style={{ marginTop: '8px', color: '#b45309', fontSize: '13px' }}>
              Atenção: preço cooperado está menor que preço externo.
            </div>
          )}
          {status === 'sucesso' && (
            <div style={{ marginTop: '12px', color: '#166534', fontSize: '13px' }}>Cotação registrada.</div>
          )}
          {status === 'erro' && (
            <div style={{ marginTop: '12px', color: '#991b1b', fontSize: '13px' }}>{erroMsg}</div>
          )}
        </div>
      )}

      {/* Histórico */}
      <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e5e3dc', background: '#fafaf8' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500 }}>Data</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500 }}>Produto</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 500 }}>Externo</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 500 }}>Cooperado</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 500 }}>Diferença</th>
            </tr>
          </thead>
          <tbody>
            {cotacoes.map(c => {
              const diff = ((c.preco_cooperado - c.preco_externo) / c.preco_externo * 100).toFixed(1)
              return (
                <tr key={c.id} style={{ borderBottom: '1px solid #f0ede8' }}>
                  <td style={{ padding: '12px 16px' }}>
                    {new Date(c.vigente_a_partir_de).toLocaleString('pt-BR')}
                  </td>
                  <td style={{ padding: '12px 16px' }}>{c.produtos?.nome}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    {fmtReal(c.preco_externo)}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: '#92400e', fontWeight: 500 }}>
                    {fmtReal(c.preco_cooperado)}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: '#166534', fontSize: '13px' }}>
                    +{diff}%
                  </td>
                </tr>
              )
            })}
            {cotacoes.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#6b6b6b' }}>
                  Nenhuma cotação registrada ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
