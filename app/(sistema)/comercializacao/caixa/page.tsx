'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  getSessaoAberta, abrirCaixa, fecharCaixa,
  buscarProdutor, getContaProdutor, getExtrato,
  registrarEntrega, registrarEntregaComRateio,
  registrarConversaoESaque, registrarSaqueFinanceiro,
  listarSolicitacoesPendentes, getProdutorParaRateio,
  getOperacoesHoje,
  type ParticipanteRateio
} from '@/lib/comercializacao/caixa.actions'
import { listarProdutos } from '@/lib/comercializacao/produtos.actions'
import { getCotacaoHoje } from '@/lib/comercializacao/cotacoes.actions'

type Sessao = { id: string; data: string; saldo_inicial_especie: number; total_saidas_especie: number; total_pix: number }
type ProdutorBusca = { id: string; nome: string; cpf: string | null; telefone: string | null; tipo: string; chave_pix: string | null; tipo_posse?: string | null; percentual_posse?: number | null }
type SaldoProduto = { produto_id: string; quantidade: number; produtos: { nome: string; unidade: string } }
type Conta = { id: string; saldo_financeiro: number; saldos_produto: SaldoProduto[] }
type Movimentacao = { id: string; tipo: string; quantidade_produto: number | null; valor_financeiro: number | null; forma_pagamento: string | null; created_at: string; produtos: { nome: string; unidade: string } | null }
type Produto = { id: string; nome: string; unidade: string }
type Solicitacao = { id: string; quantidade_kg: number; valor_estimado: number; forma_pagamento: string; chave_pix: string | null; produtores: { nome: string; telefone: string | null }; produtos: { nome: string; unidade: string }; cotacoes: { preco_cooperado: number } }
type OperacaoDia = { id: string; tipo: string; quantidade_produto: number | null; valor_financeiro: number | null; forma_pagamento: string | null; observacoes: string | null; created_at: string; produtos: { nome: string; unidade: string } | null; contas_produtor: { produtor_id: string; produtores: { nome: string } | null } | null }

type ParticipanteModal = {
  produtor_id: string
  nome: string
  conta_id: string
  percentual: number
  quantidade_rateada: number
}

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

function formatarKg(v: number): { inteiro: string; decimal: string } {
  const s = v.toFixed(3).replace(/\.?0+$/, '')
  const [int, dec] = s.split('.')
  return { inteiro: int, decimal: dec ? `,${dec}` : '' }
}

function KgDisplay({ valor, fontSize = 16, cor = '#92400e' }: { valor: number; fontSize?: number; cor?: string }) {
  const { inteiro, decimal } = formatarKg(valor)
  return (
    <span style={{ color: cor }}>
      <span style={{ fontSize, fontWeight: 600 }}>{inteiro}</span>
      <span style={{ fontSize: fontSize * 0.6, fontWeight: 600 }}>{decimal}</span>
      <span style={{ fontSize: fontSize * 0.55, fontWeight: 400, marginLeft: 2 }}> kg</span>
    </span>
  )
}

function mascararCPF(v: string) {
  return v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

function mascararCNPJ(v: string) {
  return v.replace(/\D/g, '').slice(0, 14)
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}

function mascararTelefone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3')
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3')
}

type TipoPix = 'cpf' | 'cnpj' | 'telefone' | 'email' | 'aleatoria' | ''

function detectarTipoPix(v: string): TipoPix {
  if (!v) return ''
  const digits = v.replace(/\D/g, '')
  if (/^[^@]+@[^@]+\.[^@]+$/.test(v)) return 'email'
  if (v.length === 36 && v.includes('-')) return 'aleatoria'
  if (digits.length === 14) return 'cnpj'
  if (digits.length === 11) return 'cpf'
  if (digits.length <= 11) return 'telefone'
  return ''
}

function aplicarMascaraPix(raw: string, tipo: TipoPix): string {
  if (tipo === 'cpf') return mascararCPF(raw)
  if (tipo === 'cnpj') return mascararCNPJ(raw)
  if (tipo === 'telefone') return mascararTelefone(raw)
  return raw
}

function labelTipoPix(tipo: TipoPix): string {
  const labels: Record<string, string> = { cpf: 'CPF', cnpj: 'CNPJ', telefone: 'Telefone', email: 'E-mail', aleatoria: 'Chave aleatória' }
  return labels[tipo] ?? 'Chave Pix'
}

function isCPFInput(v: string) {
  return /^[\d.\-]+$/.test(v) && v.replace(/\D/g, '').length >= 3
}

function formatarBuscaCPF(v: string) {
  return mascararCPF(v.replace(/\D/g, '').slice(0, 11))
}

function PixInput({ value, onChange, style }: { value: string; onChange: (v: string) => void; style?: React.CSSProperties }) {
  const tipo = detectarTipoPix(value)
  const label = tipo ? labelTipoPix(tipo) : 'Chave Pix'
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
    const t = detectarTipoPix(raw)
    onChange(aplicarMascaraPix(raw, t))
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <label style={{ fontSize: '12px', color: '#6b6b6b' }}>
        {label}
        {tipo && <span style={{ marginLeft: '6px', fontSize: '11px', color: '#92400e', background: '#fef3c7', padding: '1px 6px', borderRadius: '4px' }}>{label}</span>}
      </label>
      <input value={value} onChange={handleChange} placeholder="CPF, CNPJ, telefone, e-mail ou chave aleatória" style={style} />
    </div>
  )
}

export default function CaixaPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [sessao, setSessao] = useState<Sessao | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [modalFechar, setModalFechar] = useState(false)
  const [aba, setAba] = useState<'buscar' | 'solicitacoes' | 'operacoes' | 'fechar'>('buscar')
  const [saldoInicial, setSaldoInicial] = useState('')
  const [abrindo, setAbrindo] = useState(false)
  const [termoBusca, setTermoBusca] = useState('')
  const [resultadosBusca, setResultadosBusca] = useState<ProdutorBusca[]>([])
  const [produtorSelecionado, setProdutorSelecionado] = useState<ProdutorBusca | null>(null)
  const [conta, setConta] = useState<Conta | null>(null)
  const [extrato, setExtrato] = useState<Movimentacao[]>([])
  const [operacao, setOperacao] = useState<'entrega' | 'receber' | 'saque' | null>(null)
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [formEntrega, setFormEntrega] = useState({ produto_id: '', quantidade: '', observacoes: '' })
  const [formReceber, setFormReceber] = useState({ produto_id: '', quantidade: '', preco_kg: '', forma_pagamento: 'especie' as 'especie' | 'pix', chave_pix: '' })
  const [formSaque, setFormSaque] = useState({ valor: '', forma_pagamento: 'especie' as 'especie' | 'pix', chave_pix: '' })
  const [statusOp, setStatusOp] = useState<'idle' | 'salvando' | 'sucesso' | 'erro'>('idle')
  const [erroMsg, setErroMsg] = useState('')
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([])
  const [operacoesDia, setOperacoesDia] = useState<OperacaoDia[]>([])
  const [carregandoOps, setCarregandoOps] = useState(false)
  const [saldoFinal, setSaldoFinal] = useState('')
  const [obsFechamento, setObsFechamento] = useState('')
  const [fechando, setFechando] = useState(false)
  const [resumoFechamento, setResumoFechamento] = useState<Sessao | null>(null)
  const [modalRateio, setModalRateio] = useState(false)
  const [participantes, setParticipantes] = useState<ParticipanteModal[]>([])
  const [buscaRateio, setBuscaRateio] = useState('')
  const [resultadosBuscaRateio, setResultadosBuscaRateio] = useState<ProdutorBusca[]>([])
  const [salvandoRateio, setSalvandoRateio] = useState(false)
  const [erroRateio, setErroRateio] = useState('')

  useEffect(() => { init() }, [])
  useEffect(() => { if (aba === 'fechar') recarregarSessao() }, [aba])
  useEffect(() => { if (aba === 'operacoes' && sessao) carregarOperacoesDia() }, [aba, sessao])
  useEffect(() => {
    const produtorId = searchParams.get('produtor_id')
    const acao = searchParams.get('acao') as 'entrega' | 'receber' | 'saque' | null
    if (produtorId && sessao) carregarProdutorPorId(produtorId, acao)
  }, [searchParams, sessao])

  async function carregarProdutorPorId(produtorId: string, acao: 'entrega' | 'receber' | 'saque' | null) {
    const c = await getContaProdutor(produtorId)
    if (!c) return
    const p: ProdutorBusca = {
      id: produtorId,
      nome: (c as any).produtores?.nome ?? '',
      cpf: (c as any).produtores?.cpf ?? null,
      telefone: (c as any).produtores?.telefone ?? null,
      tipo: (c as any).produtores?.tipo ?? 'externo',
      chave_pix: (c as any).produtores?.chave_pix ?? null,
    }
    setProdutorSelecionado(p)
    setConta(c as unknown as Conta)
    const ext = await getExtrato((c as any).id)
    setExtrato((ext ?? []) as unknown as Movimentacao[])
    if (acao) setOperacao(acao)
    if (acao === 'receber' && (c as any).produtores?.chave_pix) {
      setFormReceber(f => ({ ...f, chave_pix: (c as any).produtores?.chave_pix ?? '' }))
    }
  }

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

  async function carregarOperacoesDia() {
    if (!sessao) return
    setCarregandoOps(true)
    try {
      const ops = await getOperacoesHoje(sessao.id)
      setOperacoesDia((ops ?? []) as unknown as OperacaoDia[])
    } finally {
      setCarregandoOps(false)
    }
  }

  function handleTermoBuscaChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    setBusca(isCPFInput(v) ? formatarBuscaCPF(v) : v)
  }

  function setBusca(v: string) { setTermoBusca(v) }

  async function handleBuscar() {
    if (!termoBusca.trim()) return
    const termoLimpo = isCPFInput(termoBusca) ? termoBusca.replace(/\D/g, '') : termoBusca
    const r = await buscarProdutor(termoLimpo)
    setResultadosBusca((r ?? []) as ProdutorBusca[])
  }

  async function handleAbrirCaixa() {
    if (!saldoInicial) return
    setAbrindo(true)
    try { await abrirCaixa(parseFloat(saldoInicial)); await init() }
    finally { setAbrindo(false) }
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

  async function abrirModalRateio() {
    if (!produtorSelecionado || !conta || !formEntrega.quantidade) return
    const qtdTotal = parseFloat(formEntrega.quantidade)
    if (isNaN(qtdTotal) || qtdTotal <= 0) return
    const dadosProdutor = await getProdutorParaRateio(produtorSelecionado.id)
    const percentualPrincipal = (dadosProdutor?.percentual_posse as number | null) ?? 100
    const participanteInicial: ParticipanteModal = {
      produtor_id: produtorSelecionado.id, nome: produtorSelecionado.nome,
      conta_id: conta.id, percentual: percentualPrincipal,
      quantidade_rateada: parseFloat(((qtdTotal * percentualPrincipal) / 100).toFixed(4))
    }
    setParticipantes([participanteInicial])
    setBuscaRateio(''); setResultadosBuscaRateio([]); setErroRateio(''); setModalRateio(true)
  }

  async function handleEntregaSimples() {
    if (!sessao || !conta || !formEntrega.produto_id || !formEntrega.quantidade) return
    setStatusOp('salvando')
    try {
      await registrarEntrega({
        sessao_id: sessao.id, produtor_id: produtorSelecionado!.id,
        conta_id: conta.id, produto_id: formEntrega.produto_id,
        quantidade_produto: parseFloat(formEntrega.quantidade), observacoes: formEntrega.observacoes
      })
      setFormEntrega(f => ({ ...f, quantidade: '', observacoes: '' }))
      await recarregarConta(); await recarregarSessao()
      setStatusOp('sucesso'); setTimeout(() => setStatusOp('idle'), 3000)
    } catch (e: any) { setErroMsg(e.message); setStatusOp('erro') }
  }

  function atualizarPercentual(index: number, novoPercentual: number) {
    const qtdTotal = parseFloat(formEntrega.quantidade) || 0
    setParticipantes(participantes.map((p, i) =>
      i === index ? { ...p, percentual: novoPercentual, quantidade_rateada: parseFloat(((qtdTotal * novoPercentual) / 100).toFixed(4)) } : p
    ))
  }

  function removerParticipante(index: number) { setParticipantes(p => p.filter((_, i) => i !== index)) }

  async function buscarParaRateio() {
    if (!buscaRateio.trim()) return
    const termoLimpo = isCPFInput(buscaRateio) ? buscaRateio.replace(/\D/g, '') : buscaRateio
    const r = await buscarProdutor(termoLimpo)
    const idsExistentes = new Set(participantes.map(p => p.produtor_id))
    setResultadosBuscaRateio(((r ?? []) as ProdutorBusca[]).filter(p => !idsExistentes.has(p.id)))
  }

  async function adicionarParticipante(p: ProdutorBusca) {
    const contaP = await getContaProdutor(p.id)
    if (!contaP) { setErroRateio(`${p.nome} não possui conta no sistema.`); return }
    const qtdTotal = parseFloat(formEntrega.quantidade) || 0
    const dadosP = await getProdutorParaRateio(p.id)
    const percentualSugerido = (dadosP?.percentual_posse as number | null) ?? 0
    setParticipantes(prev => [...prev, {
      produtor_id: p.id, nome: p.nome, conta_id: (contaP as any).id,
      percentual: percentualSugerido,
      quantidade_rateada: parseFloat(((qtdTotal * percentualSugerido) / 100).toFixed(4))
    }])
    setBuscaRateio(''); setResultadosBuscaRateio([]); setErroRateio('')
  }

  const totalPercentual = participantes.reduce((acc, p) => acc + p.percentual, 0)
  const percentualOk = Math.abs(totalPercentual - 100) <= 0.01

  async function confirmarRateio() {
    if (!sessao || !percentualOk) return
    setSalvandoRateio(true); setErroRateio('')
    try {
      await registrarEntregaComRateio({
        sessao_id: sessao.id, produto_id: formEntrega.produto_id,
        quantidade_total: parseFloat(formEntrega.quantidade),
        participantes: participantes.map(p => ({ produtor_id: p.produtor_id, conta_id: p.conta_id, percentual: p.percentual, quantidade_rateada: p.quantidade_rateada })),
        observacoes: formEntrega.observacoes
      })
      setModalRateio(false)
      setFormEntrega(f => ({ ...f, quantidade: '', observacoes: '' }))
      await recarregarConta(); await recarregarSessao()
      setStatusOp('sucesso'); setTimeout(() => setStatusOp('idle'), 3000)
    } catch (e: any) { setErroRateio(e.message) }
    finally { setSalvandoRateio(false) }
  }

  async function handleReceber() {
    if (!sessao || !conta || !formReceber.produto_id || !formReceber.quantidade || !formReceber.preco_kg) return
    const qtd = parseFloat(formReceber.quantidade), preco = parseFloat(formReceber.preco_kg)
    setStatusOp('salvando')
    try {
      await registrarConversaoESaque({
        sessao_id: sessao.id, produtor_id: produtorSelecionado!.id, conta_id: conta.id,
        produto_id: formReceber.produto_id, quantidade_produto: qtd, preco_unitario: preco,
        valor_financeiro: parseFloat((qtd * preco).toFixed(2)),
        forma_pagamento: formReceber.forma_pagamento, chave_pix: formReceber.chave_pix || undefined
      })
      setFormReceber(f => ({ ...f, quantidade: '', preco_kg: '' }))
      await recarregarConta(); await recarregarSessao()
      setStatusOp('sucesso'); setTimeout(() => setStatusOp('idle'), 3000)
    } catch (e: any) { setErroMsg(e.message); setStatusOp('erro') }
  }

  async function handleSaque() {
    if (!sessao || !conta || !formSaque.valor) return
    setStatusOp('salvando')
    try {
      await registrarSaqueFinanceiro({
        sessao_id: sessao.id, conta_id: conta.id,
        valor_financeiro: parseFloat(formSaque.valor),
        forma_pagamento: formSaque.forma_pagamento, chave_pix: formSaque.chave_pix || undefined
      })
      setFormSaque(f => ({ ...f, valor: '' }))
      await recarregarConta(); await recarregarSessao()
      setStatusOp('sucesso'); setTimeout(() => setStatusOp('idle'), 3000)
    } catch (e: any) { setErroMsg(e.message); setStatusOp('erro') }
  }

  async function recarregarSessao() { const s = await getSessaoAberta(); setSessao(s) }

  async function recarregarConta() {
    if (!produtorSelecionado) return
    const c = await getContaProdutor(produtorSelecionado.id)
    setConta(c as unknown as Conta | null)
    if (c) { const ext = await getExtrato((c as unknown as Conta).id); setExtrato((ext ?? []) as unknown as Movimentacao[]) }
  }

  async function handleFecharCaixa() {
    if (!sessao || !saldoFinal) return
    setFechando(true)
    try { await fecharCaixa(sessao.id, parseFloat(saldoFinal), obsFechamento); setResumoFechamento(sessao); setSessao(null) }
    finally { setFechando(false) }
  }

  async function carregarCotacao(produto_id: string) {
    if (!produto_id) return
    const cot = await getCotacaoHoje(produto_id)
    if (cot) setFormReceber(f => ({ ...f, preco_kg: (cot as any).preco_cooperado.toString() }))
  }

  const inputStyle: React.CSSProperties = { padding: '8px 12px', border: '1px solid #e5e3dc', borderRadius: '8px', fontSize: '14px', background: '#fff' }

  if (carregando) return <div style={{ padding: '32px' }}>Carregando...</div>

  if (resumoFechamento) return (
    <div style={{ padding: '32px', background: '#f8f7f4', minHeight: '100vh' }}>
      <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '32px', maxWidth: '480px' }}>
        <div style={{ fontSize: '18px', fontWeight: 500, marginBottom: '24px' }}>✓ Caixa fechado</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#6b6b6b' }}>Data</span><span>{new Date(resumoFechamento.data).toLocaleDateString('pt-BR')}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#6b6b6b' }}>Saldo inicial</span><span>R$ {resumoFechamento.saldo_inicial_especie.toFixed(2)}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#6b6b6b' }}>Saídas espécie</span><span>R$ {(resumoFechamento.total_saidas_especie ?? 0).toFixed(2)}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#6b6b6b' }}>Total Pix</span><span>R$ {(resumoFechamento.total_pix ?? 0).toFixed(2)}</span></div>
          <div style={{ borderTop: '1px solid #e5e3dc', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', fontWeight: 500 }}>
            <span>Saldo final espécie</span><span>R$ {parseFloat(saldoFinal).toFixed(2)}</span>
          </div>
        </div>
        <button onClick={() => { setResumoFechamento(null); setSaldoFinal(''); setObsFechamento(''); init() }}
          style={{ marginTop: '24px', width: '100%', padding: '10px', background: '#92400e', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>
          Novo dia
        </button>
      </div>
    </div>
  )

  if (!sessao) return (
    <div style={{ padding: '32px', background: '#f8f7f4', minHeight: '100vh' }}>
      <button onClick={() => router.push('/comercializacao')}
        style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b6b6b', fontSize: '14px', marginBottom: '20px', padding: 0 }}>
        <span style={{ fontSize: '18px', lineHeight: 1 }}>←</span> Voltar
      </button>
      <h1 style={{ fontSize: '22px', fontWeight: 500, marginBottom: '24px' }}>Caixa</h1>
      <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '32px', maxWidth: '360px' }}>
        <div style={{ fontWeight: 500, marginBottom: '16px' }}>Abrir caixa</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Saldo inicial em espécie (R$)</label>
            <input type="number" step="0.01" placeholder="0,00" value={saldoInicial}
              onChange={e => setSaldoInicial(e.target.value)} style={inputStyle} />
          </div>
          <button onClick={handleAbrirCaixa} disabled={abrindo || !saldoInicial}
            style={{ padding: '10px', background: '#92400e', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>
            {abrindo ? 'Abrindo...' : 'Abrir caixa'}
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ padding: '32px', background: '#f8f7f4', minHeight: '100vh' }}>

      {modalRateio && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '16px' }}>Rateio de entrega</div>
                <div style={{ fontSize: '13px', color: '#6b6b6b', marginTop: '2px' }}>{formEntrega.quantidade} kg · {produtos.find(p => p.id === formEntrega.produto_id)?.nome}</div>
              </div>
              <button onClick={() => setModalRateio(false)} style={{ border: 'none', background: 'none', fontSize: '20px', cursor: 'pointer', color: '#6b6b6b', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {participantes.map((p, i) => (
                <div key={p.produtor_id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', background: '#fafaf8', border: '1px solid #e5e3dc', borderRadius: '10px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.nome}
                      {i === 0 && <span style={{ fontSize: '11px', color: '#92400e', background: '#fef3c7', padding: '1px 6px', borderRadius: '4px', marginLeft: '6px' }}>principal</span>}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b6b6b', marginTop: '2px' }}>{p.quantidade_rateada.toFixed(3)} kg</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input type="number" step="0.01" min="0.01" max="100" value={p.percentual}
                      onChange={e => atualizarPercentual(i, parseFloat(e.target.value) || 0)}
                      style={{ width: '64px', padding: '6px 8px', border: '1px solid #e5e3dc', borderRadius: '6px', fontSize: '14px', textAlign: 'right' }} />
                    <span style={{ fontSize: '14px', color: '#6b6b6b' }}>%</span>
                  </div>
                  {participantes.length > 1 && (
                    <button onClick={() => removerParticipante(i)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#991b1b', fontSize: '16px', lineHeight: 1, padding: '4px' }}>×</button>
                  )}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', background: percentualOk ? '#dcfce7' : '#fee2e2', border: `1px solid ${percentualOk ? '#bbf7d0' : '#fecaca'}` }}>
              <span style={{ fontSize: '13px', color: percentualOk ? '#166534' : '#991b1b' }}>
                {percentualOk ? '✓ Percentuais corretos' : `Total: ${totalPercentual.toFixed(2)}% (faltam ${(100 - totalPercentual).toFixed(2)}%)`}
              </span>
              <span style={{ fontSize: '13px', fontWeight: 500, color: percentualOk ? '#166534' : '#991b1b' }}>{totalPercentual.toFixed(1)}% / 100%</span>
            </div>
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '12px', color: '#6b6b6b', marginBottom: '6px' }}>Adicionar participante</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input placeholder="Nome ou CPF..." value={buscaRateio} onChange={e => setBuscaRateio(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && buscarParaRateio()}
                  style={{ flex: 1, ...inputStyle }} />
                <button onClick={buscarParaRateio} style={{ padding: '8px 16px', border: '1px solid #e5e3dc', borderRadius: '8px', background: '#fff', fontSize: '14px', cursor: 'pointer' }}>Buscar</button>
              </div>
            </div>
            {resultadosBuscaRateio.length > 0 && (
              <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '8px', marginBottom: '12px', overflow: 'hidden' }}>
                {resultadosBuscaRateio.map(p => (
                  <button key={p.id} onClick={() => adicionarParticipante(p)} style={{ width: '100%', padding: '10px 14px', border: 'none', borderBottom: '1px solid #f0ede8', background: '#fff', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px' }}>{p.nome}</span>
                    <span style={{ fontSize: '12px', color: '#6b6b6b' }}>{p.tipo_posse ? `${p.tipo_posse} · ${p.percentual_posse ?? 0}%` : p.cpf ?? ''}</span>
                  </button>
                ))}
              </div>
            )}
            {erroRateio && <div style={{ marginBottom: '12px', color: '#991b1b', fontSize: '13px' }}>{erroRateio}</div>}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button onClick={() => setModalRateio(false)} style={{ padding: '10px 20px', border: '1px solid #e5e3dc', borderRadius: '8px', background: '#fff', fontSize: '14px', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={confirmarRateio} disabled={!percentualOk || salvandoRateio}
                style={{ padding: '10px 24px', background: percentualOk ? '#92400e' : '#d1d5db', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: percentualOk ? 'pointer' : 'not-allowed' }}>
                {salvandoRateio ? 'Salvando...' : 'Confirmar entrega'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button onClick={() => router.push('/comercializacao')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b6b6b', fontSize: '14px', padding: 0 }}>
          <span style={{ fontSize: '18px', lineHeight: 1 }}>←</span> Voltar
        </button>
        <h1 style={{ fontSize: '22px', fontWeight: 500, margin: 0 }}>Caixa</h1>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '13px', color: '#166534', background: '#dcfce7', padding: '4px 12px', borderRadius: '20px' }}>● Aberto</span>
          <span style={{ fontSize: '13px', color: '#6b6b6b' }}>Saldo inicial: R$ {sessao.saldo_inicial_especie.toFixed(2)}</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '1px solid #e5e3dc' }}>
        {(['buscar', 'solicitacoes', 'operacoes', 'fechar'] as const).map(a => (
          <button key={a} onClick={() => setAba(a)} style={{
            padding: '8px 20px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '14px',
            borderBottom: aba === a ? '2px solid #92400e' : '2px solid transparent',
            color: aba === a ? '#92400e' : '#6b6b6b', fontWeight: aba === a ? 500 : 400, marginBottom: '-1px'
          }}>
            {a === 'buscar' ? 'Produtor' : a === 'solicitacoes' ? `Solicitações${solicitacoes.length > 0 ? ` (${solicitacoes.length})` : ''}` : a === 'operacoes' ? 'Operações do dia' : 'Fechar caixa'}
          </button>
        ))}
      </div>

      {aba === 'buscar' && (
        <div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input placeholder="Nome ou CPF do produtor..." value={termoBusca}
              onChange={handleTermoBuscaChange} onKeyDown={e => e.key === 'Enter' && handleBuscar()}
              style={{ flex: 1, maxWidth: '360px', ...inputStyle }} />
            <button onClick={handleBuscar} style={{ padding: '8px 20px', background: '#92400e', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>Buscar</button>
            {produtorSelecionado && (
              <button onClick={() => { setProdutorSelecionado(null); setConta(null); setOperacao(null) }}
                style={{ padding: '8px 16px', border: '1px solid #e5e3dc', borderRadius: '8px', background: '#fff', fontSize: '14px', cursor: 'pointer' }}>
                Limpar
              </button>
            )}
          </div>

          {resultadosBusca.length > 0 && !produtorSelecionado && (
            <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '8px', marginBottom: '16px', overflow: 'hidden' }}>
              {resultadosBusca.map(p => (
                <button key={p.id} onClick={() => selecionarProdutor(p)} style={{ width: '100%', padding: '12px 16px', border: 'none', borderBottom: '1px solid #f0ede8', background: '#fff', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', fontWeight: 500 }}>{p.nome}</span>
                  <span style={{ fontSize: '12px', color: '#6b6b6b' }}>
                    {p.cpf ? mascararCPF(p.cpf) : ''} · {p.tipo === 'cooperado' ? 'Cooperado' : 'Externo'}
                    {p.tipo_posse ? ` · ${p.tipo_posse}` : ''}
                  </span>
                </button>
              ))}
            </div>
          )}

          {produtorSelecionado && conta && (
            <div>
              <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: '16px' }}>{produtorSelecionado.nome}</div>
                    <div style={{ fontSize: '13px', color: '#6b6b6b', marginTop: '2px' }}>
                      {produtorSelecionado.cpf ? mascararCPF(produtorSelecionado.cpf) : ''} · {produtorSelecionado.tipo === 'cooperado' ? 'Cooperado' : 'Externo'}
                      {produtorSelecionado.telefone ? ` · ${mascararTelefone(produtorSelecionado.telefone)}` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {conta.saldos_produto?.filter(s => s.quantidade > 0).map(s => (
                      <div key={s.produto_id} style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '8px', padding: '8px 14px', textAlign: 'center' }}>
                        <KgDisplay valor={s.quantidade} fontSize={16} cor="#92400e" />
                        <div style={{ fontSize: '11px', color: '#6b6b6b', marginTop: '2px' }}>{s.produtos.nome}</div>
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

              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                {(['entrega', 'receber', 'saque'] as const).map(op => (
                  <button key={op} onClick={() => setOperacao(operacao === op ? null : op)} style={{
                    padding: '8px 20px', border: '1px solid #e5e3dc', borderRadius: '8px', fontSize: '14px', cursor: 'pointer',
                    background: operacao === op ? '#92400e' : '#fff', color: operacao === op ? '#fff' : '#1a1a1a'
                  }}>
                    {op === 'entrega' ? '↓ Registrar entrega' : op === 'receber' ? '↑ Pagar produtor' : '$ Saque financeiro'}
                  </button>
                ))}
              </div>

              {statusOp === 'sucesso' && <div style={{ marginBottom: '12px', color: '#166534', fontSize: '13px' }}>✓ Operação registrada com sucesso.</div>}
              {statusOp === 'erro' && <div style={{ marginBottom: '12px', color: '#991b1b', fontSize: '13px' }}>{erroMsg}</div>}

              {operacao === 'entrega' && (
                <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
                  <div style={{ fontWeight: 500, fontSize: '14px', marginBottom: '12px' }}>Registrar entrega</div>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Produto</label>
                      <select value={formEntrega.produto_id} onChange={e => setFormEntrega(f => ({ ...f, produto_id: e.target.value }))} style={inputStyle}>
                        {produtos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                      </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Quantidade (kg)</label>
                      <input type="number" step="0.001" placeholder="0,000" value={formEntrega.quantidade}
                        onChange={e => setFormEntrega(f => ({ ...f, quantidade: e.target.value }))}
                        style={{ ...inputStyle, width: '120px' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '160px' }}>
                      <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Observações</label>
                      <input placeholder="Opcional" value={formEntrega.observacoes} onChange={e => setFormEntrega(f => ({ ...f, observacoes: e.target.value }))} style={inputStyle} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }}>
                    <button onClick={handleEntregaSimples} disabled={statusOp === 'salvando' || !formEntrega.quantidade}
                      style={{ padding: '8px 20px', background: '#92400e', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>
                      {statusOp === 'salvando' ? 'Salvando...' : 'Confirmar (individual)'}
                    </button>
                    <button onClick={abrirModalRateio} disabled={!formEntrega.quantidade || !formEntrega.produto_id}
                      style={{ padding: '8px 20px', background: '#fff', color: '#92400e', border: '1px solid #92400e', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>
                      Rateio entre participantes →
                    </button>
                  </div>
                </div>
              )}

              {operacao === 'receber' && (
                <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
                  <div style={{ fontWeight: 500, fontSize: '14px', marginBottom: '12px' }}>Pagar produtor</div>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Produto</label>
                      <select value={formReceber.produto_id}
                        onChange={e => { setFormReceber(f => ({ ...f, produto_id: e.target.value })); carregarCotacao(e.target.value) }}
                        style={inputStyle}>
                        <option value="">Selecionar...</option>
                        {conta.saldos_produto?.filter(s => s.quantidade > 0).map(s => (
                          <option key={s.produto_id} value={s.produto_id}>
                            {s.produtos.nome} ({(() => { const {inteiro, decimal} = formatarKg(s.quantidade); return inteiro + decimal })()}{s.produtos.unidade})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Quantidade (kg)</label>
                      <input type="number" step="0.001" placeholder="0,000" value={formReceber.quantidade}
                        onChange={e => setFormReceber(f => ({ ...f, quantidade: e.target.value }))}
                        style={{ ...inputStyle, width: '110px' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Preço/kg (R$)</label>
                      <input type="number" step="0.01" placeholder="0,00" value={formReceber.preco_kg}
                        onChange={e => setFormReceber(f => ({ ...f, preco_kg: e.target.value }))}
                        style={{ ...inputStyle, width: '100px' }} />
                    </div>
                    {formReceber.quantidade && formReceber.preco_kg && (
                      <div style={{ padding: '8px 14px', background: '#fef3c7', borderRadius: '8px', fontSize: '14px', fontWeight: 500, color: '#92400e' }}>
                        = R$ {(parseFloat(formReceber.quantidade) * parseFloat(formReceber.preco_kg)).toFixed(2)}
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Pagamento</label>
                      <select value={formReceber.forma_pagamento} onChange={e => setFormReceber(f => ({ ...f, forma_pagamento: e.target.value as 'especie' | 'pix' }))} style={inputStyle}>
                        <option value="especie">Espécie</option>
                        <option value="pix">Pix</option>
                      </select>
                    </div>
                    {formReceber.forma_pagamento === 'pix' && (
                      <div style={{ minWidth: '200px' }}>
                        <PixInput value={formReceber.chave_pix} onChange={v => setFormReceber(f => ({ ...f, chave_pix: v }))} style={inputStyle} />
                      </div>
                    )}
                    <button onClick={handleReceber} disabled={statusOp === 'salvando'}
                      style={{ padding: '8px 20px', background: '#92400e', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>
                      {statusOp === 'salvando' ? 'Salvando...' : 'Confirmar pagamento'}
                    </button>
                  </div>
                </div>
              )}

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
                        style={{ ...inputStyle, width: '130px' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Pagamento</label>
                      <select value={formSaque.forma_pagamento} onChange={e => setFormSaque(f => ({ ...f, forma_pagamento: e.target.value as 'especie' | 'pix' }))} style={inputStyle}>
                        <option value="especie">Espécie</option>
                        <option value="pix">Pix</option>
                      </select>
                    </div>
                    {formSaque.forma_pagamento === 'pix' && (
                      <div style={{ minWidth: '220px' }}>
                        <PixInput value={formSaque.chave_pix} onChange={v => setFormSaque(f => ({ ...f, chave_pix: v }))} style={{ ...inputStyle, width: '100%' }} />
                      </div>
                    )}
                    <button onClick={handleSaque} disabled={statusOp === 'salvando'}
                      style={{ padding: '8px 20px', background: '#92400e', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>
                      {statusOp === 'salvando' ? 'Salvando...' : 'Confirmar saque'}
                    </button>
                  </div>
                </div>
              )}

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
                            {m.quantidade_produto ? (() => { const {inteiro, decimal} = formatarKg(m.quantidade_produto); return <span>{inteiro}<span style={{fontSize:'0.8em'}}>{decimal}</span> {m.produtos?.unidade ?? 'kg'}</span> })() : ''}
                          </td>
                          <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 500, color: m.valor_financeiro ? (m.tipo === 'conversao' ? '#166534' : '#991b1b') : '#1a1a1a' }}>
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

      {aba === 'solicitacoes' && (
        <div>
          {solicitacoes.length === 0 ? (
            <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '32px', textAlign: 'center', color: '#6b6b6b', fontSize: '14px' }}>Nenhuma solicitação pendente.</div>
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
                    <button onClick={async () => { const p = await buscarProdutor(s.produtores?.nome ?? ''); if (p && p[0]) { await selecionarProdutor(p[0] as ProdutorBusca); setAba('buscar') } }}
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

      {aba === 'operacoes' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', color: '#6b6b6b' }}>{operacoesDia.length} operação(ões) hoje</span>
            <button onClick={carregarOperacoesDia} disabled={carregandoOps}
              style={{ fontSize: '13px', color: '#92400e', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              {carregandoOps ? 'Atualizando...' : '↻ Atualizar'}
            </button>
          </div>
          <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e3dc', background: '#fafaf8' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500 }}>Horário</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500 }}>Produtor</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500 }}>Operação</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 500 }}>Quantidade</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 500 }}>Valor</th>
                </tr>
              </thead>
              <tbody>
                {carregandoOps ? (
                  <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#6b6b6b' }}>Carregando...</td></tr>
                ) : operacoesDia.length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#6b6b6b' }}>Nenhuma operação registrada ainda.</td></tr>
                ) : (
                  operacoesDia.map(op => (
                    <tr key={op.id} style={{ borderBottom: '1px solid #f0ede8' }}>
                      <td style={{ padding: '10px 16px', color: '#6b6b6b', whiteSpace: 'nowrap' }}>
                        {new Date(op.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ padding: '10px 16px' }}>{op.contas_produtor?.produtores?.nome ?? '—'}</td>
                      <td style={{ padding: '10px 16px' }}>
                        <div>{TIPO_LABEL[op.tipo] ?? op.tipo}</div>
                        {op.produtos && <div style={{ fontSize: '12px', color: '#6b6b6b' }}>{op.produtos.nome}</div>}
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', color: '#6b6b6b' }}>
                        {op.quantidade_produto ? (() => { const {inteiro, decimal} = formatarKg(op.quantidade_produto); return <span>{inteiro}<span style={{fontSize:'0.8em'}}>{decimal}</span> {op.produtos?.unidade ?? 'kg'}</span> })() : '—'}
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 500, color: op.valor_financeiro ? (op.tipo === 'conversao' ? '#166534' : '#991b1b') : '#1a1a1a' }}>
                        {op.valor_financeiro ? `R$ ${Math.abs(op.valor_financeiro).toFixed(2)}` : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
      <div style={{ borderTop: '1px solid #e5e3dc', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
        <span style={{ color: '#6b6b6b' }}>Saldo esperado em caixa</span>
        <span style={{ fontWeight: 500 }}>
          R$ {(sessao.saldo_inicial_especie - (sessao.total_saidas_especie ?? 0)).toFixed(2)}
        </span>
      </div>
    </div>
    <button
      onClick={() => setModalFechar(true)}
      style={{ marginTop: '24px', width: '100%', padding: '10px', background: '#92400e', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}
    >
      Fechar caixa
    </button>
  </div>
)}

{/* Modal fechar caixa */}
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
            <div style={{ borderTop: '1px solid #e5e3dc', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: '#6b6b6b' }}>Saldo esperado em caixa</span>
              <span style={{ fontWeight: 500 }}>
                R$ {(sessao.saldo_inicial_especie - (sessao.total_saidas_especie ?? 0)).toFixed(2)}
              </span>
            </div>
          </div>
          <button
            onClick={() => setModalFechar(true)}
            style={{ marginTop: '24px', width: '100%', padding: '10px', background: '#92400e', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}
          >
            Fechar caixa
          </button>
        </div>
      )}
{modalFechar && (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
    <div style={{ background: '#fff', borderRadius: '12px', padding: '28px', width: '100%', maxWidth: '360px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
      <div style={{ fontWeight: 600, fontSize: '16px', marginBottom: '20px' }}>Confirmar fechamento</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Saldo final em espécie (R$) *</label>
          <input
            type="number" step="0.01" placeholder="0,00"
            value={saldoFinal}
            onChange={e => setSaldoFinal(e.target.value)}
            autoFocus
            style={{ padding: '8px 12px', border: '1px solid #e5e3dc', borderRadius: '8px', fontSize: '14px' }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Observações</label>
          <input
            placeholder="Opcional"
            value={obsFechamento}
            onChange={e => setObsFechamento(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #e5e3dc', borderRadius: '8px', fontSize: '14px' }}
          />
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px', marginTop: '20px', justifyContent: 'flex-end' }}>
        <button
          onClick={() => setModalFechar(false)}
          style={{ padding: '8px 16px', border: '1px solid #e5e3dc', borderRadius: '8px', background: '#fff', fontSize: '14px', cursor: 'pointer' }}
        >
          Cancelar
        </button>
        <button
          onClick={handleFecharCaixa}
          disabled={fechando || !saldoFinal}
          style={{ padding: '8px 20px', background: '#92400e', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}
        >
          {fechando ? 'Fechando...' : 'Confirmar'}
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  )
}