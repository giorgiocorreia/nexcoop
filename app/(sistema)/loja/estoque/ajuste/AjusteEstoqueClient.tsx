'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ajusteEstoque } from '@/lib/loja/actions'
import { Btn } from '@/components/ui/Btn'

interface Produto { id: string; nome: string; unidade: string; estoque_atual: number }

interface MovimentoHistorico {
  id: string
  produto_id: string
  produto_nome: string
  quantidade: number
  motivo: string | null
  criado_em: string
  estoque_anterior?: number
}

interface Props {
  produtos: Produto[]
  historico: MovimentoHistorico[]
  orgId: string
  usuarioId: string
}

const LARANJA  = '#E07B30'
const VERDE    = '#1D9E75'
const VERMELHO = '#dc2626'

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', fontSize: '13px',
  border: '1px solid #d5d3cc', borderRadius: '8px', background: '#fff',
  color: '#1a1a1a', outline: 'none', boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '12px', fontWeight: '600', color: '#555', marginBottom: '5px',
}

const MOTIVOS = [
  { value: 'Inventário periódico', label: 'Inventário periódico' },
  { value: 'Avaria',               label: 'Avaria'               },
  { value: 'Furto',                label: 'Furto'                },
  { value: 'Outros',               label: 'Outros'               },
]

function fmtData(s: string) {
  const d = new Date(s)
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export default function AjusteEstoqueClient({ produtos, historico, orgId, usuarioId }: Props) {
  const router = useRouter()

  const [produtoId, setProdutoId]   = useState('')
  const [contagem, setContagem]     = useState('')
  const [motivo, setMotivo]         = useState(MOTIVOS[0].value)
  const [salvando, setSalvando]     = useState(false)
  const [erro, setErro]             = useState<string | null>(null)
  const [sucesso, setSucesso]       = useState<string | null>(null)

  const produtoSel = useMemo(() => produtos.find(p => p.id === produtoId), [produtos, produtoId])

  const contagemNum = parseFloat(contagem.replace(',', '.')) || 0
  const diferenca   = produtoSel ? contagemNum - produtoSel.estoque_atual : 0

  function descDiferenca() {
    if (!produtoSel || !contagem) return null
    if (diferenca > 0) return { text: `Entrada de +${diferenca.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} ${produtoSel.unidade}`, color: VERDE }
    if (diferenca < 0) return { text: `Saída de ${diferenca.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} ${produtoSel.unidade}`, color: VERMELHO }
    return { text: 'Sem diferença', color: '#888' }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!produtoSel)     { setErro('Selecione um produto.'); return }
    if (!contagem)       { setErro('Informe a contagem física.'); return }
    if (contagemNum < 0) { setErro('Contagem não pode ser negativa.'); return }

    setSalvando(true)
    setErro(null)
    setSucesso(null)

    const result = await ajusteEstoque(orgId, usuarioId, produtoId, contagemNum, motivo)
    setSalvando(false)

    if (result.error) { setErro(result.error); return }

    setSucesso(`Estoque ajustado com sucesso. ${diferenca > 0 ? '+' : ''}${diferenca.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} ${produtoSel.unidade}.`)
    setProdutoId(''); setContagem('')
    router.refresh()
  }

  const diff = descDiferenca()

  return (
    <div style={{ maxWidth: '800px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#6b7280', marginBottom: '12px', fontWeight: 500 }}>
          <Link href="/dashboard" style={{ color: '#6b7280', textDecoration: 'none' }}>NexCoop</Link>
          <span style={{ color: '#d1d5db' }}>/</span>
          <Link href="/loja" style={{ color: '#6b7280', textDecoration: 'none' }}>Loja</Link>
          <span style={{ color: '#d1d5db' }}>/</span>
          <span style={{ color: '#1a1a1a' }}>Ajuste de Estoque</span>
        </div>
        <Link href="/loja/estoque" style={{ color: '#888', fontSize: '13px', textDecoration: 'none' }}>← Estoque</Link>
      </div>

      {sucesso && (
        <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '10px', padding: '12px 18px', marginBottom: '1rem', fontSize: '13px', color: '#166534', fontWeight: '600' }}>
          {sucesso}
        </div>
      )}
      {erro && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '10px', padding: '12px 16px', marginBottom: '1rem', fontSize: '13px', color: '#991b1b' }}>
          {erro}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '24px', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '700' }}>Registrar ajuste</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Produto *</label>
            <select value={produtoId} onChange={e => setProdutoId(e.target.value)} style={inputStyle}>
              <option value="">Selecione...</option>
              {produtos.map(p => <option key={p.id} value={p.id}>{p.nome} ({p.unidade})</option>)}
            </select>
          </div>

          {produtoSel && (
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{
                background: '#f8f7f4', borderRadius: '8px', padding: '12px 16px',
                display: 'flex', alignItems: 'center', gap: '12px',
              }}>
                <span style={{ fontSize: '13px', color: '#555' }}>Saldo do sistema:</span>
                <span style={{ fontSize: '18px', fontWeight: '700', color: '#1a1a1a' }}>
                  {Number(produtoSel.estoque_atual).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} {produtoSel.unidade}
                </span>
              </div>
            </div>
          )}

          <div>
            <label style={labelStyle}>Contagem física *</label>
            <input
              type="text"
              inputMode="decimal"
              value={contagem}
              onChange={e => setContagem(e.target.value)}
              placeholder="0"
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '2px' }}>
            {diff && (
              <div style={{ background: '#f8f7f4', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', fontWeight: '700', color: diff.color, width: '100%', boxSizing: 'border-box' }}>
                {diff.text}
              </div>
            )}
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Motivo *</label>
            <select value={motivo} onChange={e => setMotivo(e.target.value)} style={inputStyle}>
              {MOTIVOS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        </div>

        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
          <Btn type="submit" disabled={salvando || !produtoSel || !contagem} style={{ background: LARANJA, color: '#fff', border: `1.5px solid ${LARANJA}` }}>
            {salvando ? 'Salvando...' : 'Confirmar ajuste'}
          </Btn>
        </div>
      </form>

      {/* Histórico */}
      <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '20px 24px' }}>
        <h2 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: '700' }}>Histórico de ajustes (últimos 30 dias)</h2>
        {historico.length === 0 ? (
          <p style={{ color: '#888', fontSize: '13px', margin: 0 }}>Nenhum ajuste nos últimos 30 dias.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e3dc' }}>
                {['Produto', 'Data', 'Diferença', 'Motivo'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#888' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {historico.map(m => (
                <tr key={m.id} style={{ borderBottom: '1px solid #f0ede8' }}>
                  <td style={{ padding: '9px 10px', fontWeight: '600' }}>{m.produto_nome}</td>
                  <td style={{ padding: '9px 10px', color: '#555', whiteSpace: 'nowrap' }}>{fmtData(m.criado_em)}</td>
                  <td style={{ padding: '9px 10px' }}>
                    <span style={{ fontWeight: '600', color: '#555' }}>
                      {Number(m.quantidade).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} un
                    </span>
                  </td>
                  <td style={{ padding: '9px 10px', color: '#555' }}>{m.motivo ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  )
}
