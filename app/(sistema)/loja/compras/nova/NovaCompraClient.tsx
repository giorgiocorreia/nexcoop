'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { registrarCompra, criarFornecedor } from '@/lib/loja/actions'
import { Btn } from '@/components/ui/Btn'

interface Produto { id: string; nome: string; unidade: string }
interface Fornecedor { id: string; nome: string }

interface ItemLinha {
  produto_id: string
  produto_nome: string
  produto_unidade: string
  quantidade: number
  preco_unitario: number
  numero_lote: string
  data_validade: string
}

interface Props {
  produtos: Produto[]
  fornecedores: Fornecedor[]
  orgId: string
  usuarioId: string
}

const C = {
  laranja: '#E07B30', laranjaLt: '#FFF7ED',
  borda: '#E5E3DC', bg: '#F8F7F4',
  txt: '#1C1917', txtSub: '#78716C',
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', fontSize: '13px',
  border: `1px solid ${C.borda}`, borderRadius: '8px', background: '#fff',
  color: C.txt, outline: 'none', boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '12px', fontWeight: '600', color: C.txtSub, marginBottom: '5px',
}

const cardStyle: React.CSSProperties = {
  background: '#fff', border: `1px solid ${C.borda}`, borderRadius: '12px', padding: '20px 24px', marginBottom: '1.5rem',
}

function parseReais(val: string): number {
  return parseFloat(val.replace(/\./g, '').replace(',', '.')) || 0
}

function fmtReal(n: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

function fmtReaisInput(digits: string): string {
  if (!digits) return '0,00'
  const n = parseInt(digits.replace(/\D/g, '') || '0', 10) / 100
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function NovaCompraClient({ produtos, fornecedores, orgId, usuarioId }: Props) {
  const router = useRouter()

  const [fornecedorId, setFornecedorId] = useState('')
  const [fornecedorBusca, setFornecedorBusca]     = useState('')
  const [fornecedorNome, setFornecedorNome]        = useState('')
  const [mostrarDropdown, setMostrarDropdown]      = useState(false)
  const [mostrarCadastrar, setMostrarCadastrar]    = useState(false)
  const [novoFornNome, setNovoFornNome]            = useState('')
  const [novoFornCnpj, setNovoFornCnpj]            = useState('')
  const [novoFornEmail, setNovoFornEmail]          = useState('')
  const [novoFornTelefone, setNovoFornTelefone]    = useState('')
  const [salvandoForn, setSalvandoForn]            = useState(false)
  const [fornecedoresLocal, setFornecedoresLocal]  = useState(fornecedores)
  const [dataCompra, setDataCompra]     = useState(new Date().toISOString().split('T')[0])
  const [numeroNF, setNumeroNF]         = useState('')
  const [frete, setFrete]               = useState('0,00')
  const [outrosCustos, setOutrosCustos] = useState('0,00')
  const [outrosDesc, setOutrosDesc]     = useState('')
  const [observacoes, setObservacoes]   = useState('')
  const [statusNfe, setStatusNfe]       = useState<'sem_chave' | 'sem_nota'>('sem_chave')

  const [produtoId, setProdutoId]       = useState('')
  const [produtoBusca, setProdutoBusca]               = useState('')
  const [produtoSelecionado, setProdutoSelecionado]   = useState<Produto | null>(null)
  const [mostrarDropdownProd, setMostrarDropdownProd] = useState(false)
  const [quantidade, setQuantidade]     = useState('')
  const [precoUnit, setPrecoUnit]       = useState('0,00')
  const [numeroLote, setNumeroLote]     = useState('')
  const [dataValidade, setDataValidade] = useState('')

  const [itens, setItens]   = useState<ItemLinha[]>([])
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro]         = useState<string | null>(null)

  const freteNum   = parseReais(frete)
  const outrosNum  = parseReais(outrosCustos)

  const totalMercadorias = useMemo(
    () => itens.reduce((s, i) => s + i.quantidade * i.preco_unitario, 0),
    [itens]
  )
  const totalGeral = totalMercadorias + freteNum + outrosNum

  const itensComRateio = useMemo(() => itens.map(i => {
    const valorItem   = i.quantidade * i.preco_unitario
    const freteRat    = totalMercadorias > 0 ? freteNum  * (valorItem / totalMercadorias) : 0
    const outrosRat   = totalMercadorias > 0 ? outrosNum * (valorItem / totalMercadorias) : 0
    const custoFinal  = i.preco_unitario + (freteRat + outrosRat) / i.quantidade
    return { ...i, valorItem, freteRat, outrosRat, custoFinal }
  }), [itens, freteNum, outrosNum, totalMercadorias])

  function handleFreteKey(e: React.KeyboardEvent<HTMLInputElement>) {
    const digits = e.currentTarget.value.replace(/\D/g, '') + (e.key.match(/\d/) ? e.key : '')
    if (e.key === 'Backspace') {
      const curr = e.currentTarget.value.replace(/\D/g, '')
      setFrete(fmtReaisInput(curr.slice(0, -1)))
    } else if (e.key.match(/\d/)) {
      e.preventDefault()
      setFrete(fmtReaisInput(digits))
    }
  }

  function handleOutrosKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      const curr = e.currentTarget.value.replace(/\D/g, '')
      setOutrosCustos(fmtReaisInput(curr.slice(0, -1)))
    } else if (e.key.match(/\d/)) {
      e.preventDefault()
      const digits = e.currentTarget.value.replace(/\D/g, '') + e.key
      setOutrosCustos(fmtReaisInput(digits))
    }
  }

  function handlePrecoKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      const curr = e.currentTarget.value.replace(/\D/g, '')
      setPrecoUnit(fmtReaisInput(curr.slice(0, -1)))
    } else if (e.key.match(/\d/)) {
      e.preventDefault()
      const digits = e.currentTarget.value.replace(/\D/g, '') + e.key
      setPrecoUnit(fmtReaisInput(digits))
    }
  }

  function adicionarItem() {
    const prod = produtoSelecionado
    if (!prod) { setErro('Selecione um produto.'); return }
    const qtd   = parseFloat(quantidade.replace(',', '.')) || 0
    const preco = parseReais(precoUnit)
    if (qtd <= 0)   { setErro('Informe uma quantidade válida.'); return }
    if (preco <= 0) { setErro('Informe um preço unitário válido.'); return }
    setErro(null)
    setItens(prev => [...prev, {
      produto_id:    prod.id,
      produto_nome:  prod.nome,
      produto_unidade: prod.unidade,
      quantidade:    qtd,
      preco_unitario: preco,
      numero_lote:   numeroLote,
      data_validade: dataValidade,
    }])
    setProdutoId(''); setProdutoBusca(''); setProdutoSelecionado(null)
    setQuantidade(''); setPrecoUnit('0,00')
    setNumeroLote(''); setDataValidade('')
  }

  function removerItem(idx: number) {
    setItens(prev => prev.filter((_, i) => i !== idx))
  }

  async function handleCadastrarFornecedor() {
    if (!novoFornNome.trim()) { setErro('Informe o nome do fornecedor.'); return }
    setSalvandoForn(true)
    setErro(null)
    const result = await criarFornecedor({
      nome: novoFornNome.trim(),
      cnpj: novoFornCnpj || null,
      email: novoFornEmail || null,
      telefone: novoFornTelefone || null,
    })
    setSalvandoForn(false)
    if ('error' in result) { setErro(result.error ?? null); return }
    const novo = result.data!
    setFornecedoresLocal(prev => [...prev, { id: novo.id, nome: novo.nome }])
    setFornecedorId(novo.id)
    setFornecedorNome(novo.nome)
    setFornecedorBusca(novo.nome)
    setMostrarCadastrar(false)
    setMostrarDropdown(false)
    setNovoFornNome(''); setNovoFornCnpj(''); setNovoFornEmail(''); setNovoFornTelefone('')
  }

  async function handleSubmit() {
    if (!fornecedorId)     { setErro('Selecione um fornecedor.'); return }
    if (itens.length === 0) { setErro('Adicione ao menos um item.'); return }
    setSalvando(true)
    setErro(null)
    const result = await registrarCompra(orgId, usuarioId, {
      fornecedor_id:           fornecedorId,
      data_compra:             dataCompra,
      numero_nf:               numeroNF || undefined,
      valor_frete:             freteNum,
      outros_custos_valor:     outrosNum,
      outros_custos_descricao: outrosDesc || undefined,
      observacoes:             observacoes || undefined,
      status_nfe:              statusNfe,
      itens: itens.map(i => ({
        produto_id:     i.produto_id,
        quantidade:     i.quantidade,
        preco_unitario: i.preco_unitario,
        numero_lote:    i.numero_lote || undefined,
        data_validade:  i.data_validade || undefined,
      })),
    })
    setSalvando(false)
    if (result.error) { setErro(result.error); return }
    router.push('/loja/compras?sucesso=compra')
  }

  return (
    <>
      <style>{`
        .nc-header  { padding: 0 32px; min-height: 88px; display: flex; align-items: center; }
        .nc-content { padding: 28px 32px; }
        @media (max-width: 640px) {
          .nc-header  { padding: 0 16px 0 56px; min-height: 60px; }
          .nc-content { padding: 16px; }
        }
      `}</style>

      <header className="nc-header" style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: '#fff', borderBottom: `1px solid ${C.borda}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, margin: '0 -2rem 0 -2rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: C.laranjaLt, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="ti ti-shopping-cart" style={{ fontSize: 20, color: C.laranja }} />
          </div>
          <div>
            <h1 style={{ fontSize: 19, fontWeight: 800, color: C.txt, margin: 0, lineHeight: 1.2 }}>Nova Compra</h1>
            <div style={{ fontSize: 12, color: C.txtSub, marginTop: 2 }}>
              <Link href="/loja" style={{ color: C.txtSub, textDecoration: 'none' }}>Loja Agropecuária</Link>
              {' / '}
              <Link href="/loja/compras" style={{ color: C.txtSub, textDecoration: 'none' }}>Compras</Link>
              {' / '}Nova
            </div>
          </div>
        </div>
      </header>

      <div className="nc-content" style={{ background: C.bg, margin: '0 -2rem -2rem -2rem', minHeight: 'calc(100vh - 88px)' }}>
        <div style={{ maxWidth: '960px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

          {erro && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '10px', padding: '12px 16px', marginBottom: '1rem', fontSize: '13px', color: '#991b1b' }}>
              {erro}
            </div>
          )}

          {/* Cabeçalho da compra */}
          <div style={cardStyle}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '700' }}>Dados da compra</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div style={{ position: 'relative' }}>
                <label style={labelStyle}>Fornecedor *</label>
                <input
                  type="text"
                  value={fornecedorBusca}
                  onChange={e => {
                    const v = e.target.value
                    setFornecedorBusca(v)
                    setFornecedorId('')
                    setFornecedorNome('')
                    setMostrarDropdown(v.length > 0)
                    setMostrarCadastrar(false)
                  }}
                  onFocus={() => { if (fornecedorBusca.length > 0) setMostrarDropdown(true) }}
                  onBlur={() => setTimeout(() => setMostrarDropdown(false), 200)}
                  placeholder="Digite para buscar fornecedor..."
                  style={{ ...inputStyle, borderColor: fornecedorId ? '#1D9E75' : undefined }}
                  autoComplete="off"
                />
                {fornecedorId && (
                  <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(8px)', fontSize: 14, color: '#1D9E75' }}>✓</span>
                )}

                {mostrarDropdown && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: '#fff', border: `1px solid ${C.borda}`, borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: 200, overflowY: 'auto' }}>
                    {(() => {
                      const filtrados = fornecedoresLocal.filter(f => f.nome.toLowerCase().includes(fornecedorBusca.toLowerCase()))
                      if (filtrados.length > 0) {
                        return filtrados.map(f => (
                          <div key={f.id} onMouseDown={() => { setFornecedorId(f.id); setFornecedorNome(f.nome); setFornecedorBusca(f.nome); setMostrarDropdown(false); setMostrarCadastrar(false) }}
                            style={{ padding: '10px 14px', fontSize: 13, cursor: 'pointer', borderBottom: '1px solid #f0eeea' }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#f8f7f4')}
                            onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
                            {f.nome}
                          </div>
                        ))
                      }
                      return (
                        <div style={{ padding: '12px 14px' }}>
                          <div style={{ fontSize: 13, color: C.txtSub, marginBottom: 10 }}>Fornecedor "<strong>{fornecedorBusca}</strong>" não encontrado.</div>
                          <button type="button" onMouseDown={() => { setNovoFornNome(fornecedorBusca); setMostrarCadastrar(true); setMostrarDropdown(false) }}
                            style={{ padding: '7px 14px', background: C.laranja, color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                            + Cadastrar "{fornecedorBusca}"
                          </button>
                        </div>
                      )
                    })()}
                  </div>
                )}

                {mostrarCadastrar && (
                  <div style={{ marginTop: 8, background: C.bg, border: `1px solid ${C.borda}`, borderRadius: 10, padding: '14px 16px' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.txt, marginBottom: 12 }}>Cadastrar novo fornecedor</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                      <div>
                        <label style={labelStyle}>Nome *</label>
                        <input value={novoFornNome} onChange={e => setNovoFornNome(e.target.value)} placeholder="Nome do fornecedor" style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>CNPJ</label>
                        <input value={novoFornCnpj} onChange={e => setNovoFornCnpj(e.target.value)} placeholder="00.000.000/0001-00" style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>E-mail</label>
                        <input type="email" value={novoFornEmail} onChange={e => setNovoFornEmail(e.target.value)} placeholder="email@fornecedor.com" style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>Telefone</label>
                        <input value={novoFornTelefone} onChange={e => setNovoFornTelefone(e.target.value)} placeholder="(00) 00000-0000" style={inputStyle} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" onClick={() => { setMostrarCadastrar(false); setNovoFornNome('') }}
                        style={{ padding: '7px 14px', border: `1px solid ${C.borda}`, borderRadius: 7, fontSize: 12, background: '#fff', cursor: 'pointer' }}>Cancelar</button>
                      <button type="button" onClick={handleCadastrarFornecedor} disabled={salvandoForn}
                        style={{ padding: '7px 14px', background: C.laranja, color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: salvandoForn ? 'not-allowed' : 'pointer', opacity: salvandoForn ? 0.7 : 1 }}>
                        {salvandoForn ? 'Salvando...' : 'Salvar fornecedor'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label style={labelStyle}>Data da compra *</label>
                <input type="date" value={dataCompra} onChange={e => setDataCompra(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Número da NF</label>
                <input type="text" value={numeroNF} onChange={e => setNumeroNF(e.target.value)} placeholder="Ex: 001234" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Frete R$</label>
                <input type="text" inputMode="numeric" value={frete} onKeyDown={handleFreteKey} onChange={() => {}} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Outros custos R$</label>
                <input type="text" inputMode="numeric" value={outrosCustos} onKeyDown={handleOutrosKey} onChange={() => {}} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Descrição outros custos</label>
                <input type="text" value={outrosDesc} onChange={e => setOutrosDesc(e.target.value)} placeholder="Ex: Seguro transporte" style={inputStyle} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Nota Fiscal</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {([
                    { value: 'sem_chave', label: 'Tem NF-e (vincular depois)' },
                    { value: 'sem_nota',  label: 'Sem nota fiscal' },
                  ] as const).map(op => (
                    <label key={op.value} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, padding: '6px 12px', border: `0.5px solid ${statusNfe === op.value ? C.laranja : C.borda}`, borderRadius: 8, background: statusNfe === op.value ? '#FEF3EA' : 'transparent', color: statusNfe === op.value ? C.laranja : C.txt }}>
                      <input type="radio" name="status_nfe" value={op.value} checked={statusNfe === op.value} onChange={e => setStatusNfe(e.target.value as 'sem_chave' | 'sem_nota')} style={{ display: 'none' }} />
                      {op.label}
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Observações</label>
                <input type="text" value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Opcional" style={inputStyle} />
              </div>
            </div>
          </div>

          {/* Itens */}
          <div style={cardStyle}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '700' }}>Itens da compra</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto', gap: '10px', alignItems: 'end', marginBottom: '14px' }}>
              <div style={{ position: 'relative' }}>
                <label style={labelStyle}>Produto</label>
                <input
                  type="text"
                  value={produtoBusca}
                  onChange={e => {
                    const v = e.target.value
                    setProdutoBusca(v)
                    setProdutoId('')
                    setProdutoSelecionado(null)
                    setMostrarDropdownProd(v.length > 0)
                  }}
                  onFocus={() => { if (produtoBusca.length > 0) setMostrarDropdownProd(true) }}
                  onBlur={() => setTimeout(() => setMostrarDropdownProd(false), 200)}
                  placeholder="Digite para buscar produto..."
                  style={{ ...inputStyle, borderColor: produtoSelecionado ? '#1D9E75' : undefined }}
                  autoComplete="off"
                />
                {produtoSelecionado && (
                  <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#1D9E75' }}>✓</span>
                )}

                {mostrarDropdownProd && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: '#fff', border: `1px solid ${C.borda}`, borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: 200, overflowY: 'auto' }}>
                    {(() => {
                      const filtrados = produtos.filter(p => p.nome.toLowerCase().includes(produtoBusca.toLowerCase()))
                      if (filtrados.length > 0) {
                        return filtrados.map(p => (
                          <div key={p.id} onMouseDown={() => { setProdutoId(p.id); setProdutoBusca(`${p.nome} (${p.unidade})`); setProdutoSelecionado(p); setMostrarDropdownProd(false) }}
                            style={{ padding: '10px 14px', fontSize: 13, cursor: 'pointer', borderBottom: '1px solid #f0eeea' }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#f8f7f4')}
                            onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
                            <span style={{ fontWeight: 500 }}>{p.nome}</span>
                            <span style={{ color: '#9ca3af', marginLeft: 6, fontSize: 11 }}>{p.unidade}</span>
                          </div>
                        ))
                      }
                      return (
                        <div style={{ padding: '12px 14px' }}>
                          <div style={{ fontSize: 13, color: C.txtSub, marginBottom: 8 }}>Produto "<strong>{produtoBusca}</strong>" não encontrado.</div>
                          <button type="button" onMouseDown={() => router.push('/loja/produtos/novo')}
                            style={{ fontSize: 12, color: C.laranja, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                            + Cadastrar novo produto →
                          </button>
                        </div>
                      )
                    })()}
                  </div>
                )}
              </div>
              <div>
                <label style={labelStyle}>Quantidade</label>
                <input type="text" inputMode="decimal" value={quantidade} onChange={e => setQuantidade(e.target.value)} placeholder="0" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Preço unit. R$</label>
                <input type="text" inputMode="numeric" value={precoUnit} onKeyDown={handlePrecoKey} onChange={() => {}} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Nº lote</label>
                <input type="text" value={numeroLote} onChange={e => setNumeroLote(e.target.value)} placeholder="Opcional" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Validade</label>
                <input type="date" value={dataValidade} onChange={e => setDataValidade(e.target.value)} style={inputStyle} />
              </div>
              <Btn onClick={adicionarItem} style={{ background: C.laranja, color: '#fff', border: `1.5px solid ${C.laranja}`, height: '38px' }}>
                + Adicionar
              </Btn>
            </div>

            {itens.length > 0 && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: 500 }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${C.borda}` }}>
                      {['Produto', 'Qtd', 'Preço unit.', 'Subtotal', 'Lote', 'Validade', ''].map(h => (
                        <th key={h} style={{ padding: '7px 8px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: C.txtSub }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {itens.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f0ede8' }}>
                        <td style={{ padding: '8px', fontWeight: '600' }}>{item.produto_nome}</td>
                        <td style={{ padding: '8px' }}>{item.quantidade} {item.produto_unidade}</td>
                        <td style={{ padding: '8px' }}>{fmtReal(item.preco_unitario)}</td>
                        <td style={{ padding: '8px', fontWeight: '600' }}>{fmtReal(item.quantidade * item.preco_unitario)}</td>
                        <td style={{ padding: '8px', color: C.txtSub }}>{item.numero_lote || '—'}</td>
                        <td style={{ padding: '8px', color: C.txtSub }}>{item.data_validade ? (() => { const [y,m,d] = item.data_validade.split('-'); return `${d}/${m}/${y}` })() : '—'}</td>
                        <td style={{ padding: '8px' }}>
                          <Btn variante="cinza" tamanho="sm" onClick={() => removerItem(idx)} style={{ color: '#dc2626' }}>✕</Btn>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Resumo e rateio */}
          {itens.length > 0 && (
            <div style={cardStyle}>
              <h2 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '700' }}>Resumo da compra</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '16px' }}>
                {[
                  { label: 'Valor mercadorias', value: fmtReal(totalMercadorias) },
                  { label: 'Frete',             value: fmtReal(freteNum) },
                  { label: 'Outros custos',     value: fmtReal(outrosNum) },
                  { label: 'Total geral',       value: fmtReal(totalGeral), bold: true, color: C.laranja },
                ].map(({ label, value, bold, color }) => (
                  <div key={label} style={{ background: C.bg, borderRadius: '8px', padding: '12px 14px' }}>
                    <div style={{ fontSize: '11px', color: C.txtSub, marginBottom: '4px' }}>{label}</div>
                    <div style={{ fontSize: '16px', fontWeight: bold ? '700' : '600', color: color ?? C.txt }}>{value}</div>
                  </div>
                ))}
              </div>

              <h3 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: '700', color: C.txtSub }}>Rateio por item</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: 500 }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${C.borda}` }}>
                      {['Produto', 'Valor item', 'Frete rateado', 'Outros rateados', 'Custo final/unid'].map(h => (
                        <th key={h} style={{ padding: '7px 8px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: C.txtSub }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {itensComRateio.map((i, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f0ede8' }}>
                        <td style={{ padding: '8px', fontWeight: '600' }}>{i.produto_nome}</td>
                        <td style={{ padding: '8px' }}>{fmtReal(i.valorItem)}</td>
                        <td style={{ padding: '8px', color: C.txtSub }}>{fmtReal(i.freteRat)}</td>
                        <td style={{ padding: '8px', color: C.txtSub }}>{fmtReal(i.outrosRat)}</td>
                        <td style={{ padding: '8px', fontWeight: '700', color: C.laranja }}>{fmtReal(i.custoFinal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Botão confirmar */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <Link href="/loja/compras" style={{ padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', border: `1px solid ${C.borda}`, color: C.txtSub, textDecoration: 'none', background: '#fff' }}>
              Cancelar
            </Link>
            <Btn onClick={handleSubmit} disabled={salvando || itens.length === 0 || !fornecedorId} style={{ background: C.laranja, color: '#fff', border: `1.5px solid ${C.laranja}` }}>
              {salvando ? 'Registrando...' : 'Confirmar compra'}
            </Btn>
          </div>
        </div>
      </div>
    </>
  )
}
