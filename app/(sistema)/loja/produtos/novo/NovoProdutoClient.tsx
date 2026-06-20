'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { criarProduto } from '@/lib/loja/actions'
import { Btn } from '@/components/ui/Btn'
import type { LojaFornecedor } from '@/types/database'

interface Unidade { id: string; nome: string; sigla: string }

interface Props {
  fornecedores: LojaFornecedor[]
  unidades:     Unidade[]
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', fontSize: '14px',
  border: '1px solid #d5d3cc', borderRadius: '8px', background: '#fff',
  color: '#1a1a1a', outline: 'none', boxSizing: 'border-box',
}

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

export default function NovoProdutoClient({ fornecedores, unidades }: Props) {
  const router = useRouter()

  const [nome, setNome]                   = useState('')
  const [categoria, setCategoria]         = useState('')
  const [unidade, setUnidade]             = useState(unidades[0]?.nome ?? 'unidade')
  const [fornecedorId, setFornecedorId]   = useState('')
  const [precoNormal, setPrecoNormal]     = useState('')
  const [estoqueMin, setEstoqueMin]       = useState('')
  const [ativo, setAtivo]                 = useState(true)
  const [ncm, setNcm]                     = useState('')
  const [temDesconto, setTemDesconto]     = useState(false)
  const [descontoPct, setDescontoPct]     = useState('')
  const [erro, setErro]                   = useState<string | null>(null)
  const [salvando, setSalvando]           = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)

    if (!nome.trim()) { setErro('Informe o nome do produto.'); return }
    if (!precoNormal)  { setErro('Informe o preço de venda.'); return }
    if (temDesconto && !descontoPct) { setErro('Informe o percentual de desconto.'); return }

    setSalvando(true)
    const result = await criarProduto({
      nome:                  nome.trim(),
      categoria:             categoria.trim() || null,
      unidade,
      fornecedor_id:         fornecedorId || null,
      preco_normal:          parseReais(precoNormal),
      estoque_minimo:        estoqueMin ? parseInt(estoqueMin, 10) : null,
      desconto_cooperado:    temDesconto,
      desconto_cooperado_pct: temDesconto && descontoPct ? parseFloat(descontoPct) : null,
      ncm:                   ncm.trim() || null,
      cfop_saida:            null,
    })
    setSalvando(false)

    if (result.error) { setErro(result.error); return }
    router.push('/loja/produtos')
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
          <span style={{ color: '#1a1a1a' }}>Novo Produto</span>
        </div>
        <Btn variante="cinza" tamanho="sm" onClick={() => router.push('/loja/produtos')}>← Produtos</Btn>
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
                placeholder="Ex.: Ração para gado"
                style={inputStyle}
                required
              />
            </div>

            <div>
              <label style={labelStyle}>Categoria</label>
              <input
                value={categoria}
                onChange={e => setCategoria(e.target.value)}
                placeholder="Ex.: Nutrição animal"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Unidade *</label>
              <select value={unidade} onChange={e => setUnidade(e.target.value)} style={inputStyle}>
                {unidades.map(u => <option key={u.id} value={u.nome}>{u.nome} ({u.sigla})</option>)}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Fornecedor</label>
              <select value={fornecedorId} onChange={e => setFornecedorId(e.target.value)} style={inputStyle}>
                <option value="">Sem fornecedor</option>
                {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Preço de venda (R$) *</label>
              <input
                value={precoNormal}
                onChange={e => setPrecoNormal(formatReais(e.target.value))}
                placeholder="0,00"
                inputMode="numeric"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Estoque mínimo</label>
              <input
                type="number"
                min="0"
                value={estoqueMin}
                onChange={e => setEstoqueMin(e.target.value)}
                placeholder="Quantidade mínima"
                style={inputStyle}
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
                style={{ ...inputStyle, fontFamily: 'monospace' }}
              />
              <span style={{ fontSize: 11, color: '#888', marginTop: 4, display: 'block' }}>
                8 dígitos — necessário para emissão de nota fiscal
              </span>
            </div>

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
              onChange={e => setTemDesconto(e.target.checked)}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <label htmlFor="temDesconto" style={{ fontSize: '14px', color: '#333', cursor: 'pointer' }}>
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
                placeholder="Ex.: 5"
                style={inputStyle}
              />
            </div>
          )}
        </div>

        {/* Erro e botões */}
        {erro && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', fontSize: '13px', color: '#dc2626' }}>
            {erro}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <Btn variante="cinza" onClick={() => router.push('/loja/produtos')}>Cancelar</Btn>
          <Btn type="submit" disabled={salvando} style={{ background: '#E07B30', color: '#fff', border: '1.5px solid #E07B30' }}>
            {salvando ? 'Salvando…' : 'Criar produto'}
          </Btn>
        </div>

      </form>
    </div>
  )
}
