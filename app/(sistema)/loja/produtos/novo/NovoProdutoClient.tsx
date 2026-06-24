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

const C = {
  laranja: '#E07B30', laranjaLt: '#FFF7ED',
  borda: '#E5E3DC', bg: '#F8F7F4',
  txt: '#1C1917', txtSub: '#78716C',
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', fontSize: '14px',
  border: `1px solid ${C.borda}`, borderRadius: '8px', background: '#fff',
  color: C.txt, outline: 'none', boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '12px', fontWeight: '600', color: C.txtSub, marginBottom: '5px',
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
    <>
      <style>{`
        .np-header  { padding: 0 32px; min-height: 88px; display: flex; align-items: center; }
        .np-content { padding: 28px 32px; }
        @media (max-width: 640px) {
          .np-header  { padding: 0 16px 0 56px; min-height: 60px; }
          .np-content { padding: 16px; }
        }
      `}</style>

      <header className="np-header" style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: '#fff', borderBottom: `1px solid ${C.borda}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, margin: '0 -2rem 0 -2rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: C.laranjaLt, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="ti ti-box" style={{ fontSize: 20, color: C.laranja }} />
          </div>
          <div>
            <h1 style={{ fontSize: 19, fontWeight: 800, color: C.txt, margin: 0, lineHeight: 1.2 }}>Novo Produto</h1>
            <div style={{ fontSize: 12, color: C.txtSub, marginTop: 2 }}>
              <Link href="/loja" style={{ color: C.txtSub, textDecoration: 'none' }}>Loja Agropecuária</Link>
              {' / '}
              <Link href="/loja/produtos" style={{ color: C.txtSub, textDecoration: 'none' }}>Produtos</Link>
              {' / '}Novo
            </div>
          </div>
        </div>
      </header>

      <div className="np-content" style={{ background: C.bg, margin: '0 -2rem -2rem -2rem', minHeight: 'calc(100vh - 88px)' }}>
        <div style={{ maxWidth: '720px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

          <form onSubmit={handleSubmit}>

            {/* Card: dados principais */}
            <div style={{ background: '#fff', border: `1px solid ${C.borda}`, borderRadius: '12px', padding: '24px', marginBottom: '16px' }}>
              <h2 style={{ margin: '0 0 18px', fontSize: '15px', fontWeight: '600', color: C.txt }}>Dados do produto</h2>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Nome *</label>
                  <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex.: Ração para gado" style={inputStyle} required />
                </div>

                <div>
                  <label style={labelStyle}>Categoria</label>
                  <input value={categoria} onChange={e => setCategoria(e.target.value)} placeholder="Ex.: Nutrição animal" style={inputStyle} />
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
                  <input value={precoNormal} onChange={e => setPrecoNormal(formatReais(e.target.value))} placeholder="0,00" inputMode="numeric" style={inputStyle} />
                </div>

                <div>
                  <label style={labelStyle}>Estoque mínimo</label>
                  <input type="number" min="0" value={estoqueMin} onChange={e => setEstoqueMin(e.target.value)} placeholder="Quantidade mínima" style={inputStyle} />
                </div>

                <div>
                  <label style={labelStyle}>Código NCM</label>
                  <input value={ncm} onChange={e => setNcm(e.target.value.replace(/\D/g, '').slice(0, 8))} placeholder="00000000" maxLength={8} inputMode="numeric" style={{ ...inputStyle, fontFamily: 'monospace' }} />
                  <span style={{ fontSize: 11, color: '#888', marginTop: 4, display: 'block' }}>8 dígitos — necessário para emissão de nota fiscal</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '8px' }}>
                  <input type="checkbox" id="ativo" checked={ativo} onChange={e => setAtivo(e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                  <label htmlFor="ativo" style={{ fontSize: '14px', color: C.txt, cursor: 'pointer' }}>Produto ativo</label>
                </div>

              </div>
            </div>

            {/* Card: desconto cooperados */}
            <div style={{ background: '#fff', border: `1px solid ${C.borda}`, borderRadius: '12px', padding: '24px', marginBottom: '16px' }}>
              <h2 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: '600', color: C.txt }}>Desconto para cooperados</h2>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <input type="checkbox" id="temDesconto" checked={temDesconto} onChange={e => setTemDesconto(e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                <label htmlFor="temDesconto" style={{ fontSize: '14px', color: C.txt, cursor: 'pointer' }}>Oferecer desconto aos cooperados</label>
              </div>

              {temDesconto && (
                <div style={{ maxWidth: '200px' }}>
                  <label style={labelStyle}>Percentual de desconto (%)</label>
                  <input type="number" min="0.1" max="100" step="0.1" value={descontoPct} onChange={e => setDescontoPct(e.target.value)} placeholder="Ex.: 5" style={inputStyle} />
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
              <Btn type="submit" disabled={salvando} style={{ background: C.laranja, color: '#fff', border: `1.5px solid ${C.laranja}` }}>
                {salvando ? 'Salvando…' : 'Criar produto'}
              </Btn>
            </div>

          </form>
        </div>
      </div>
    </>
  )
}
