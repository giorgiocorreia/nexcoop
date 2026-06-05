'use client'

import { useEffect, useState } from 'react'
import {
  getSessaoAberta, abrirCaixa, fecharCaixa,
  buscarProdutor, getContaProdutor, getExtrato,
  registrarEntrega, registrarConversaoESaque,
  registrarSaqueFinanceiro, listarSolicitacoesPendentes
} from '@/lib/comercializacao/caixa.actions'
import { listarProdutos } from '@/lib/comercializacao/produtos.actions'
import { getCotacaoHoje } from '@/lib/comercializacao/cotacoes.actions'

type Sessao = { id: string; data: string; saldo_inicial_especie: number; total_saidas_especie: number; total_pix: number }
type ProdutorBusca = { id: string; nome: string; cpf: string | null; telefone: string | null; tipo: string; chave_pix: string | null }
type SaldoProduto = { produto_id: string; quantidade: number; produtos: { nome: string; unidade: string } }
type Conta = { id: string; saldo_financeiro: number; saldos_produto: SaldoProduto[] }
type Movimentacao = { id: string; tipo: string; quantidade_produto: number | null; valor_financeiro: number | null; forma_pagamento: string | null; created_at: string; produtos: { nome: string; unidade: string } | null }
type Produto = { id: string; nome: string; unidade: string }
type Solicitacao = { id: string; quantidade_kg: number; valor_estimado: number; forma_pagamento: string; chave_pix: string | null; produtores: { nome: string; telefone: string | null }; produtos: { nome: string; unidade: string }; cotacoes: { preco_cooperado: number } }

const TIPO_LABEL: Record<string, string> = {
  entrega: 'Entrega',
  conversao: 'Conversão',
  saque_especie: 'Saque espécie',
  saque_pix: 'Saque Pix',
  ajuste_produto: 'Ajuste produto',
  ajuste_financeiro: 'Ajuste financeiro',
  estorno: 'Estorno',
  compra_loja: 'Compra loja'
}

export default function CaixaPage() {
  const [sessao, setSessao] = useState<Sessao | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [aba, setAba] = useState<'buscar' | 'solicitacoes' | 'operacoes' | 'fechar'>('buscar')

  // Abertura de caixa
  const [saldoInicial, setSaldoInicial] = useState('')
  const [abrindo, setAbrindo] = useState(false)

  // Busca de produtor
  const [termoBusca, setTermoBusca] = useState('')
  const [resultadosBusca, setResultadosBusca] = useState<ProdutorBusca[]>([])
  const [produtorSelecionado, setProdutorSelecionado] = useState<ProdutorBusca | null>(null)
  const [conta, setConta] = useState<Conta | null>(null)
  const [extrato, setExtrato] = useState<Movimentacao[]>([])

  // Operação selecionada
  const [operacao, setOperacao] = useState<'entrega' | 'receber' | 'saque' | null>(null)
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [formEntrega, setFormEntrega] = useState({ produto_id: '', quantidade: '', observacoes: '' })
  const [formReceber, setFormReceber] = useState({ produto_id: '', quantidade: '', preco_kg: '', forma_pagamento: 'especie' as 'especie' | 'pix', chave_pix: '' })
  const [formSaque, setFormSaque] = useState({ valor: '', forma_pagamento: 'especie' as 'especie' | 'pix', chave_pix: '' })
  const [statusOp, setStatusOp] = useState<'idle' | 'salvando' | 'sucesso' | 'erro'>('idle')
  const [erroMsg, setErroMsg] = useState('')

  // Solicitações
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([])

  // Fechar caixa
  const [saldoFinal, setSaldoFinal] = useState('')
  const [obsFechamento, setObsFechamento] = useState('')
  const [fechando, setFechando] = useState(false)
  const [resumoFechamento, setResumoFechamento] = useState<Sessao | null>(null)

  useEffect(() => { init() }, [])

  async function init() {
    setCarregando(true)
    const [s, p] = await Promise.all([getSessaoAberta(), listarProdutos()])
    setSessao(s)
    const ativos = (p as Produto[]).filter((pr) => (pr as any).ativo !== false)
    setProdutos(ativos)
    if (ativos.length > 0) setFormEntrega(f => ({ ...f, produto_id: ativos[0].id }))
    if (s) {
      const sols = await listarSolicitacoesPendentes()
      setSolicitacoes((sols ?? []) as unknown as Solicitacao[])
    }
    setCarregando(false)
  }

  async function handleAbrirCaixa() {
    if (!saldoInicial) return
    setAbrindo(true)
    try {
      await abrirCaixa(parseFloat(saldoInicial))
      await init()
    } finally {
      setAbrindo(false)
    }
  }

  async function handleBuscar() {
    if (!termoBusca.trim()) return
    const r = await buscarProdutor(termoBusca)
    setResultadosBusca((r ?? []) as ProdutorBusca[])
  }

  async function selecionarProdutor(p: ProdutorBusca) {
    setProdutorSelecionado(p)
    setResultadosBusca([])
    setTermoBusca('')
    const c = await getContaProdutor(p.id)
    setConta(c as unknown as Conta | null)
    if (c) {
      const ext = await getExtrato((c as unknown as Conta).id)
      setExtrato((ext ?? []) as unknown as Movimentacao[])
    }
    setOperacao(null)
    setFormReceber(f => ({ ...f, chave_pix: p.chave_pix ?? '' }))
  }

  async function handleEntrega() {
    if (!sessao || !conta || !formEntrega.produto_id || !formEntrega.quantidade) return
    setStatusOp('salvando')
    try {
      await registrarEntrega({
        sessao_id: sessao.id,
        produtor_id: produtorSelecionado!.id,
        conta_id: conta.id,
        produto_id: formEntrega.produto_id,
        quantidade_produto: parseFloat(formEntrega.quantidade),
        observacoes: formEntrega.observacoes
      })
      setFormEntrega(f => ({ ...f, quantidade: '', observacoes: '' }))
      await recarregarConta()
      setStatusOp('sucesso')
      setTimeout(() => setStatusOp('idle'), 3000)
    } catch (e: any) {
      setErroMsg(e.message); setStatusOp('erro')
    }
  }

  async function handleReceber() {
    if (!sessao || !conta || !formReceber.produto_id || !formReceber.quantidade || !formReceber.preco_kg) return
    const qtd = parseFloat(formReceber.quantidade)
    const preco = parseFloat(formReceber.preco_kg)
    const valor = parseFloat((qtd * preco).toFixed(2))
    setStatusOp('salvando')
    try {
      await registrarConversaoESaque({
        sessao_id: sessao.id,
        produtor_id: produtorSelecionado!.id,
        conta_id: conta.id,
        produto_id: formReceber.produto_id,
        quantidade_produto: qtd,
        preco_unitario: preco,
        valor_financeiro: valor,
        forma_pagamento: formReceber.forma_pagamento,
        chave_pix: formReceber.chave_pix || undefined
      })
      setFormReceber(f => ({ ...f, quantidade: '', preco_kg: '' }))
      await recarregarConta()
      setStatusOp('sucesso')
      setTimeout(() => setStatusOp('idle'), 3000)
    } catch (e: any) {
      setErroMsg(e.message); setStatusOp('erro')
    }
  }

  async function handleSaque() {
    if (!sessao || !conta || !formSaque.valor) return
    setStatusOp('salvando')
    try {
      await registrarSaqueFinanceiro({
        sessao_id: sessao.id,
        conta_id: conta.id,
        valor_financeiro: parseFloat(formSaque.valor),
        forma_pagamento: formSaque.forma_pagamento,
        chave_pix: formSaque.chave_pix || undefined
      })
      setFormSaque(f => ({ ...f, valor: '' }))
      await recarregarConta()
      setStatusOp('sucesso')
      setTimeout(() => setStatusOp('idle'), 3000)
    } catch (e: any) {
      setErroMsg(e.message); setStatusOp('erro')
    }
  }

  async function recarregarConta() {
    if (!produtorSelecionado) return
    const c = await getContaProdutor(produtorSelecionado.id)
    setConta(c as unknown as Conta | null)
    if (c) {
      const ext = await getExtrato((c as unknown as Conta).id)
      setExtrato((ext ?? []) as unknown as Movimentacao[])
    }
  }

  async function handleFecharCaixa() {
    if (!sessao || !saldoFinal) return
    setFechando(true)
    try {
      await fecharCaixa(sessao.id, parseFloat(saldoFinal), obsFechamento)
      setResumoFechamento(sessao)
      setSessao(null)
    } finally {
      setFechando(false)
    }
  }

  async function carregarCotacao(produto_id: string) {
    if (!produto_id) return
    const cot = await getCotacaoHoje(produto_id)
    if (cot) setFormReceber(f => ({ ...f, preco_kg: (cot as any).preco_cooperado.toString() }))
  }

  if (carregando) return <div style={{ padding: '32px' }}>Carregando...</div>

  // Resumo de fechamento
  if (resumoFechamento) return (
    <div style={{ padding: '32px', background: '#f8f7f4', minHeight: '100vh' }}>
      <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '32px', maxWidth: '480px' }}>
        <div style={{ fontSize: '18px', fontWeight: 500, marginBottom: '24px' }}>✓ Caixa fechado</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#6b6b6b' }}>Data</span>
            <span>{new Date(resumoFechamento.data).toLocaleDateString('pt-BR')}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#6b6b6b' }}>Saldo inicial</span>
            <span>R$ {resumoFechamento.saldo_inicial_especie.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#6b6b6b' }}>Saídas espécie</span>
            <span>R$ {(resumoFechamento.total_saidas_especie ?? 0).toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#6b6b6b' }}>Total Pix</span>
            <span>R$ {(resumoFechamento.total_pix ?? 0).toFixed(2)}</span>
          </div>
          <div style={{ borderTop: '1px solid #e5e3dc', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', fontWeight: 500 }}>
            <span>Saldo final espécie</span>
            <span>R$ {parseFloat(saldoFinal).toFixed(2)}</span>
          </div>
        </div>
        <button
          onClick={() => { setResumoFechamento(null); setSaldoFinal(''); setObsFechamento(''); init() }}
          style={{ marginTop: '24px', width: '100%', padding: '10px', background: '#92400e', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}
        >
          Novo dia
        </button>
      </div>
    </div>
  )

  // Caixa fechado
  if (!sessao) return (
    <div style={{ padding: '32px', background: '#f8f7f4', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 500, marginBottom: '24px' }}>Caixa</h1>
      <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '32px', maxWidth: '360px' }}>
        <div style={{ fontWeight: 500, marginBottom: '16px' }}>Abrir caixa</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Saldo inicial em espécie (R$)</label>
            <input
              type="number" step="0.01" placeholder="0,00"
              value={saldoInicial}
              onChange={e => setSaldoInicial(e.target.value)}
              style={{ padding: '8px 12px', border: '1px solid #e5e3dc', borderRadius: '8px', fontSize: '14px' }}
            />
          </div>
          <button
            onClick={handleAbrirCaixa}
            disabled={abrindo || !saldoInicial}
            style={{ padding: '10px', background: '#92400e', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}
          >
            {abrindo ? 'Abrindo...' : 'Abrir caixa'}
          </button>
        </div>
      </div>
    </div>
  )

  // Caixa aberto
  return (
    <div style={{ padding: '32px', background: '#f8f7f4', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 500, margin: 0 }}>Caixa</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '13px', color: '#166534', background: '#dcfce7', padding: '4px 12px', borderRadius: '20px' }}>
            ● Aberto
          </span>
          <span style={{ fontSize: '13px', color: '#6b6b6b' }}>
            Saldo inicial: R$ {sessao.saldo_inicial_especie.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Abas */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '1px solid #e5e3dc' }}>
        {(['buscar', 'solicitacoes', 'operacoes', 'fechar'] as const).map(a => (
          <button key={a} onClick={() => setAba(a)} style={{
            padding: '8px 20px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '14px',
            borderBottom: aba === a ? '2px solid #92400e' : '2px solid transparent',
            color: aba === a ? '#92400e' : '#6b6b6b', fontWeight: aba === a ? 500 : 400,
            marginBottom: '-1px'
          }}>
            {a === 'buscar' ? 'Produtor' : a === 'solicitacoes' ? `Solicitações${solicitacoes.length > 0 ? ` (${solicitacoes.length})` : ''}` : a === 'operacoes' ? 'Operações do dia' : 'Fechar caixa'}
          </button>
        ))}
      </div>

      {/* ABA: BUSCAR PRODUTOR */}
      {aba === 'buscar' && (
        <div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input
              placeholder="Nome ou CPF do produtor..."
              value={termoBusca}
              onChange={e => setTermoBusca(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleBuscar()}
              style={{ flex: 1, maxWidth: '360px', padding: '8px 12px', border: '1px solid #e5e3dc', borderRadius: '8px', fontSize: '14px' }}
            />
            <button onClick={handleBuscar}
              style={{ padding: '8px 20px', background: '#92400e', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>
              Buscar
            </button>
            {produtorSelecionado && (
              <button onClick={() => { setProdutorSelecionado(null); setConta(null); setOperacao(null) }}
                style={{ padding: '8px 16px', border: '1px solid #e5e3dc', borderRadius: '8px', background: '#fff', fontSize: '14px', cursor: 'pointer' }}>
                Limpar
              </button>
            )}
          </div>

          {/* Resultados busca */}
          {resultadosBusca.length > 0 && !produtorSelecionado && (
            <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '8px', marginBottom: '16px', overflow: 'hidden' }}>
              {resultadosBusca.map(p => (
                <button key={p.id} onClick={() => selecionarProdutor(p)} style={{
                  width: '100%', padding: '12px 16px', border: 'none', borderBottom: '1px solid #f0ede8',
                  background: '#fff', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <span style={{ fontSize: '14px', fontWeight: 500 }}>{p.nome}</span>
                  <span style={{ fontSize: '12px', color: '#6b6b6b' }}>
                    {p.cpf ?? ''} · {p.tipo === 'cooperado' ? 'Cooperado' : 'Externo'}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Conta do produtor selecionado */}
          {produtorSelecionado && conta && (
            <div>
              {/* Header produtor */}
              <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: '16px' }}>{produtorSelecionado.nome}</div>
                    <div style={{ fontSize: '13px', color: '#6b6b6b', marginTop: '2px' }}>
                      {produtorSelecionado.cpf ?? ''} · {produtorSelecionado.tipo === 'cooperado' ? 'Cooperado' : 'Externo'}
                      {produtorSelecionado.telefone ? ` · ${produtorSelecionado.telefone}` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {conta.saldos_produto?.filter(s => s.quantidade > 0).map(s => (
                      <div key={s.produto_id} style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '8px', padding: '8px 14px', textAlign: 'center' }}>
                        <div style={{ fontSize: '16px', fontWeight: 600, color: '#92400e' }}>{s.quantidade.toFixed(1)} {s.produtos.unidade}</div>
                        <div style={{ fontSize: '11px', color: '#6b6b6b' }}>{s.produtos.nome}</div>
                      </div>
                    ))}
                    {conta.saldo_financeiro > 0 && (
                      <div style={{ background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '8px 14px', textAlign: 'center' }}>
                        <div style={{ fontSize: '16px', fontWeight: 600, color: '#166534' }}>R$ {conta.saldo_financeiro.toFixed(2)}</div>
                        <div style={{ fontSize: '11px', color: '#6b6b6b' }}>Saldo financeiro</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Botões de operação */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                {(['entrega', 'receber', 'saque'] as const).map(op => (
                  <button key={op} onClick={() => setOperacao(operacao === op ? null : op)} style={{
                    padding: '8px 20px', border: '1px solid #e5e3dc', borderRadius: '8px', fontSize: '14px', cursor: 'pointer',
                    background: operacao === op ? '#92400e' : '#fff',
                    color: operacao === op ? '#fff' : '#1a1a1a'
                  }}>
                    {op === 'entrega' ? '↓ Registrar entrega' : op === 'receber' ? '↑ Pagar produtor' : '$ Saque financeiro'}
                  </button>
                ))}
              </div>

              {statusOp === 'sucesso' && (
                <div style={{ marginBottom: '12px', color: '#166534', fontSize: '13px' }}>Operação registrada com sucesso.</div>
              )}
              {statusOp === 'erro' && (
                <div style={{ marginBottom: '12px', color: '#991b1b', fontSize: '13px' }}>{erroMsg}</div>
              )}

              {/* Formulário Entrega */}
              {operacao === 'entrega' && (
                <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
                  <div style={{ fontWeight: 500, fontSize: '14px', marginBottom: '12px' }}>Registrar entrega</div>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Produto</label>
                      <select value={formEntrega.produto_id} onChange={e => setFormEntrega(f => ({ ...f, produto_id: e.target.value }))}
                        style={{ padding: '8px 12px', border: '1px solid #e5e3dc', borderRadius: '8px', fontSize: '14px' }}>
                        {produtos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                      </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Quantidade (kg)</label>
                      <input type="number" step="0.001" placeholder="0,000" value={formEntrega.quantidade}
                        onChange={e => setFormEntrega(f => ({ ...f, quantidade: e.target.value }))}
                        style={{ padding: '8px 12px', border: '1px solid #e5e3dc', borderRadius: '8px', fontSize: '14px', width: '120px' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '160px' }}>
                      <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Observações</label>
                      <input placeholder="Opcional" value={formEntrega.observacoes}
                        onChange={e => setFormEntrega(f => ({ ...f, observacoes: e.target.value }))}
                        style={{ padding: '8px 12px', border: '1px solid #e5e3dc', borderRadius: '8px', fontSize: '14px' }} />
                    </div>
                    <button onClick={handleEntrega} disabled={statusOp === 'salvando'}
                      style={{ padding: '8px 20px', background: '#92400e', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>
                      {statusOp === 'salvando' ? 'Salvando...' : 'Confirmar'}
                    </button>
                  </div>
                </div>
              )}

              {/* Formulário Receber (conversão + saque) */}
              {operacao === 'receber' && (
                <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
                  <div style={{ fontWeight: 500, fontSize: '14px', marginBottom: '12px' }}>Pagar produtor</div>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Produto</label>
                      <select value={formReceber.produto_id}
                        onChange={e => { setFormReceber(f => ({ ...f, produto_id: e.target.value })); carregarCotacao(e.target.value) }}
                        style={{ padding: '8px 12px', border: '1px solid #e5e3dc', borderRadius: '8px', fontSize: '14px' }}>
                        <option value="">Selecionar...</option>
                        {conta.saldos_produto?.filter(s => s.quantidade > 0).map(s => (
                          <option key={s.produto_id} value={s.produto_id}>{s.produtos.nome} ({s.quantidade.toFixed(1)} {s.produtos.unidade})</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Quantidade (kg)</label>
                      <input type="number" step="0.001" placeholder="0,000" value={formReceber.quantidade}
                        onChange={e => setFormReceber(f => ({ ...f, quantidade: e.target.value }))}
                        style={{ padding: '8px 12px', border: '1px solid #e5e3dc', borderRadius: '8px', fontSize: '14px', width: '110px' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Preço/kg (R$)</label>
                      <input type="number" step="0.01" placeholder="0,00" value={formReceber.preco_kg}
                        onChange={e => setFormReceber(f => ({ ...f, preco_kg: e.target.value }))}
                        style={{ padding: '8px 12px', border: '1px solid #e5e3dc', borderRadius: '8px', fontSize: '14px', width: '100px' }} />
                    </div>
                    {formReceber.quantidade && formReceber.preco_kg && (
                      <div style={{ padding: '8px 14px', background: '#fef3c7', borderRadius: '8px', fontSize: '14px', fontWeight: 500, color: '#92400e' }}>
                        = R$ {(parseFloat(formReceber.quantidade) * parseFloat(formReceber.preco_kg)).toFixed(2)}
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Pagamento</label>
                      <select value={formReceber.forma_pagamento} onChange={e => setFormReceber(f => ({ ...f, forma_pagamento: e.target.value as 'especie' | 'pix' }))}
                        style={{ padding: '8px 12px', border: '1px solid #e5e3dc', borderRadius: '8px', fontSize: '14px' }}>
                        <option value="especie">Espécie</option>
                        <option value="pix">Pix</option>
                      </select>
                    </div>
                    {formReceber.forma_pagamento === 'pix' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Chave Pix</label>
                        <input value={formReceber.chave_pix} onChange={e => setFormReceber(f => ({ ...f, chave_pix: e.target.value }))}
                          style={{ padding: '8px 12px', border: '1px solid #e5e3dc', borderRadius: '8px', fontSize: '14px', width: '180px' }} />
                      </div>
                    )}
                    <button onClick={handleReceber} disabled={statusOp === 'salvando'}
                      style={{ padding: '8px 20px', background: '#92400e', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>
                      {statusOp === 'salvando' ? 'Salvando...' : 'Confirmar pagamento'}
                    </button>
                  </div>
                </div>
              )}

              {/* Formulário Saque financeiro */}
              {operacao === 'saque' && (
                <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
                  <div style={{ fontWeight: 500, fontSize: '14px', marginBottom: '12px' }}>Saque de saldo financeiro</div>
                  <div style={{ fontSize: '13px', color: '#6b6b6b', marginBottom: '12px' }}>
                    Saldo disponível: <strong style={{ color: '#166534' }}>R$ {conta.saldo_financeiro.toFixed(2)}</strong>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Valor (R$)</label>
                      <input type="number" step="0.01" placeholder="0,00" value={formSaque.valor}
                        onChange={e => setFormSaque(f => ({ ...f, valor: e.target.value }))}
                        style={{ padding: '8px 12px', border: '1px solid #e5e3dc', borderRadius: '8px', fontSize: '14px', width: '130px' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Pagamento</label>
                      <select value={formSaque.forma_pagamento} onChange={e => setFormSaque(f => ({ ...f, forma_pagamento: e.target.value as 'especie' | 'pix' }))}
                        style={{ padding: '8px 12px', border: '1px solid #e5e3dc', borderRadius: '8px', fontSize: '14px' }}>
                        <option value="especie">Espécie</option>
                        <option value="pix">Pix</option>
                      </select>
                    </div>
                    {formSaque.forma_pagamento === 'pix' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Chave Pix</label>
                        <input value={formSaque.chave_pix} onChange={e => setFormSaque(f => ({ ...f, chave_pix: e.target.value }))}
                          style={{ padding: '8px 12px', border: '1px solid #e5e3dc', borderRadius: '8px', fontSize: '14px', width: '180px' }} />
                      </div>
                    )}
                    <button onClick={handleSaque} disabled={statusOp === 'salvando'}
                      style={{ padding: '8px 20px', background: '#92400e', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>
                      {statusOp === 'salvando' ? 'Salvando...' : 'Confirmar saque'}
                    </button>
                  </div>
                </div>
              )}

              {/* Extrato do produtor */}
              {extrato.length > 0 && (
                <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', overflow: 'hidden' }}>
                  <div style={{ padding: '14px 16px', borderBottom: '1px solid #e5e3dc', fontSize: '13px', fontWeight: 500 }}>Extrato recente</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <tbody>
                      {extrato.slice(0, 10).map(m => (
                        <tr key={m.id} style={{ borderBottom: '1px solid #f0ede8' }}>
                          <td style={{ padding: '10px 16px', color: '#6b6b6b' }}>
                            {new Date(m.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td style={{ padding: '10px 16px' }}>{TIPO_LABEL[m.tipo] ?? m.tipo}</td>
                          <td style={{ padding: '10px 16px', color: '#6b6b6b' }}>
                            {m.quantidade_produto ? `${m.quantidade_produto} ${m.produtos?.unidade ?? 'kg'}` : ''}
                          </td>
                          <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 500,
                            color: m.valor_financeiro ? (m.tipo === 'conversao' ? '#166534' : '#991b1b') : '#1a1a1a' }}>
                            {m.valor_financeiro ? `R$ ${Math.abs(m.valor_financeiro).toFixed(2)}` : ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ABA: SOLICITAÇÕES */}
      {aba === 'solicitacoes' && (
        <div>
          {solicitacoes.length === 0 ? (
            <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '32px', textAlign: 'center', color: '#6b6b6b', fontSize: '14px' }}>
              Nenhuma solicitação pendente.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {solicitacoes.map(s => (
                <div key={s.id} style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: '15px' }}>{s.produtores?.nome}</div>
                      <div style={{ fontSize: '13px', color: '#6b6b6b', marginTop: '4px' }}>
                        {s.quantidade_kg} kg de {s.produtos?.nome} · R$ {s.valor_estimado.toFixed(2)} · {s.forma_pagamento === 'pix' ? `Pix: ${s.chave_pix}` : 'Espécie'}
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        const p = await buscarProdutor(s.produtores?.nome ?? '')
                        if (p && p[0]) { await selecionarProdutor(p[0] as ProdutorBusca); setAba('buscar') }
                      }}
                      style={{ padding: '8px 16px', background: '#92400e', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>
                      Atender
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ABA: OPERAÇÕES DO DIA */}
      {aba === 'operacoes' && (
        <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e3dc', background: '#fafaf8' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500 }}>Horário</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500 }}>Operação</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 500 }}>Quantidade</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 500 }}>Valor</th>
              </tr>
            </thead>
            <tbody>
              <tr><td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: '#6b6b6b' }}>Nenhuma operação registrada ainda.</td></tr>
            </tbody>
          </table>
        </div>
      )}

      {/* ABA: FECHAR CAIXA */}
      {aba === 'fechar' && (
        <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '28px', maxWidth: '400px' }}>
          <div style={{ fontWeight: 500, fontSize: '16px', marginBottom: '20px' }}>Fechar caixa</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: '#6b6b6b' }}>Saldo inicial</span>
              <span>R$ {sessao.saldo_inicial_especie.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: '#6b6b6b' }}>Saídas espécie</span>
              <span>R$ {(sessao.total_saidas_especie ?? 0).toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: '#6b6b6b' }}>Total Pix</span>
              <span>R$ {(sessao.total_pix ?? 0).toFixed(2)}</span>
            </div>
            <div style={{ borderTop: '1px solid #e5e3dc', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Saldo final em espécie (R$)</label>
              <input type="number" step="0.01" placeholder="0,00" value={saldoFinal}
                onChange={e => setSaldoFinal(e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid #e5e3dc', borderRadius: '8px', fontSize: '14px' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Observações</label>
              <input placeholder="Opcional" value={obsFechamento}
                onChange={e => setObsFechamento(e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid #e5e3dc', borderRadius: '8px', fontSize: '14px' }} />
            </div>
            <button onClick={handleFecharCaixa} disabled={fechando || !saldoFinal}
              style={{ padding: '10px', background: '#92400e', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', marginTop: '8px' }}>
              {fechando ? 'Fechando...' : 'Fechar caixa'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
