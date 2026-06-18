'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { atualizarProduto } from '@/lib/loja/actions'
import { Btn } from '@/components/ui/Btn'
import type { LojaFornecedor, LojaUnidade, LojaLote } from '@/types/database'
import type { LojaProdutoComFornecedor } from '@/lib/loja/actions'
import type { PosicaoEstoque } from '@/lib/loja/types'

interface Props {
  produto:        LojaProdutoComFornecedor
  posicaoEstoque: PosicaoEstoque
  fornecedores:   LojaFornecedor[]
  podeGerenciar:  boolean
}

const UNIDADES: { value: LojaUnidade; label: string }[] = [
  { value: 'kg',      label: 'Quilograma (kg)' },
  { value: 'litro',   label: 'Litro (L)'       },
  { value: 'unidade', label: 'Unidade (un)'    },
  { value: 'saco',    label: 'Saco (sc)'       },
  { value: 'caixa',   label: 'Caixa (cx)'      },
]

const inputStyle = (disabled: boolean): React.CSSProperties => ({
  width: '100%', padding: '9px 12px', fontSize: '14px',
  border: '1px solid #d5d3cc', borderRadius: '8px',
  background: disabled ? '#f5f3ef' : '#fff', color: '#1a1a1a',
  outline: 'none', boxSizing: 'border-box',
  cursor: disabled ? 'not-allowed' : 'text',
})

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '12px', fontWeight: '600', color: '#555', marginBottom: '5px',
}

function formatReais(digits: string): string {
  if (!digits) return ''
  const n = parseInt(digits.replace(/\D/g, '') || '0', 10) / 100
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function parseReais(val: string): number {
  return parseFloat(val.replace(/\./g, '').replace(',', '.')) || 0
}

function fmtReais(n: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

function fmtData(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

export default function EditarProdutoClient({ produto, posicaoEstoque, fornecedores, podeGerenciar }: Props) {
  const router = useRouter()
  const disabled = !podeGerenciar

  const [nome, setNome]                 = useState(produto.nome)
  const [categoria, setCategoria]       = useState(produto.categoria ?? '')
  const [unidade, setUnidade]           = useState<LojaUnidade>(produto.unidade)
  const [fornecedorId, setFornecedorId] = useState(produto.fornecedor_id ?? '')
  const [precoNormal, setPrecoNormal]   = useState(
    formatReais(String(Math.round(produto.preco_normal * 100)))
  )
  const [estoqueMin, setEstoqueMin]     = useState(produto.estoque_minimo?.toString() ?? '')
  const [ativo, setAtivo]               = useState(produto.ativo)
  const [ncm, setNcm]                   = useState(produto.ncm ?? '')
  const [temDesconto, setTemDesconto]   = useState(produto.desconto_cooperado)
  const [descontoPct, setDescontoPct]   = useState(produto.desconto_cooperado_pct?.toString() ?? '')
  const [erro, setErro]                 = useState<string | null>(null)
  const [salvando, setSalvando]         = useState(false)
  const [salvo, setSalvo]               = useState(false)

  const { estoque_atual, estoque_minimo, lotes } = posicaoEstoque
  const eCritico = estoque_minimo != null && estoque_atual < estoque_minimo

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setSalvo(false)

    if (!nome.trim()) { setErro('Informe o nome do produto.'); return }
    if (temDesconto && !descontoPct) { setErro('Informe o percentual de desconto.'); return }

    setSalvando(true)
    const result = await atualizarProduto(produto.id, {
      nome:                   nome.trim(),
      categoria:              categoria.trim() || null,
      unidade,
      fornecedor_id:          fornecedorId || null,
      preco_normal:           parseReais(precoNormal),
      estoque_minimo:         estoqueMin ? parseInt(estoqueMin, 10) : null,
      ativo,
      desconto_cooperado:     temDesconto,
      desconto_cooperado_pct: temDesconto && descontoPct ? parseFloat(descontoPct) : null,
      ncm:                    ncm.trim() || null,
    })
    setSalvando(false)

    if (result.error) { setErro(result.error); return }
    setSalvo(true)
    setTimeout(() => router.push('/loja/produtos'), 800)
  }

  return (
    <div style={{ maxWidth: '720px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Cabeçalho */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#6b7280', marginBottom: '12px', fontWeight: 500 }}>
          <Link href="/dashboard" style={{ color: '#6b7280', textDecoration: 'none' }}>NexCoop</Link>
          <span style={{ color: '#d1d5db' }}>/</span>
          <Link href="/loja" style={{ color: '#6b7280', textDecoration: 'none' }}>Loja</Link>
          <span style={{ color: '#d1d5db' }}>/</span>
          <span style={{ color: '#1a1a1a' }}>Produto</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
          <Btn variante="cinza" tamanho="sm" onClick={() => router.push('/loja/produtos')}>← Produtos</Btn>
          {!podeGerenciar && (
            <span style={{ fontSize: '12px', color: '#888', background: '#f5f3ef', padding: '4px 10px', borderRadius: '20px' }}>
              Somente visualização
            </span>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit}>

        {/* Card: dados principais */}
        <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '24px', marginBottom: '16px' }}>
          <h2 style={{ margin: '0 0 18px', fontSize: '15px', fontWeight: '600', color: '#1a1a1a' }}>Dados do produto</h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Nome *</label>
              <input
                value={nome}
                onChange={e => setNome(e.target.value)}
                disabled={disabled}
                style={inputStyle(disabled)}
              />
            </div>

            <div>
              <label style={labelStyle}>Categoria</label>
              <input
                value={categoria}
                onChange={e => setCategoria(e.target.value)}
                disabled={disabled}
                style={inputStyle(disabled)}
              />
            </div>

            <div>
              <label style={labelStyle}>Unidade</label>
              <select
                value={unidade}
                onChange={e => setUnidade(e.target.value as LojaUnidade)}
                disabled={disabled}
                style={{ ...inputStyle(disabled), appearance: 'auto' }}
              >
                {UNIDADES.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Fornecedor</label>
              <select
                value={fornecedorId}
                onChange={e => setFornecedorId(e.target.value)}
                disabled={disabled}
                style={{ ...inputStyle(disabled), appearance: 'auto' }}
              >
                <option value="">Sem fornecedor</option>
                {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Preço de venda (R$)</label>
              <input
                value={precoNormal}
                onChange={e => setPrecoNormal(formatReais(e.target.value))}
                inputMode="numeric"
                disabled={disabled}
                style={inputStyle(disabled)}
              />
            </div>

            <div>
              <label style={labelStyle}>Estoque mínimo</label>
              <input
                type="number"
                min="0"
                value={estoqueMin}
                onChange={e => setEstoqueMin(e.target.value)}
                disabled={disabled}
                style={inputStyle(disabled)}
              />
            </div>

            <div>
              <label style={labelStyle}>Código NCM</label>
              <input
                value={ncm}
                onChange={e => setNcm(e.target.value.replace(/\D/g, '').slice(0, 8))}
                placeholder="00000000"
                maxLength={8}
                inputMode="numeric"
                disabled={disabled}
                style={{ ...inputStyle(disabled), fontFamily: 'monospace' }}
              />
              <span style={{ fontSize: 11, color: '#888', marginTop: 4, display: 'block' }}>
                8 dígitos — necessário para emissão de nota fiscal
              </span>
            </div>

            {podeGerenciar && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '8px' }}>
                <input
                  type="checkbox"
                  id="ativo"
                  checked={ativo}
                  onChange={e => setAtivo(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <label htmlFor="ativo" style={{ fontSize: '14px', color: '#333', cursor: 'pointer' }}>
                  Produto ativo
                </label>
              </div>
            )}

          </div>
        </div>

        {/* Card: desconto cooperados */}
        <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '24px', marginBottom: '16px' }}>
          <h2 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: '600', color: '#1a1a1a' }}>Desconto para cooperados</h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <input
              type="checkbox"
              id="temDesconto"
              checked={temDesconto}
              disabled={disabled}
              onChange={e => setTemDesconto(e.target.checked)}
              style={{ width: '16px', height: '16px', cursor: disabled ? 'not-allowed' : 'pointer' }}
            />
            <label htmlFor="temDesconto" style={{ fontSize: '14px', color: '#333', cursor: disabled ? 'default' : 'pointer' }}>
              Oferecer desconto aos cooperados
            </label>
          </div>

          {temDesconto && (
            <div style={{ maxWidth: '200px' }}>
              <label style={labelStyle}>Percentual de desconto (%)</label>
              <input
                type="number"
                min="0.1"
                max="100"
                step="0.1"
                value={descontoPct}
                onChange={e => setDescontoPct(e.target.value)}
                disabled={disabled}
                style={inputStyle(disabled)}
              />
            </div>
          )}
        </div>

        {/* Erro / sucesso / botões */}
        {erro && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', fontSize: '13px', color: '#dc2626' }}>
            {erro}
          </div>
        )}
        {salvo && (
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', fontSize: '13px', color: '#16a34a' }}>
            Produto atualizado com sucesso!
          </div>
        )}

        {podeGerenciar && (
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginBottom: '24px' }}>
            <Btn variante="cinza" onClick={() => router.push('/loja/produtos')}>Cancelar</Btn>
            <Btn type="submit" disabled={salvando} style={{ background: '#E07B30', color: '#fff', border: '1.5px solid #E07B30' }}>
              {salvando ? 'Salvando…' : 'Salvar alterações'}
            </Btn>
          </div>
        )}

      </form>

      {/* Card: posição de estoque */}
      <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '24px' }}>
        <h2 style={{ margin: '0 0 18px', fontSize: '15px', fontWeight: '600', color: '#1a1a1a' }}>Posição de estoque</h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
          <div style={{ textAlign: 'center', padding: '14px', background: eCritico ? '#fef2f2' : '#f8f7f4', borderRadius: '10px' }}>
            <div style={{ fontSize: '28px', fontWeight: '700', color: eCritico ? '#dc2626' : '#1a1a1a' }}>
              {estoque_atual.toLocaleString('pt-BR')}
            </div>
            <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>Saldo atual</div>
          </div>
          <div style={{ textAlign: 'center', padding: '14px', background: '#f8f7f4', borderRadius: '10px' }}>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#1a1a1a' }}>
              {estoque_minimo != null ? estoque_minimo.toLocaleString('pt-BR') : '—'}
            </div>
            <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>Estoque mínimo</div>
          </div>
          <div style={{ textAlign: 'center', padding: '14px', background: eCritico ? '#fef2f2' : '#f0fdf4', borderRadius: '10px' }}>
            <div style={{ fontSize: '14px', fontWeight: '600', color: eCritico ? '#dc2626' : '#166534', paddingTop: '8px' }}>
              {eCritico ? '⚠ Crítico' : '✓ Normal'}
            </div>
            <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>Status</div>
          </div>
        </div>

        {/* Lotes */}
        {lotes.length === 0 ? (
          <p style={{ fontSize: '13px', color: '#aaa', textAlign: 'center', padding: '1rem 0', margin: 0 }}>
            Nenhum lote ativo.
          </p>
        ) : (
          <>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#888', marginBottom: '8px' }}>
              LOTES ATIVOS ({lotes.length})
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e3dc' }}>
                  {['Nº do lote', 'Quantidade', 'Validade'].map(h => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lotes.map((lote: LojaLote) => {
                  const vence = lote.data_validade
                    ? new Date(lote.data_validade) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                    : false
                  return (
                    <tr key={lote.id} style={{ borderBottom: '1px solid #f5f3ef' }}>
                      <td style={{ padding: '9px 10px', color: '#555' }}>{lote.numero_lote ?? '—'}</td>
                      <td style={{ padding: '9px 10px', color: '#1a1a1a', fontWeight: '500' }}>
                        {lote.quantidade_atual.toLocaleString('pt-BR')}
                      </td>
                      <td style={{ padding: '9px 10px', color: vence ? '#d97706' : '#555', fontWeight: vence ? '600' : '400' }}>
                        {fmtData(lote.data_validade)}
                        {vence && <span style={{ fontSize: '10px', marginLeft: '6px', background: '#fffbeb', padding: '1px 6px', borderRadius: '10px' }}>vence em breve</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </>
        )}
      </div>

    </div>
  )
}
