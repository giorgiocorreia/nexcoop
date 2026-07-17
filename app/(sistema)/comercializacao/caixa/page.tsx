'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import {
  getSessaoAberta, abrirCaixa, fecharCaixa,
  buscarProdutor, getContaProdutor, getExtrato,
  registrarEntrega, registrarEntregaComRateio,
  registrarConversaoESaque, registrarSaqueFinanceiro, registrarSaquePorValor,
  listarSolicitacoesPendentes, getProdutorParaRateio,
  getOperacoesHoje, listarAdminsDaOrg,
  registrarAporteSangria, getAportesESangriasDaSessao,
  getProdutorPorId, listarCategoriasDesp, registrarSaidaAvulsa,
  criarCategoriaDesp, getSaldosProdutoParaSelecao,
  getMeuSaldoResponsabilidadeComercializacao,
  listarAtendentesLojaParaTransferencia, getSaldoLojaDoAtendente,
  listarOutrosAtendentesComercializacao, getSaldoComercializacaoDoAtendente,
  type ParticipanteRateio
} from '@/lib/comercializacao/caixa.actions'
import { listarProdutos, criarProduto } from '@/lib/comercializacao/produtos.actions'
import { getCotacaoHoje } from '@/lib/comercializacao/cotacoes.actions'
import { BotaoComprovante } from '@/components/comercializacao/BotaoComprovante'
import { BotaoEnviarLoja } from '@/components/comercializacao/BotaoEnviarLoja'
import { BotaoComprovantePagamento } from '@/components/comercializacao/BotaoComprovantePagamento'
import { usePdfFechamento } from '@/lib/comercializacao/usePdfFechamento'
import { createClient } from '@/lib/supabase/client'
import { fmtReal } from '@/lib/comercializacao/fmt'
import { Btn } from '@/components/ui/Btn'
import { ModalNfeEntrada, BotaoNfe } from '@/components/comercializacao/ModalNfeEntrada'
import { HubStyles } from '@/components/comercializacao/ui/HubStyles'
import { PageLayout } from '@/components/comercializacao/ui/PageLayout'
import { ContentCard } from '@/components/comercializacao/ui/ContentCard'
import { Modal } from '@/components/comercializacao/ui/Modal'
import { Field, Input, Select, Textarea } from '@/components/comercializacao/ui/Field'
import { Tabs } from '@/components/comercializacao/ui/Tabs'
import { Badge } from '@/components/comercializacao/ui/Badge'
import { EmptyState } from '@/components/comercializacao/ui/EmptyState'
import { ListRow } from '@/components/comercializacao/ui/ListRow'
import { COM_C } from '@/components/comercializacao/ui/tokens'

type Sessao = { id: string; data: string; saldo_inicial_especie: number; saldo_especie_calculado: number; total_saidas_especie: number; total_pix: number; total_entradas_pix?: number; total_entradas_cartao?: number }
type ProdutorBusca = { id: string; nome: string; cpf: string | null; telefone: string | null; tipo: string; chave_pix: string | null; tipo_posse?: string | null; percentual_posse?: number | null }
type SaldoProduto = { produto_id: string; quantidade: number; produtos: { nome: string; unidade: string } }
type Conta = { id: string; saldo_financeiro: number; saldos_produto: SaldoProduto[] }
type Movimentacao = { id: string; tipo: string; quantidade_produto: number | null; valor_financeiro: number | null; forma_pagamento: string | null; created_at: string; produtos: { nome: string; unidade: string } | null }
type Produto = { id: string; nome: string; unidade: string }
type Solicitacao = { id: string; quantidade_kg: number; valor_estimado: number; forma_pagamento: string; chave_pix: string | null; produtores: { nome: string; telefone: string | null }; produtos: { nome: string; unidade: string }; cotacoes: { preco_cooperado: number } }
type OperacaoDia = { id: string; tipo: string; quantidade_produto: number | null; valor_financeiro: number | null; preco_unitario: number | null; referencia_tipo: string | null; forma_pagamento: string | null; observacoes: string | null; created_at: string; produtos: { nome: string; unidade: string; loja_produto_id?: string | null } | null; contas_produtor: { produtor_id: string; produtores: { nome: string } | null } | null }
type AdminOrg = { id: string; nome_completo: string; email: string }
type AporteSangria = { id: string; tipo: string; valor: number; created_at: string; observacoes: string | null; forma_pagamento: 'especie' | 'pix' | 'cartao'; origem: 'manual' | 'cota_cooperado'; autorizador: { nome_completo: string } | null; executor: { nome_completo: string } | null }

const FORMA_LABEL: Record<string, string> = { especie: 'Espécie', pix: 'Pix', cartao: 'Cartão' }
type Categoria = { id: string; nome: string; grupo: string | null }

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
  compra_loja: 'Compra loja',
  aporte: 'Aporte',
  sangria: 'Sangria',
}

const TIPOS_ENTRADA = new Set(['conversao', 'aporte'])

function formatarKg(v: number): { inteiro: string; decimal: string } {
  const s = v.toFixed(3).replace(/\.?0+$/, '')
  const [int, dec] = s.split('.')
  return { inteiro: int, decimal: dec ? `,${dec}` : '' }
}

function KgDisplay({ valor, fontSize = 16, cor = '#92400e', unidade = 'kg' }: { valor: number; fontSize?: number; cor?: string; unidade?: string }) {
  const { inteiro, decimal } = formatarKg(valor)
  return (
    <span style={{ color: cor }}>
      <span style={{ fontSize, fontWeight: 600 }}>{inteiro}</span>
      <span style={{ fontSize: fontSize * 0.6, fontWeight: 600 }}>{decimal}</span>
      <span style={{ fontSize: fontSize * 0.55, fontWeight: 400, marginLeft: 2 }}> {unidade}</span>
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
    <Field label={label} hint={tipo ? `Tipo detectado: ${labelTipoPix(tipo)}` : undefined}>
      <Input value={value} onChange={handleChange} placeholder="CPF, CNPJ, telefone, e-mail ou chave aleatória" style={style} />
    </Field>
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
  const [saldoHerdado, setSaldoHerdado] = useState<number | null>(null)
  const [abrindo, setAbrindo] = useState(false)
  const [termoBusca, setTermoBusca] = useState('')
  const [resultadosBusca, setResultadosBusca] = useState<ProdutorBusca[]>([])
  const [produtorSelecionado, setProdutorSelecionado] = useState<ProdutorBusca | null>(null)
  const [conta, setConta] = useState<Conta | null>(null)
  const [extrato, setExtrato] = useState<Movimentacao[]>([])
  const [operacao, setOperacao] = useState<'entrega' | 'receber' | 'saque' | null>(null)
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [formEntrega, setFormEntrega] = useState({ produto_id: '', quantidade: '', observacoes: '', preco_custo: '' })
  const [formReceber, setFormReceber] = useState({ produto_id: '', quantidade: '', preco_kg: '', forma_pagamento: 'especie' as 'especie' | 'pix', chave_pix: '' })
  const [formSaque, setFormSaque] = useState({ valor: '', forma_pagamento: 'especie' as 'especie' | 'pix', chave_pix: '', produto_id: '', preco_kg: '' })
  const [saldosSelecao, setSaldosSelecao] = useState<{ produto_id: string; nome: string; unidade: string; saldo: number }[]>([])
  const [modalNovoProduto, setModalNovoProduto] = useState(false)
  const [formNovoProduto, setFormNovoProduto] = useState({ nome: '', categoria: '', unidade: 'kg' })
  const [salvandoNovoProduto, setSalvandoNovoProduto] = useState(false)
  const [erroNovoProduto, setErroNovoProduto] = useState('')
  const [confirmarAntecipacao, setConfirmarAntecipacao] = useState<{ tipo: 'receber' | 'saque'; mensagem: string } | null>(null)
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
  const [modalAporte, setModalAporte] = useState(false)
  const [admins, setAdmins] = useState<AdminOrg[]>([])
  const [formAporte, setFormAporte] = useState({
    tipo: 'aporte' as 'aporte' | 'sangria', valor: '', admin_id: '', admin_senha: '', observacoes: '',
    origemModulo: 'dinheiro' as 'dinheiro' | 'loja' | 'comercializacao', origemAtendenteId: '', origemEmail: '',
  })
  const [atendentesLoja, setAtendentesLoja] = useState<{ usuario_id: string; nome: string; caixa_id: string; status: 'aberto' | 'fechado' }[]>([])
  const [saldoOrigemLoja, setSaldoOrigemLoja] = useState<number | null>(null)
  const [atendentesComercial, setAtendentesComercial] = useState<{ usuario_id: string; nome: string; sessao_id: string; status: 'aberta' | 'fechada' }[]>([])
  const [salvandoAporte, setSalvandoAporte] = useState(false)
  const [erroAporte, setErroAporte] = useState('')
  const [aportesDia, setAportesDia] = useState<AporteSangria[]>([])
  const [modalSaida, setModalSaida] = useState(false)
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [salvandoSaida, setSalvandoSaida] = useState(false)
  const [erroSaida, setErroSaida] = useState('')
  const [mostrarNovaCategoria, setMostrarNovaCategoria] = useState(false)
  const [novaCategoriaNome, setNovaCategoriaNome] = useState('')
  const [salvandoNovaCategoria, setSalvandoNovaCategoria] = useState(false)
  const [formSaida, setFormSaida] = useState({
    descricao: '',
    valor: '',
    data_competencia: new Date().toISOString().split('T')[0],
    categoria_id: '',
    numero_documento: '',
    centro_custo: '',
    observacoes: '',
    comprovante_url: '',
  })
  const [uploadingComprovante, setUploadingComprovante] = useState(false)
  const [ultimaMovimentacaoId, setUltimaMovimentacaoId] = useState<string | null>(null)
  const [ultimaSaqueId, setUltimaSaqueId] = useState<string | null>(null)
  const [modalNfe, setModalNfe] = useState<string | null>(null)
  const [orgNome, setOrgNome] = useState('')
  const [orgCnpj, setOrgCnpj] = useState('')
  const [operadorNome, setOperadorNome] = useState('')

  const { baixarPdf } = usePdfFechamento()

  const movimentacaoPorProduto = useMemo(() => {
    const map = new Map<string, { totalKg: number; produtores: Set<string> }>()
    for (const op of operacoesDia) {
      if (op.tipo !== 'entrega') continue
      const key = op.produtos?.nome ?? 'Desconhecido'
      if (!map.has(key)) map.set(key, { totalKg: 0, produtores: new Set() })
      const entry = map.get(key)!
      entry.totalKg += op.quantidade_produto ?? 0
      if (op.contas_produtor?.produtor_id) entry.produtores.add(op.contas_produtor.produtor_id)
    }
    return Array.from(map.entries()).map(([produto, v]) => ({
      produto,
      totalKg: v.totalKg,
      nProdutores: v.produtores.size,
    }))
  }, [operacoesDia])

  useEffect(() => { init() }, [])
  useEffect(() => { if (aba === 'fechar') { recarregarSessao(); carregarAportesDia() } }, [aba])
  useEffect(() => { if (aba === 'operacoes' && sessao) carregarOperacoesDia() }, [aba, sessao])
  useEffect(() => {
    if (sessao && operacoesDia.length === 0) carregarOperacoesDia()
  }, [sessao])
  useEffect(() => {
    const produtorId = searchParams.get('produtor_id')
    const acao = searchParams.get('acao') as 'entrega' | 'receber' | 'saque' | null
    if (produtorId && sessao) carregarProdutorPorId(produtorId, acao)
  }, [searchParams, sessao])

  async function carregarProdutorPorId(produtorId: string, acao: 'entrega' | 'receber' | 'saque' | null) {
    const c = await getContaProdutor(produtorId)
    let p: ProdutorBusca
    if (c) {
      p = {
        id: produtorId,
        nome: (c as any).produtores?.nome ?? '',
        cpf: (c as any).produtores?.cpf ?? null,
        telefone: (c as any).produtores?.telefone ?? null,
        tipo: (c as any).produtores?.tipo ?? 'externo',
        chave_pix: (c as any).produtores?.chave_pix ?? null,
      }
      setConta(c as unknown as Conta)
      const ext = await getExtrato((c as any).id)
      setExtrato((ext ?? []) as unknown as Movimentacao[])
      const saldos = await getSaldosProdutoParaSelecao((c as any).id)
      setSaldosSelecao(saldos)
    } else {
      const prod = await getProdutorPorId(produtorId)
      if (!prod) return
      p = {
        id: produtorId,
        nome: (prod as any).nome ?? '',
        cpf: (prod as any).cpf ?? null,
        telefone: (prod as any).telefone ?? null,
        tipo: (prod as any).tipo ?? 'externo',
        chave_pix: (prod as any).chave_pix ?? null,
      }
      setConta(null)
      setExtrato([])
      setSaldosSelecao([])
    }
    setProdutorSelecionado(p)
    if (acao) setOperacao(acao)
    if (acao === 'receber' && p.chave_pix) {
      setFormReceber(f => ({ ...f, chave_pix: p.chave_pix ?? '' }))
    }
  }

  // Cadastro rápido de produto direto do formulário de entrada, pro caso do
  // produto que o produtor está trazendo ainda não existir na lista (evita
  // ter que sair da tela de caixa e ir em Comercialização → Produtos).
  async function handleCriarProdutoInline() {
    if (!formNovoProduto.nome) return
    setSalvandoNovoProduto(true)
    setErroNovoProduto('')
    try {
      const novo = await criarProduto(formNovoProduto)
      const lista = await listarProdutos()
      const ativos = (lista as Produto[]).filter((pr) => (pr as any).ativo !== false)
      setProdutos(ativos)
      if (novo) setFormEntrega(f => ({ ...f, produto_id: novo.id }))
      setFormNovoProduto({ nome: '', categoria: '', unidade: 'kg' })
      setModalNovoProduto(false)
    } catch (e: any) {
      setErroNovoProduto(e.message)
    } finally {
      setSalvandoNovoProduto(false)
    }
  }

  async function init() {
    setCarregando(true)
    const supabase = createClient()
    const [s, p, { data: { user } }] = await Promise.all([
      getSessaoAberta(),
      listarProdutos(),
      supabase.auth.getUser(),
    ])
    setSessao(s)
    const ativos = (p as Produto[]).filter((pr) => (pr as any).ativo !== false)
    setProdutos(ativos)
    if (ativos.length > 0) setFormEntrega(f => ({ ...f, produto_id: ativos[0].id }))
    if (s) {
      const sols = await listarSolicitacoesPendentes()
      setSolicitacoes((sols ?? []) as unknown as Solicitacao[])
    } else {
      // Continuidade: sugere como saldo inicial o saldo sob responsabilidade do
      // atendente no fechamento anterior (ou o que já se acumulou depois dele).
      const resp = await getMeuSaldoResponsabilidadeComercializacao()
      if (resp.sessao_id && resp.saldo_atual_especie > 0) {
        setSaldoHerdado(resp.saldo_atual_especie)
        setSaldoInicial(resp.saldo_atual_especie.toFixed(2))
      }
    }
    if (user) {
      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('nome_completo, organizacao_id')
        .eq('id', user.id)
        .single()
      if (usuarioData) {
        setOperadorNome((usuarioData as any).nome_completo ?? '')
        const { data: orgData } = await supabase
          .from('organizacoes')
          .select('nome, cnpj')
          .eq('id', (usuarioData as any).organizacao_id)
          .single()
        if (orgData) {
          setOrgNome((orgData as any).nome ?? '')
          setOrgCnpj((orgData as any).cnpj ?? '')
        }
      }
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

  async function carregarAportesDia() {
    if (!sessao) return
    const dados = await getAportesESangriasDaSessao(sessao.id)
    setAportesDia((dados ?? []) as unknown as AporteSangria[])
  }

  async function abrirModalAporte() {
    const lista = await listarAdminsDaOrg()
    setAdmins((lista ?? []) as unknown as AdminOrg[])
    setFormAporte({ tipo: 'aporte', valor: '', admin_id: '', admin_senha: '', observacoes: '', origemModulo: 'dinheiro', origemAtendenteId: '', origemEmail: '' })
    setAtendentesLoja([])
    setAtendentesComercial([])
    setSaldoOrigemLoja(null)
    setErroAporte('')
    setModalAporte(true)
  }

  async function selecionarOrigemLoja() {
    setFormAporte(f => ({ ...f, origemModulo: 'loja', origemAtendenteId: '' }))
    setSaldoOrigemLoja(null)
    if (atendentesLoja.length === 0) {
      const lista = await listarAtendentesLojaParaTransferencia()
      setAtendentesLoja(lista ?? [])
    }
  }

  async function selecionarOrigemComercial() {
    setFormAporte(f => ({ ...f, origemModulo: 'comercializacao', origemAtendenteId: '' }))
    setSaldoOrigemLoja(null)
    if (atendentesComercial.length === 0) {
      const lista = await listarOutrosAtendentesComercializacao()
      setAtendentesComercial(lista ?? [])
    }
  }

  async function selecionarAtendenteOrigem(atendenteId: string) {
    setFormAporte(f => ({ ...f, origemAtendenteId: atendenteId }))
    setSaldoOrigemLoja(null)
    if (!atendenteId) return
    const resp = formAporte.origemModulo === 'loja'
      ? await getSaldoLojaDoAtendente(atendenteId)
      : await getSaldoComercializacaoDoAtendente(atendenteId)
    setSaldoOrigemLoja(resp.saldo_atual_especie)
  }

  async function handleAporteSangria() {
    if (!sessao || !formAporte.valor) return
    const transferencia = formAporte.tipo === 'aporte' && (formAporte.origemModulo === 'loja' || formAporte.origemModulo === 'comercializacao')
    if (transferencia) {
      if (!formAporte.origemAtendenteId || !formAporte.origemEmail || !formAporte.admin_senha) return
    } else {
      if (!formAporte.admin_id || !formAporte.admin_senha) return
    }
    const admin = admins.find(a => a.id === formAporte.admin_id)
    if (!transferencia && !admin) return
    setSalvandoAporte(true)
    setErroAporte('')
    try {
      await registrarAporteSangria({
        sessao_id: sessao.id,
        tipo: formAporte.tipo,
        valor: parseFloat(formAporte.valor),
        admin_email: transferencia ? formAporte.origemEmail : admin!.email,
        admin_senha: formAporte.admin_senha,
        observacoes: formAporte.observacoes || undefined,
        ...(transferencia
          ? { origem: { modulo: formAporte.origemModulo as 'loja' | 'comercializacao', atendente_origem_id: formAporte.origemAtendenteId } }
          : {}),
      })
      setModalAporte(false)
      await recarregarSessao()
      await carregarAportesDia()
    } catch (e: any) {
      setErroAporte(e.message)
    } finally {
      setSalvandoAporte(false)
    }
  }

  async function handleCriarCategoria() {
    if (!novaCategoriaNome.trim()) return
    setSalvandoNovaCategoria(true)
    setErroSaida('')
    try {
      const nova = await criarCategoriaDesp(novaCategoriaNome)
      setCategorias(cs => [...cs, nova])
      setFormSaida(f => ({ ...f, categoria_id: nova.id }))
      setNovaCategoriaNome('')
      setMostrarNovaCategoria(false)
    } catch (err: any) {
      setErroSaida('Erro ao criar categoria: ' + err.message)
    } finally {
      setSalvandoNovaCategoria(false)
    }
  }

  async function abrirModalSaida() {
    if (categorias.length === 0) {
      const cats = await listarCategoriasDesp()
      setCategorias(cats as Categoria[])
    }
    setFormSaida({
      descricao: '',
      valor: '',
      data_competencia: new Date().toISOString().split('T')[0],
      categoria_id: '',
      numero_documento: '',
      centro_custo: '',
      observacoes: '',
      comprovante_url: '',
    })
    setErroSaida('')
    setMostrarNovaCategoria(false)
    setNovaCategoriaNome('')
    setModalSaida(true)
  }

  async function handleUploadComprovante(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !sessao) return
    setUploadingComprovante(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('organizacao_id')
        .eq('id', user!.id)
        .single()
      const orgId = (usuarioData as any).organizacao_id
      const ext = file.name.split('.').pop()
      const path = `${orgId}/comercializacao/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('comprovantes').upload(path, file)
      if (error) throw new Error(error.message)
      const { data: urlData } = supabase.storage.from('comprovantes').getPublicUrl(path)
      setFormSaida(f => ({ ...f, comprovante_url: urlData.publicUrl }))
    } catch (err: any) {
      setErroSaida('Erro ao fazer upload: ' + err.message)
    } finally {
      setUploadingComprovante(false)
    }
  }

  async function handleSaidaAvulsa() {
    if (!sessao || !formSaida.descricao || !formSaida.valor) return
    setSalvandoSaida(true)
    setErroSaida('')
    try {
      await registrarSaidaAvulsa({
        sessao_id: sessao.id,
        descricao: formSaida.descricao,
        valor: parseFloat(formSaida.valor),
        data_competencia: formSaida.data_competencia,
        categoria_id: formSaida.categoria_id || undefined,
        numero_documento: formSaida.numero_documento || undefined,
        centro_custo: formSaida.centro_custo || undefined,
        observacoes: formSaida.observacoes || undefined,
        comprovante_url: formSaida.comprovante_url || undefined,
      })
      setModalSaida(false)
      await recarregarSessao()
      await carregarOperacoesDia()
    } catch (err: any) {
      setErroSaida(err.message)
    } finally {
      setSalvandoSaida(false)
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
    setAbrindo(true)
    try {
      const result = await abrirCaixa()
      if (result.success) await init()
    } finally { setAbrindo(false) }
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
      const saldos = await getSaldosProdutoParaSelecao((c as unknown as Conta).id)
      setSaldosSelecao(saldos)
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
      const result = await registrarEntrega({
        sessao_id: sessao.id, produtor_id: produtorSelecionado!.id,
        conta_id: conta.id, produto_id: formEntrega.produto_id,
        quantidade_produto: parseFloat(formEntrega.quantidade), observacoes: formEntrega.observacoes,
        preco_unitario: formEntrega.preco_custo ? parseFloat(formEntrega.preco_custo.replace(',', '.')) : undefined,
      })
      setFormEntrega(f => ({ ...f, quantidade: '', observacoes: '', preco_custo: '' }))
      setUltimaMovimentacaoId(result.id)
      setModalNfe(result.id)
      await recarregarConta(); await recarregarSessao()
      setStatusOp('sucesso'); setTimeout(() => { setStatusOp('idle'); setUltimaMovimentacaoId(null) }, 8000)
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

  // Unidade do produto selecionado no formulário de entrega — o campo de
  // quantidade e o de custo precisam mostrar a unidade certa (kg, unidade,
  // litro, caixa), não sempre "kg" fixo.
  const unidadeEntregaSelecionada = produtos.find(p => p.id === formEntrega.produto_id)?.unidade ?? 'kg'
  const quantidadeFracionada = unidadeEntregaSelecionada === 'kg' || unidadeEntregaSelecionada === 'litro'
  const unidadeReceberSelecionada = saldosSelecao.find(s => s.produto_id === formReceber.produto_id)?.unidade ?? 'kg'
  const unidadeSaqueSelecionada = saldosSelecao.find(s => s.produto_id === formSaque.produto_id)?.unidade ?? 'kg'

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

  async function handleReceber(force = false) {
    if (!sessao || !conta || !formReceber.produto_id || !formReceber.quantidade || !formReceber.preco_kg) return
    const qtd = parseFloat(formReceber.quantidade), preco = parseFloat(formReceber.preco_kg)
    const saldoAtual = saldosSelecao.find(s => s.produto_id === formReceber.produto_id)?.saldo ?? 0
    if (!force && qtd > saldoAtual) {
      const ficaDevendo = (qtd - saldoAtual).toFixed(3)
      const nomeProduto = saldosSelecao.find(s => s.produto_id === formReceber.produto_id)?.nome ?? 'produto'
      setConfirmarAntecipacao({
        tipo: 'receber',
        mensagem: `${produtorSelecionado?.nome} tem ${saldoAtual.toFixed(3)} de saldo em ${nomeProduto} e está vendendo ${qtd.toFixed(3)} — vai ficar devendo ${ficaDevendo}. Confirmar venda antecipada?`
      })
      return
    }
    setConfirmarAntecipacao(null)
    setStatusOp('salvando')
    try {
      const result = await registrarConversaoESaque({
        sessao_id: sessao.id, produtor_id: produtorSelecionado!.id, conta_id: conta.id,
        produto_id: formReceber.produto_id, quantidade_produto: qtd, preco_unitario: preco,
        valor_financeiro: parseFloat((qtd * preco).toFixed(2)),
        forma_pagamento: formReceber.forma_pagamento, chave_pix: formReceber.chave_pix || undefined
      })
      setUltimaSaqueId(result.saque_id)
      setFormReceber(f => ({ ...f, quantidade: '', preco_kg: '' }))
      await recarregarConta(); await recarregarSessao()
      setStatusOp('idle')
    } catch (e: any) { setErroMsg(e.message); setStatusOp('erro') }
  }

  async function handleSaque(force = false) {
    if (!sessao || !conta || !formSaque.valor) return
    const valor = parseFloat(formSaque.valor)
    const restante = Number((valor - Math.max(conta.saldo_financeiro, 0)).toFixed(2))
    if (restante > 0 && !force) {
      if (!formSaque.produto_id || !formSaque.preco_kg) {
        setErroMsg('Saldo em conta insuficiente: selecione um produto e o preço para cobrir o restante (venda antecipada).')
        setStatusOp('erro')
        return
      }
      const qtdProduto = restante / parseFloat(formSaque.preco_kg)
      const saldoAtual = saldosSelecao.find(s => s.produto_id === formSaque.produto_id)?.saldo ?? 0
      const nomeProduto = saldosSelecao.find(s => s.produto_id === formSaque.produto_id)?.nome ?? 'produto'
      const ficaDevendo = (qtdProduto - saldoAtual).toFixed(3)
      setConfirmarAntecipacao({
        tipo: 'saque',
        mensagem: `Saldo em conta cobre ${fmtReal(Math.max(conta.saldo_financeiro, 0))}. O restante (${fmtReal(restante)}) será convertido em ${qtdProduto.toFixed(3)} de ${nomeProduto} — ${produtorSelecionado?.nome} vai ficar devendo ${ficaDevendo}. Confirmar venda antecipada?`
      })
      return
    }
    setConfirmarAntecipacao(null)
    setStatusOp('salvando')
    try {
      await registrarSaquePorValor({
        sessao_id: sessao.id, produtor_id: produtorSelecionado!.id, conta_id: conta.id,
        valor_total: valor,
        forma_pagamento: formSaque.forma_pagamento, chave_pix: formSaque.chave_pix || undefined,
        produto_id: formSaque.produto_id || undefined,
        preco_unitario: formSaque.preco_kg ? parseFloat(formSaque.preco_kg) : undefined
      })
      setFormSaque(f => ({ ...f, valor: '', produto_id: '', preco_kg: '' }))
      await recarregarConta(); await recarregarSessao()
      setStatusOp('sucesso'); setTimeout(() => setStatusOp('idle'), 3000)
    } catch (e: any) { setErroMsg(e.message); setStatusOp('erro') }
  }

  async function recarregarSessao() { const s = await getSessaoAberta(); setSessao(s) }

  async function recarregarConta() {
    if (!produtorSelecionado) return
    const c = await getContaProdutor(produtorSelecionado.id)
    setConta(c as unknown as Conta | null)
    if (c) {
      const ext = await getExtrato((c as unknown as Conta).id)
      setExtrato((ext ?? []) as unknown as Movimentacao[])
      const saldos = await getSaldosProdutoParaSelecao((c as unknown as Conta).id)
      setSaldosSelecao(saldos)
    }
  }

  async function handleFecharCaixa() {
    if (!sessao) return
    setFechando(true)
    try {
      // saldo_final_especie é sempre calculado pelo próprio fecharCaixa — o
      // valor contado (se preenchido) vai só como log de auditoria, nunca
      // sobrescreve o saldo oficial.
      await fecharCaixa(sessao.id, saldoFinal ? parseFloat(saldoFinal) : undefined, obsFechamento)
      if (operacoesDia.length === 0) {
        const ops = await getOperacoesHoje(sessao.id)
        setOperacoesDia((ops ?? []) as unknown as OperacaoDia[])
      }
      setResumoFechamento(sessao)
      setSessao(null)
      setModalFechar(false)
    } finally { setFechando(false) }
  }

  async function carregarCotacao(produto_id: string) {
    if (!produto_id) return
    const cot = await getCotacaoHoje(produto_id)
    if (cot) setFormReceber(f => ({ ...f, preco_kg: (cot as any).preco_cooperado.toString() }))
  }

  // saldo_especie_calculado já acumula saldo_inicial + aportes - sangrias via registrarAporteSangria
  const saldoEsperado = sessao
    ? (sessao.saldo_especie_calculado ?? 0) - (sessao.total_saidas_especie ?? 0)
    : 0

  if (carregando) return (
    <>
      <HubStyles />
      <div style={{ minHeight: '100vh', background: COM_C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <div style={{ textAlign: 'center', color: COM_C.txtSub }}>
          <i className="ti ti-loader-2" style={{ fontSize: 32, display: 'block', marginBottom: 12, animation: 'spin 1s linear infinite' }} />
          <div style={{ fontSize: 14, fontWeight: 500 }}>Carregando caixa...</div>
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </>
  )

  if (resumoFechamento) return (
    <PageLayout
      titulo="Caixa fechado"
      subtitulo={new Date(resumoFechamento.data).toLocaleDateString('pt-BR')}
      icone="ti-check"
      breadcrumb={[{ label: 'Caixa' }]}
      fullHeight
    >
      <div style={{ maxWidth: 480 }}>
        <ContentCard title="Resumo do fechamento">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: COM_C.txtSub }}>Data</span><span>{new Date(resumoFechamento.data).toLocaleDateString('pt-BR')}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: COM_C.txtSub }}>Saldo inicial</span><span>{fmtReal(resumoFechamento.saldo_inicial_especie)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: COM_C.txtSub }}>Saídas espécie</span><span>{fmtReal(resumoFechamento.total_saidas_especie ?? 0)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: COM_C.txtSub }}>Total Pix</span><span>{fmtReal(resumoFechamento.total_pix ?? 0)}</span></div>
            {(resumoFechamento.total_entradas_pix ?? 0) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: COM_C.txtSub }}>Entradas Pix (cota/outros)</span><span>{fmtReal(resumoFechamento.total_entradas_pix ?? 0)}</span></div>
            )}
            {(resumoFechamento.total_entradas_cartao ?? 0) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: COM_C.txtSub }}>Entradas cartão (cota/outros)</span><span>{fmtReal(resumoFechamento.total_entradas_cartao ?? 0)}</span></div>
            )}
            <div style={{ borderTop: `1px solid ${COM_C.borda}`, paddingTop: 12, display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
              <span>Saldo final espécie</span>
              <span style={{ color: COM_C.marrom }}>{fmtReal(saldoFinal ? parseFloat(saldoFinal) : saldoEsperado)}</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 20 }}>
            <button
              onClick={async () => {
                const aportesEspecie = aportesDia.filter(a => a.forma_pagamento === 'especie')
                const totalAp = aportesEspecie.filter(a => a.tipo === 'aporte').reduce((acc, a) => acc + a.valor, 0)
                const totalSang = aportesEspecie.filter(a => a.tipo === 'sangria').reduce((acc, a) => acc + a.valor, 0)
                const saldoEsp = resumoFechamento.saldo_inicial_especie + totalAp - totalSang - (resumoFechamento.total_saidas_especie ?? 0)
                const saldoCont = saldoFinal ? parseFloat(saldoFinal) : saldoEsp
                await baixarPdf({
                  orgNome: orgNome,
                  orgCnpj: orgCnpj,
                  operadorNome: operadorNome,
                  dataAbertura: resumoFechamento.data,
                  dataFechamento: new Date().toISOString(),
                  saldoInicial: resumoFechamento.saldo_inicial_especie,
                  totalAportes: totalAp,
                  totalSangrias: totalSang,
                  totalSaquesEspecie: resumoFechamento.total_saidas_especie ?? 0,
                  totalPix: resumoFechamento.total_pix ?? 0,
                  totalEntradasPixCota: resumoFechamento.total_entradas_pix ?? 0,
                  totalEntradasCartaoCota: resumoFechamento.total_entradas_cartao ?? 0,
                  saldoEsperado: saldoEsp,
                  saldoContado: saldoCont,
                  diferenca: saldoCont - saldoEsp,
                  aportesSangrias: aportesDia.map(a => ({
                    tipo: a.tipo as 'aporte' | 'sangria',
                    valor: a.valor,
                    formaPagamento: FORMA_LABEL[a.forma_pagamento] ?? a.forma_pagamento,
                    motivo: a.observacoes ?? '',
                    autorizadorNome: a.autorizador?.nome_completo ?? 'Sistema',
                    horario: new Date(a.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                  })),
                  operacoes: operacoesDia.map(op => ({
                    horario: new Date(op.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                    produtor: op.contas_produtor?.produtores?.nome ?? '',
                    produto: op.produtos?.nome ?? '',
                    kg: op.quantidade_produto ?? 0,
                    valorEspecie: op.forma_pagamento === 'especie' ? Math.abs(op.valor_financeiro ?? 0) : 0,
                    valorPix: op.forma_pagamento === 'pix' ? Math.abs(op.valor_financeiro ?? 0) : 0,
                    total: Math.abs(op.valor_financeiro ?? 0),
                  })),
                  movimentacaoProdutos: movimentacaoPorProduto,
                  observacoes: obsFechamento || undefined,
                })
              }}
              style={{ display: 'contents' }}
            >
              <Btn variante="roxo" icone="ti-download" style={{ width: '100%', justifyContent: 'center' }}>
                Baixar PDF do fechamento
              </Btn>
            </button>
            <Btn variante="marrom" onClick={() => { setResumoFechamento(null); setSaldoFinal(''); setObsFechamento(''); init() }}
              style={{ width: '100%', justifyContent: 'center' }}>
              Novo dia
            </Btn>
          </div>
        </ContentCard>
      </div>
    </PageLayout>
  )

  if (!sessao) return (
    <PageLayout
      titulo="Caixa"
      subtitulo="Nenhuma sessão aberta"
      icone="ti-cash"
      breadcrumb={[{ label: 'Caixa' }]}
      fullHeight
      acoes={
        <Btn variante="cinza" icone="ti-arrow-left" onClick={() => router.push('/comercializacao')}>
          Voltar
        </Btn>
      }
    >
      <div style={{ maxWidth: 420 }}>
        <ContentCard title="Abrir caixa" subtitle="Saldo calculado automaticamente pelo sistema">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: COM_C.marromLt, borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 12, color: COM_C.txtSub, marginBottom: 4 }}>Saldo anterior</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: COM_C.marrom }}>{fmtReal(saldoHerdado ?? 0)}</div>
            </div>
            <Btn variante="marrom" icone="ti-lock-open" disabled={abrindo} onClick={handleAbrirCaixa} style={{ width: '100%', justifyContent: 'center' }}>
              {abrindo ? 'Abrindo...' : 'Abrir caixa'}
            </Btn>
          </div>
        </ContentCard>
      </div>
    </PageLayout>
  )

  return (
    <>
      {modalNfe && (
        <ModalNfeEntrada movimentacao_id={modalNfe} onClose={() => setModalNfe(null)} />
      )}

      {confirmarAntecipacao && (
        <Modal
          titulo="Venda antecipada"
          subtitulo="Confirmação necessária"
          onClose={() => setConfirmarAntecipacao(null)}
          largura={440}
          footer={
            <>
              <Btn variante="cinza" onClick={() => setConfirmarAntecipacao(null)}>Cancelar</Btn>
              <Btn variante="marrom" icone="ti-check" onClick={() => confirmarAntecipacao.tipo === 'receber' ? handleReceber(true) : handleSaque(true)}>
                Confirmar
              </Btn>
            </>
          }
        >
          <p style={{ fontSize: 14, color: COM_C.txt, lineHeight: 1.5 }}>{confirmarAntecipacao.mensagem}</p>
        </Modal>
      )}

      {modalAporte && (
        <Modal
          titulo="Aporte / Sangria"
          onClose={() => setModalAporte(false)}
          largura={420}
          footer={
            <>
              <Btn variante="cinza" onClick={() => setModalAporte(false)}>Cancelar</Btn>
              <Btn variante="marrom" icone="ti-check" disabled={
                salvandoAporte || !formAporte.valor || !formAporte.admin_senha ||
                (formAporte.tipo === 'aporte' && formAporte.origemModulo !== 'dinheiro'
                  ? !formAporte.origemAtendenteId || !formAporte.origemEmail
                  : !formAporte.admin_id)
              } onClick={handleAporteSangria}>
                {salvandoAporte ? 'Processando...' : 'Confirmar'}
              </Btn>
            </>
          }
        >
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {(['aporte', 'sangria'] as const).map(t => (
              <button key={t} onClick={() => setFormAporte(f => ({ ...f, tipo: t, origemModulo: 'dinheiro' }))} style={{
                flex: 1, padding: 10, borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                border: `2px solid ${formAporte.tipo === t ? (t === 'aporte' ? COM_C.verde : COM_C.vermelho) : COM_C.borda}`,
                background: formAporte.tipo === t ? (t === 'aporte' ? COM_C.verdeLt : COM_C.vermelhoLt) : '#fff',
                color: formAporte.tipo === t ? (t === 'aporte' ? COM_C.verde : COM_C.vermelho) : COM_C.txtSub,
              }}>
                {t === 'aporte' ? '↓ Aporte' : '↑ Sangria'}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="Valor (R$) *">
              <Input type="number" step="0.01" placeholder="0,00" value={formAporte.valor}
                onChange={e => setFormAporte(f => ({ ...f, valor: e.target.value }))} />
            </Field>
            {formAporte.tipo === 'aporte' && (
              <Field label="Origem">
                <Select value={formAporte.origemModulo} onChange={e => {
                  if (e.target.value === 'loja') selecionarOrigemLoja()
                  else if (e.target.value === 'comercializacao') selecionarOrigemComercial()
                  else setFormAporte(f => ({ ...f, origemModulo: 'dinheiro', origemAtendenteId: '' }))
                }}>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="loja">Caixa da Loja</option>
                  <option value="comercializacao">Caixa de outro atendente (Comercialização)</option>
                </Select>
              </Field>
            )}
            {formAporte.tipo === 'aporte' && formAporte.origemModulo !== 'dinheiro' ? (
              <>
                <Field label={`De qual atendente (${formAporte.origemModulo === 'loja' ? 'Loja' : 'Comercialização'}) *`}>
                  <Select value={formAporte.origemAtendenteId} onChange={e => selecionarAtendenteOrigem(e.target.value)}>
                    <option value="">Selecionar atendente...</option>
                    {(formAporte.origemModulo === 'loja' ? atendentesLoja : atendentesComercial).map(a => (
                      <option key={a.usuario_id} value={a.usuario_id}>
                        {a.nome} {(a.status === 'aberto' || a.status === 'aberta') ? '(caixa aberto)' : '(caixa fechado)'}
                      </option>
                    ))}
                  </Select>
                </Field>
                {saldoOrigemLoja !== null && (
                  <div style={{ fontSize: 12, color: parseFloat(formAporte.valor || '0') > saldoOrigemLoja ? COM_C.vermelho : COM_C.txtSub }}>
                    Saldo disponível nesse caixa: {fmtReal(saldoOrigemLoja)}
                  </div>
                )}
                <Field label="E-mail de quem autoriza *" hint="O próprio atendente de origem ou um admin">
                  <Input type="email" placeholder="nome@exemplo.com" value={formAporte.origemEmail}
                    onChange={e => setFormAporte(f => ({ ...f, origemEmail: e.target.value }))} />
                </Field>
                <Field label="Senha *">
                  <Input type="password" placeholder="••••••••" value={formAporte.admin_senha}
                    onChange={e => setFormAporte(f => ({ ...f, admin_senha: e.target.value }))} />
                </Field>
              </>
            ) : (
              <>
                <Field label="Admin autorizador *">
                  <Select value={formAporte.admin_id} onChange={e => setFormAporte(f => ({ ...f, admin_id: e.target.value }))}>
                    <option value="">Selecionar admin...</option>
                    {admins.map(a => <option key={a.id} value={a.id}>{a.nome_completo}</option>)}
                  </Select>
                </Field>
                <Field label="Senha do admin *">
                  <Input type="password" placeholder="••••••••" value={formAporte.admin_senha}
                    onChange={e => setFormAporte(f => ({ ...f, admin_senha: e.target.value }))} />
                </Field>
              </>
            )}
            <Field label="Observações">
              <Input placeholder="Opcional" value={formAporte.observacoes}
                onChange={e => setFormAporte(f => ({ ...f, observacoes: e.target.value }))} />
            </Field>
          </div>
          {erroAporte && (
            <div style={{ marginTop: 12, background: COM_C.vermelhoLt, border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: COM_C.vermelho }}>
              {erroAporte}
            </div>
          )}
        </Modal>
      )}

      {modalNovoProduto && (
        <Modal
          titulo="Cadastrar novo produto"
          subtitulo="O produto entra direto no catálogo e já fica selecionado na entrega"
          onClose={() => setModalNovoProduto(false)}
          largura={400}
          footer={
            <>
              <Btn variante="cinza" onClick={() => setModalNovoProduto(false)}>Cancelar</Btn>
              <Btn variante="marrom" icone="ti-check" disabled={salvandoNovoProduto || !formNovoProduto.nome} onClick={handleCriarProdutoInline}>
                {salvandoNovoProduto ? 'Salvando...' : 'Cadastrar e selecionar'}
              </Btn>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="Nome *">
              <Input
                placeholder="Nome do produto"
                value={formNovoProduto.nome}
                onChange={e => setFormNovoProduto(f => ({ ...f, nome: e.target.value }))}
              />
            </Field>
            <Field label="Categoria">
              <Input
                placeholder="Opcional"
                value={formNovoProduto.categoria}
                onChange={e => setFormNovoProduto(f => ({ ...f, categoria: e.target.value }))}
              />
            </Field>
            <Field label="Unidade">
              <Select
                value={formNovoProduto.unidade}
                onChange={e => setFormNovoProduto(f => ({ ...f, unidade: e.target.value }))}
              >
                <option value="kg">kg</option>
                <option value="unidade">unidade</option>
                <option value="litro">litro</option>
                <option value="caixa">caixa</option>
              </Select>
            </Field>
          </div>
          {erroNovoProduto && (
            <div style={{ marginTop: 12, background: COM_C.vermelhoLt, border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: COM_C.vermelho }}>
              {erroNovoProduto}
            </div>
          )}
        </Modal>
      )}

      {modalSaida && (
        <Modal
          titulo="Saída avulsa de caixa"
          subtitulo="Despesa operacional paga em espécie"
          onClose={() => setModalSaida(false)}
          largura={480}
          footer={
            <>
              <Btn variante="cinza" onClick={() => setModalSaida(false)}>Cancelar</Btn>
              <Btn
                variante="marrom"
                icone="ti-check"
                disabled={salvandoSaida || !formSaida.descricao || !formSaida.valor || uploadingComprovante}
                onClick={handleSaidaAvulsa}
              >
                {salvandoSaida ? 'Registrando...' : 'Registrar saída'}
              </Btn>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="Descrição *">
              <Input
                placeholder="Ex: Compra de material de escritório"
                value={formSaida.descricao}
                onChange={e => setFormSaida(f => ({ ...f, descricao: e.target.value }))}
              />
            </Field>

            <div style={{ display: 'flex', gap: 12 }}>
              <Field label="Valor (R$) *">
                <Input
                  type="number" step="0.01" placeholder="0,00"
                  value={formSaida.valor}
                  onChange={e => setFormSaida(f => ({ ...f, valor: e.target.value }))}
                />
              </Field>
              <Field label="Data competência *">
                <Input
                  type="date"
                  value={formSaida.data_competencia}
                  onChange={e => setFormSaida(f => ({ ...f, data_competencia: e.target.value }))}
                />
              </Field>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: COM_C.txtSub }}>Categoria</label>
                <button
                  type="button"
                  onClick={() => { setMostrarNovaCategoria(v => !v); setNovaCategoriaNome('') }}
                  style={{ fontSize: 11, color: COM_C.marrom, background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', fontWeight: 600 }}
                >
                  {mostrarNovaCategoria ? '× Cancelar' : '+ Nova categoria'}
                </button>
              </div>
              {mostrarNovaCategoria ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  <Input
                    autoFocus
                    placeholder="Nome da nova categoria..."
                    value={novaCategoriaNome}
                    onChange={e => setNovaCategoriaNome(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCriarCategoria()}
                    style={{ borderColor: COM_C.marrom }}
                  />
                  <Btn
                    variante="marrom"
                    tamanho="sm"
                    disabled={salvandoNovaCategoria || !novaCategoriaNome.trim()}
                    onClick={handleCriarCategoria}
                  >
                    {salvandoNovaCategoria ? '...' : 'Salvar'}
                  </Btn>
                </div>
              ) : (
                <Select
                  value={formSaida.categoria_id}
                  onChange={e => setFormSaida(f => ({ ...f, categoria_id: e.target.value }))}
                >
                  <option value="">Sem categoria</option>
                  {categorias.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.grupo ? `${c.grupo} — ` : ''}{c.nome}
                    </option>
                  ))}
                </Select>
              )}
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <Field label="Nº documento">
                <Input
                  placeholder="NF, recibo..."
                  value={formSaida.numero_documento}
                  onChange={e => setFormSaida(f => ({ ...f, numero_documento: e.target.value }))}
                />
              </Field>
              <Field label="Centro de custo">
                <Input
                  placeholder="Ex: Escritório"
                  value={formSaida.centro_custo}
                  onChange={e => setFormSaida(f => ({ ...f, centro_custo: e.target.value }))}
                />
              </Field>
            </div>

            <Field label="Observações">
              <Textarea
                placeholder="Opcional"
                value={formSaida.observacoes}
                onChange={e => setFormSaida(f => ({ ...f, observacoes: e.target.value }))}
                rows={2}
              />
            </Field>

            <Field label="Comprovante (opcional)">
              {formSaida.comprovante_url ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: COM_C.verdeLt, border: '1px solid #bbf7d0', borderRadius: 8 }}>
                  <i className="ti ti-file-check" style={{ color: COM_C.verde, fontSize: 16 }} />
                  <span style={{ fontSize: 13, color: COM_C.verde, flex: 1 }}>Arquivo enviado</span>
                  <button
                    onClick={() => setFormSaida(f => ({ ...f, comprovante_url: '' }))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: COM_C.txtSub, fontSize: 16 }}
                  >×</button>
                </div>
              ) : (
                <label style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 12px', border: `1px dashed ${COM_C.borda}`, borderRadius: 8,
                  cursor: uploadingComprovante ? 'wait' : 'pointer', fontSize: 13, color: COM_C.txtSub,
                }}>
                  <i className="ti ti-upload" style={{ fontSize: 16 }} />
                  {uploadingComprovante ? 'Enviando...' : 'Clique para anexar PDF, imagem ou foto'}
                  <input
                    type="file" accept="image/*,.pdf" style={{ display: 'none' }}
                    onChange={handleUploadComprovante}
                    disabled={uploadingComprovante}
                  />
                </label>
              )}
            </Field>
          </div>

          {erroSaida && (
            <div style={{ marginTop: 12, background: COM_C.vermelhoLt, border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: COM_C.vermelho }}>
              {erroSaida}
            </div>
          )}
        </Modal>
      )}

      {modalRateio && (
        <Modal
          titulo="Rateio de entrega"
          subtitulo={`${formEntrega.quantidade} ${unidadeEntregaSelecionada} · ${produtos.find(p => p.id === formEntrega.produto_id)?.nome}`}
          onClose={() => setModalRateio(false)}
          largura={560}
          footer={
            <>
              <Btn variante="cinza" onClick={() => setModalRateio(false)}>Cancelar</Btn>
              <Btn variante="marrom" icone="ti-check" disabled={!percentualOk || salvandoRateio} onClick={confirmarRateio}>
                {salvandoRateio ? 'Salvando...' : 'Confirmar entrega'}
              </Btn>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {participantes.map((p, i) => (
              <div key={p.produtor_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: COM_C.bg, border: `1px solid ${COM_C.borda}`, borderRadius: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: COM_C.txt }}>
                    {p.nome}
                    {i === 0 && <span style={{ marginLeft: 6 }}><Badge label="principal" bg={COM_C.marromLt} cor={COM_C.marrom} /></span>}
                  </div>
                  <div style={{ fontSize: 12, color: COM_C.txtSub, marginTop: 2 }}>{p.quantidade_rateada.toFixed(3)} {unidadeEntregaSelecionada}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Input type="number" step="0.01" min="0.01" max="100" value={p.percentual}
                    onChange={e => atualizarPercentual(i, parseFloat(e.target.value) || 0)}
                    style={{ width: 64, padding: '6px 8px', textAlign: 'right' }} />
                  <span style={{ fontSize: 14, color: COM_C.txtSub }}>%</span>
                </div>
                {participantes.length > 1 && (
                  <button onClick={() => removerParticipante(i)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: COM_C.vermelho, fontSize: 16, lineHeight: 1, padding: 4 }}>×</button>
                )}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 8, marginBottom: 16, background: percentualOk ? COM_C.verdeLt : COM_C.vermelhoLt, border: `1px solid ${percentualOk ? '#bbf7d0' : '#fecaca'}` }}>
            <span style={{ fontSize: 13, color: percentualOk ? COM_C.verde : COM_C.vermelho }}>
              {percentualOk ? '✓ Percentuais corretos' : `Total: ${totalPercentual.toFixed(2)}% (faltam ${(100 - totalPercentual).toFixed(2)}%)`}
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: percentualOk ? COM_C.verde : COM_C.vermelho }}>{totalPercentual.toFixed(1)}% / 100%</span>
          </div>
          <Field label="Adicionar participante">
            <div style={{ display: 'flex', gap: 8 }}>
              <Input placeholder="Nome ou CPF..." value={buscaRateio} onChange={e => setBuscaRateio(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && buscarParaRateio()} />
              <Btn variante="azul" onClick={buscarParaRateio}>Buscar</Btn>
            </div>
          </Field>
          {resultadosBuscaRateio.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12, marginBottom: 12 }}>
              {resultadosBuscaRateio.map(p => (
                <ListRow
                  key={p.id}
                  onClick={() => adicionarParticipante(p)}
                  titulo={p.nome}
                  subtitulo={p.tipo_posse ? `${p.tipo_posse} · ${p.percentual_posse ?? 0}%` : p.cpf ?? ''}
                />
              ))}
            </div>
          )}
          {erroRateio && <div style={{ marginBottom: 12, color: COM_C.vermelho, fontSize: 13 }}>{erroRateio}</div>}
        </Modal>
      )}

      <PageLayout
        titulo="Caixa"
        subtitulo={`Inicial: ${fmtReal(sessao.saldo_inicial_especie)}`}
        icone="ti-cash"
        breadcrumb={[{ label: 'Caixa' }]}
        fullHeight
        acoes={
          <>
            <Badge label="Aberto" bg={COM_C.verdeLt} cor={COM_C.verde} dot />
            <Btn variante="marrom-outline" icone="ti-arrows-up-down" onClick={abrirModalAporte}>
              Aporte / Sangria
            </Btn>
            <Btn variante="cinza" icone="ti-receipt" onClick={abrirModalSaida}>
              Saída avulsa
            </Btn>
          </>
        }
      >
        <div className="com-saldo-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 4 }}>Saldo em espécie</div>
            <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em' }}>{fmtReal(saldoEsperado)}</div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 12, opacity: 0.85 }}>
            <div>Saldo inicial: {fmtReal(sessao.saldo_inicial_especie)}</div>
            <div style={{ marginTop: 2 }}>Saídas hoje: {fmtReal(sessao.total_saidas_especie ?? 0)}</div>
          </div>
        </div>

        <Tabs
          tabs={[
            { id: 'buscar', label: 'Produtor', icon: 'ti-search' },
            { id: 'solicitacoes', label: 'Solicitações', icon: 'ti-bell', badge: solicitacoes.length },
            { id: 'operacoes', label: 'Operações do dia', icon: 'ti-list' },
            { id: 'fechar', label: 'Fechar caixa', icon: 'ti-lock' },
          ]}
          ativa={aba}
          onChange={(id) => setAba(id as typeof aba)}
        />

      {aba === 'buscar' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, maxWidth: 360 }}>
              <Input placeholder="Nome ou CPF do produtor..." value={termoBusca}
                onChange={handleTermoBuscaChange} onKeyDown={e => e.key === 'Enter' && handleBuscar()} />
            </div>
            <Btn variante="azul" icone="ti-search" onClick={handleBuscar}>Buscar</Btn>
            {produtorSelecionado && (
              <Btn variante="azul" icone="ti-x" onClick={() => { setProdutorSelecionado(null); setConta(null); setOperacao(null) }}>
                Limpar
              </Btn>
            )}
          </div>

          {resultadosBusca.length > 0 && !produtorSelecionado && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {resultadosBusca.map(p => (
                <ListRow
                  key={p.id}
                  onClick={() => selecionarProdutor(p)}
                  icone="ti-user"
                  titulo={p.nome}
                  subtitulo={`${p.cpf ? mascararCPF(p.cpf) : ''} · ${p.tipo === 'cooperado' ? 'Cooperado' : 'Externo'}${p.tipo_posse ? ` · ${p.tipo_posse}` : ''}`}
                />
              ))}
            </div>
          )}

          {!produtorSelecionado && sessao && operacoesDia.length > 0 && (
            <ContentCard
              title="Operações de hoje"
              subtitle={`${operacoesDia.length} operação(ões)`}
              noPadding
            >
              <div style={{ overflowX: 'auto' }}>
                <table className="com-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Horário', 'Produtor', 'Operação', 'Qtd', 'Valor'].map((h, i) => (
                        <th key={h} style={{ textAlign: i >= 3 ? 'right' : 'left' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {operacoesDia.slice(0, 8).map(op => (
                      <tr key={op.id}>
                        <td style={{ color: COM_C.txtSub, whiteSpace: 'nowrap' }}>
                          {new Date(op.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td>{op.contas_produtor?.produtores?.nome ?? '—'}</td>
                        <td style={{ color: COM_C.txtSub }}>{TIPO_LABEL[op.tipo] ?? op.tipo}</td>
                        <td style={{ textAlign: 'right', color: COM_C.txtSub }}>
                          {op.quantidade_produto
                            ? (() => { const { inteiro, decimal } = formatarKg(op.quantidade_produto); return `${inteiro}${decimal} ${op.produtos?.unidade ?? 'kg'}` })()
                            : '—'}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: op.valor_financeiro ? (TIPOS_ENTRADA.has(op.tipo) ? COM_C.verde : COM_C.txt) : COM_C.txt }}>
                          {op.valor_financeiro ? fmtReal(Math.abs(op.valor_financeiro)) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {operacoesDia.length > 8 && (
                <div style={{ padding: '10px 16px', borderTop: `1px solid ${COM_C.borda}`, textAlign: 'center' }}>
                  <button onClick={() => setAba('operacoes')} style={{
                    background: 'none', border: 'none', color: COM_C.marrom,
                    fontSize: 13, cursor: 'pointer', fontWeight: 600,
                  }}>
                    Ver todas as {operacoesDia.length} operações →
                  </button>
                </div>
              )}
            </ContentCard>
          )}

          {produtorSelecionado && conta && (
            <div>
              <ContentCard title={produtorSelecionado.nome}
                subtitle={`${produtorSelecionado.cpf ? mascararCPF(produtorSelecionado.cpf) : ''} · ${produtorSelecionado.tipo === 'cooperado' ? 'Cooperado' : 'Externo'}${produtorSelecionado.telefone ? ` · ${mascararTelefone(produtorSelecionado.telefone)}` : ''}`}
                action={<Badge label={produtorSelecionado.tipo === 'cooperado' ? 'Cooperado' : 'Externo'} bg={COM_C.marromLt} cor={COM_C.marrom} />}
              >
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {conta.saldos_produto?.filter(s => s.quantidade !== 0).map(s => (
                    <div key={s.produto_id} style={{
                      background: s.quantidade < 0 ? COM_C.vermelhoLt : COM_C.marromLt,
                      border: s.quantidade < 0 ? '1px solid #fecaca' : '1px solid #fde68a',
                      borderRadius: 8, padding: '8px 14px', textAlign: 'center'
                    }}>
                      {s.quantidade < 0
                        ? <div style={{ fontSize: 16, fontWeight: 700, color: COM_C.vermelho }}>−<KgDisplay valor={Math.abs(s.quantidade)} fontSize={16} cor={COM_C.vermelho} unidade={s.produtos.unidade} /></div>
                        : <KgDisplay valor={s.quantidade} fontSize={16} cor={COM_C.marrom} unidade={s.produtos.unidade} />}
                      <div style={{ fontSize: 11, color: COM_C.txtSub, marginTop: 2 }}>{s.produtos.nome}{s.quantidade < 0 ? ' (devendo)' : ''}</div>
                    </div>
                  ))}
                  {conta.saldo_financeiro > 0 && (
                    <div style={{ background: COM_C.verdeLt, border: '1px solid #bbf7d0', borderRadius: 8, padding: '8px 14px', textAlign: 'center' }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: COM_C.verde }}>{fmtReal(conta.saldo_financeiro)}</div>
                      <div style={{ fontSize: 11, color: COM_C.txtSub }}>Saldo financeiro</div>
                    </div>
                  )}
                </div>
              </ContentCard>
              <div style={{ height: 16 }} />

              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <Btn variante="marrom" icone="ti-arrow-down" onClick={() => setOperacao(operacao === 'entrega' ? null : 'entrega')}
                  style={operacao === 'entrega' ? { background: '#fef3c7' } : {}}>
                  Registrar entrega
                </Btn>
                <Btn variante="verde" icone="ti-arrow-up"
                  onClick={() => { setOperacao(operacao === 'receber' ? null : 'receber'); setUltimaMovimentacaoId(null); setStatusOp('idle') }}
                  style={operacao === 'receber' ? { background: '#dcfce7' } : {}}>
                  Pagar produtor
                </Btn>
                <Btn variante="cinza" icone="ti-currency-dollar"
                  onClick={() => { setOperacao(operacao === 'saque' ? null : 'saque'); setUltimaMovimentacaoId(null); setStatusOp('idle') }}
                  style={operacao === 'saque' ? { background: '#f3f4f6' } : {}}>
                  Saque financeiro
                </Btn>
              </div>

              {ultimaMovimentacaoId && (
                <div
                  onClick={() => { setUltimaMovimentacaoId(null); setStatusOp('idle') }}
                  style={{ cursor: 'pointer', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', background: COM_C.verdeLt, border: '1px solid #bbf7d0', borderRadius: 8, padding: '8px 12px' }}
                >
                  <span style={{ color: COM_C.verde, fontSize: 13 }}>✓ Entrega registrada com sucesso.</span>
                  <span onClick={e => e.stopPropagation()}>
                    <BotaoComprovante movimentacao_id={ultimaMovimentacaoId} />
                  </span>
                  <button onClick={e => { e.stopPropagation(); setUltimaMovimentacaoId(null); setStatusOp('idle') }}
                    style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: COM_C.txtSub, fontSize: 18, lineHeight: 1 }}>×</button>
                </div>
              )}
              {ultimaSaqueId && (
                <div
                  onClick={() => setUltimaSaqueId(null)}
                  style={{ cursor: 'pointer', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', background: COM_C.verdeLt, border: '1px solid #bbf7d0', borderRadius: 8, padding: '8px 12px' }}
                >
                  <span style={{ color: COM_C.verde, fontSize: 13 }}>✓ Pagamento registrado com sucesso.</span>
                  <span onClick={e => e.stopPropagation()}>
                    <BotaoComprovantePagamento movimentacao_id={ultimaSaqueId} />
                  </span>
                  <button onClick={e => { e.stopPropagation(); setUltimaSaqueId(null) }}
                    style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: COM_C.txtSub, fontSize: 18, lineHeight: 1 }}>×</button>
                </div>
              )}
              {statusOp === 'erro' && <div style={{ marginBottom: 12, color: COM_C.vermelho, fontSize: 13 }}>{erroMsg}</div>}

              {operacao === 'entrega' && (
                <ContentCard title="Registrar entrega">
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                    <Field label="Produto">
                      <Select
                        value={formEntrega.produto_id}
                        onChange={e => setFormEntrega(f => ({ ...f, produto_id: e.target.value }))}
                        style={{ minWidth: 160 }}
                      >
                        {produtos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                      </Select>
                    </Field>
                    <Field label={`Quantidade (${unidadeEntregaSelecionada})`}>
                      <Input type="number" step={quantidadeFracionada ? '0.001' : '1'} placeholder={quantidadeFracionada ? '0,000' : '0'} value={formEntrega.quantidade}
                        onChange={e => setFormEntrega(f => ({ ...f, quantidade: e.target.value }))}
                        style={{ width: 120 }} />
                    </Field>
                    <Field label={`Preço de custo (R$/${unidadeEntregaSelecionada})`} hint="Opcional — só se esse produto não seguir a cotação diária">
                      <Input type="text" inputMode="decimal" placeholder="0,00" value={formEntrega.preco_custo}
                        onChange={e => setFormEntrega(f => ({ ...f, preco_custo: e.target.value }))}
                        style={{ width: 120 }} />
                    </Field>
                    <Field label="Observações">
                      <Input placeholder="Opcional" value={formEntrega.observacoes} onChange={e => setFormEntrega(f => ({ ...f, observacoes: e.target.value }))} style={{ minWidth: 160 }} />
                    </Field>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                    <Btn variante="marrom" disabled={statusOp === 'salvando' || !formEntrega.quantidade} onClick={handleEntregaSimples}>
                      {statusOp === 'salvando' ? 'Salvando...' : 'Confirmar (individual)'}
                    </Btn>
                    <Btn variante="marrom-outline" disabled={!formEntrega.quantidade || !formEntrega.produto_id} onClick={abrirModalRateio}>
                      Rateio →
                    </Btn>
                    <Btn variante="cinza" icone="ti-plus" onClick={() => setModalNovoProduto(true)}>
                      Inserir produto
                    </Btn>
                  </div>
                </ContentCard>
              )}
              {operacao === 'entrega' && <div style={{ height: 16 }} />}

              {operacao === 'receber' && (
                <ContentCard title="Pagar produtor">
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <Field label="Produto">
                      <Select value={formReceber.produto_id}
                        onChange={e => { setFormReceber(f => ({ ...f, produto_id: e.target.value })); carregarCotacao(e.target.value) }}>
                        <option value="">Selecionar...</option>
                        {saldosSelecao.map(s => {
                          const { inteiro, decimal } = formatarKg(s.saldo)
                          return (
                            <option key={s.produto_id} value={s.produto_id}>
                              {s.nome} (saldo: {inteiro}{decimal} {s.unidade})
                            </option>
                          )
                        })}
                      </Select>
                    </Field>
                    <Field label={`Quantidade (${unidadeReceberSelecionada})`}>
                      <Input type="number" step="0.001" placeholder="0,000" value={formReceber.quantidade}
                        onChange={e => setFormReceber(f => ({ ...f, quantidade: e.target.value }))}
                        style={{ width: 110 }} />
                    </Field>
                    <Field label={`Preço/${unidadeReceberSelecionada} (R$)`}>
                      <Input type="number" step="0.01" placeholder="0,00" value={formReceber.preco_kg}
                        onChange={e => setFormReceber(f => ({ ...f, preco_kg: e.target.value }))}
                        style={{ width: 100 }} />
                    </Field>
                    {formReceber.quantidade && formReceber.preco_kg && (
                      <div style={{ padding: '8px 14px', background: COM_C.marromLt, borderRadius: 8, fontSize: 14, fontWeight: 600, color: COM_C.marrom }}>
                        = {fmtReal(parseFloat(formReceber.quantidade) * parseFloat(formReceber.preco_kg))}
                      </div>
                    )}
                    <Field label="Pagamento">
                      <Select value={formReceber.forma_pagamento} onChange={e => setFormReceber(f => ({ ...f, forma_pagamento: e.target.value as 'especie' | 'pix' }))}>
                        <option value="especie">Espécie</option>
                        <option value="pix">Pix</option>
                      </Select>
                    </Field>
                    {formReceber.forma_pagamento === 'pix' && (
                      <div style={{ minWidth: 200 }}>
                        <PixInput value={formReceber.chave_pix} onChange={v => setFormReceber(f => ({ ...f, chave_pix: v }))} />
                      </div>
                    )}
                    <Btn variante="verde" disabled={statusOp === 'salvando'} onClick={() => handleReceber(false)}>
                      {statusOp === 'salvando' ? 'Salvando...' : 'Confirmar pagamento'}
                    </Btn>
                  </div>
                </ContentCard>
              )}
              {operacao === 'receber' && <div style={{ height: 16 }} />}

              {operacao === 'saque' && (
                <ContentCard title="Saque de saldo financeiro" subtitle={`Saldo disponível: ${fmtReal(conta.saldo_financeiro)}`}>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <Field label="Valor (R$)">
                      <Input type="number" step="0.01" placeholder="0,00" value={formSaque.valor}
                        onChange={e => setFormSaque(f => ({ ...f, valor: e.target.value }))}
                        style={{ width: 130 }} />
                    </Field>
                    <Field label="Pagamento">
                      <Select value={formSaque.forma_pagamento} onChange={e => setFormSaque(f => ({ ...f, forma_pagamento: e.target.value as 'especie' | 'pix' }))}>
                        <option value="especie">Espécie</option>
                        <option value="pix">Pix</option>
                      </Select>
                    </Field>
                    {formSaque.forma_pagamento === 'pix' && (
                      <div style={{ minWidth: 220 }}>
                        <PixInput value={formSaque.chave_pix} onChange={v => setFormSaque(f => ({ ...f, chave_pix: v }))} />
                      </div>
                    )}
                    <Btn variante="marrom" disabled={statusOp === 'salvando'} onClick={() => handleSaque(false)}>
                      {statusOp === 'salvando' ? 'Salvando...' : 'Confirmar saque'}
                    </Btn>
                  </div>
                  {formSaque.valor && parseFloat(formSaque.valor) > Math.max(conta.saldo_financeiro, 0) && (
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', marginTop: 12, paddingTop: 12, borderTop: `1px solid ${COM_C.borda}` }}>
                      <div style={{ fontSize: 13, color: COM_C.txtSub, width: '100%' }}>
                        Valor excede o saldo em conta — o restante ({fmtReal(parseFloat(formSaque.valor) - Math.max(conta.saldo_financeiro, 0))}) precisa ser convertido em produto (venda antecipada):
                      </div>
                      <Field label="Produto (venda antecipada)">
                        <Select value={formSaque.produto_id} onChange={e => setFormSaque(f => ({ ...f, produto_id: e.target.value }))}>
                          <option value="">Selecionar...</option>
                          {saldosSelecao.map(s => {
                            const { inteiro, decimal } = formatarKg(s.saldo)
                            return (
                              <option key={s.produto_id} value={s.produto_id}>{s.nome} (saldo: {inteiro}{decimal} {s.unidade})</option>
                            )
                          })}
                        </Select>
                      </Field>
                      <Field label={`Preço/${unidadeSaqueSelecionada} (R$)`}>
                        <Input type="number" step="0.01" placeholder="0,00" value={formSaque.preco_kg}
                          onChange={e => setFormSaque(f => ({ ...f, preco_kg: e.target.value }))}
                          style={{ width: 100 }} />
                      </Field>
                    </div>
                  )}
                </ContentCard>
              )}
              {operacao === 'saque' && <div style={{ height: 16 }} />}

              {extrato.length > 0 && (
                <ContentCard title="Extrato recente" noPadding>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="com-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <tbody>
                        {extrato.slice(0, 10).map(m => (
                          <tr key={m.id}>
                            <td style={{ color: COM_C.txtSub }}>
                              {new Date(m.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td>{TIPO_LABEL[m.tipo] ?? m.tipo}</td>
                            <td style={{ color: COM_C.txtSub }}>
                              {m.quantidade_produto ? (() => { const {inteiro, decimal} = formatarKg(m.quantidade_produto); return <span>{inteiro}<span style={{fontSize:'0.8em'}}>{decimal}</span> {m.produtos?.unidade ?? 'kg'}</span> })() : ''}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 600, color: m.valor_financeiro ? (TIPOS_ENTRADA.has(m.tipo) ? COM_C.verde : COM_C.vermelho) : COM_C.txt }}>
                              {m.valor_financeiro ? fmtReal(Math.abs(m.valor_financeiro)) : ''}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </ContentCard>
              )}
            </div>
          )}
        </div>
      )}

      {aba === 'solicitacoes' && (
        <div>
          {solicitacoes.length === 0 ? (
            <EmptyState emoji="🔔" titulo="Nenhuma solicitação pendente" descricao="Quando produtores solicitarem pagamento, aparecerão aqui." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {solicitacoes.map(s => (
                <ListRow
                  key={s.id}
                  icone="ti-bell"
                  iconeBg={COM_C.laranjaLt}
                  iconeCor={COM_C.laranja}
                  titulo={s.produtores?.nome ?? 'Produtor'}
                  subtitulo={`${s.quantidade_kg} kg de ${s.produtos?.nome} · ${fmtReal(s.valor_estimado)} · ${s.forma_pagamento === 'pix' ? `Pix: ${s.chave_pix}` : 'Espécie'}`}
                  direita={
                    <Btn variante="marrom" tamanho="sm" onClick={async () => { const p = await buscarProdutor(s.produtores?.nome ?? ''); if (p && p[0]) { await selecionarProdutor(p[0] as ProdutorBusca); setAba('buscar') } }}>
                      Atender
                    </Btn>
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}

      {aba === 'operacoes' && (
        <div>
          <ContentCard
            title="Operações do dia"
            subtitle={`${operacoesDia.length} operação(ões) hoje`}
            action={
              <Btn variante="azul" tamanho="sm" disabled={carregandoOps} onClick={carregarOperacoesDia}>
                {carregandoOps ? 'Atualizando...' : '↻ Atualizar'}
              </Btn>
            }
            noPadding
          >
            <div style={{ overflowX: 'auto' }}>
              <table className="com-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                <thead>
                  <tr>
                    {['Horário', 'Produtor', 'Operação', 'Quantidade', 'Valor', 'Comprovante'].map((h, i) => (
                      <th key={h} style={{ textAlign: i >= 3 && i <= 4 ? 'right' : i === 5 ? 'center' : 'left' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {carregandoOps ? (
                    <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: COM_C.txtSub }}>Carregando...</td></tr>
                  ) : operacoesDia.length === 0 ? (
                    <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: COM_C.txtSub }}>Nenhuma operação registrada ainda.</td></tr>
                  ) : (
                    operacoesDia.map(op => (
                      <tr key={op.id}>
                        <td style={{ color: COM_C.txtSub, whiteSpace: 'nowrap' }}>
                          {new Date(op.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td>{op.contas_produtor?.produtores?.nome ?? '—'}</td>
                        <td>
                          <div>{TIPO_LABEL[op.tipo] ?? op.tipo}</div>
                          {op.produtos && <div style={{ fontSize: 12, color: COM_C.txtSub }}>{op.produtos.nome}</div>}
                        </td>
                        <td style={{ textAlign: 'right', color: COM_C.txtSub }}>
                          {op.quantidade_produto ? (() => { const {inteiro, decimal} = formatarKg(op.quantidade_produto); return <span>{inteiro}<span style={{fontSize:'0.8em'}}>{decimal}</span> {op.produtos?.unidade ?? 'kg'}</span> })() : '—'}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: op.valor_financeiro ? (TIPOS_ENTRADA.has(op.tipo) ? COM_C.verde : COM_C.vermelho) : COM_C.txt }}>
                          {op.valor_financeiro ? fmtReal(Math.abs(op.valor_financeiro)) : '—'}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {op.tipo === 'entrega' && (
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                              <BotaoComprovante movimentacao_id={op.id} />
                              <BotaoNfe movimentacao_id={op.id} />
                              {op.preco_unitario ? (
                                <BotaoEnviarLoja movimentacao_id={op.id} ja_enviado={op.referencia_tipo === 'loja_compra'} />
                              ) : null}
                            </div>
                          )}
                          {(op.tipo === 'saque_especie' || op.tipo === 'saque_pix') && (
                            <BotaoComprovantePagamento movimentacao_id={op.id} />
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </ContentCard>
        </div>
      )}

      {aba === 'fechar' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 480 }}>
          <ContentCard title="Resumo do dia">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: COM_C.txtSub }}>Saldo inicial espécie</span>
                <span>{fmtReal(sessao.saldo_inicial_especie)}</span>
              </div>
              {(() => {
                const aportesEspecie = aportesDia.filter(a => a.forma_pagamento === 'especie')
                const nAportes = aportesEspecie.filter(a => a.tipo === 'aporte').length
                const nSangrias = aportesEspecie.filter(a => a.tipo === 'sangria').length
                return (
                  <>
                    {nAportes > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: COM_C.verde }}>
                        <span>Aportes em espécie ({nAportes})</span>
                        <span>+ {fmtReal(aportesEspecie.filter(a => a.tipo === 'aporte').reduce((acc, a) => acc + a.valor, 0))}</span>
                      </div>
                    )}
                    {nSangrias > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: COM_C.vermelho }}>
                        <span>Sangrias em espécie ({nSangrias})</span>
                        <span>− {fmtReal(aportesEspecie.filter(a => a.tipo === 'sangria').reduce((acc, a) => acc + a.valor, 0))}</span>
                      </div>
                    )}
                  </>
                )
              })()}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: COM_C.txtSub }}>Saídas espécie (pagamentos)</span>
                <span>− {fmtReal(sessao.total_saidas_especie ?? 0)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: COM_C.txtSub }}>Total Pix (pagamentos)</span>
                <span>{fmtReal(sessao.total_pix ?? 0)}</span>
              </div>
              {(sessao.total_entradas_pix ?? 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: COM_C.txtSub }}>Entradas Pix (cota/outros)</span>
                  <span>{fmtReal(sessao.total_entradas_pix ?? 0)}</span>
                </div>
              )}
              {(sessao.total_entradas_cartao ?? 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: COM_C.txtSub }}>Entradas cartão (cota/outros)</span>
                  <span>{fmtReal(sessao.total_entradas_cartao ?? 0)}</span>
                </div>
              )}
              <div style={{ borderTop: `1px solid ${COM_C.borda}`, paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                <span>Saldo esperado em caixa (espécie)</span>
                <span style={{ color: COM_C.marrom }}>{fmtReal(saldoEsperado)}</span>
              </div>
            </div>
          </ContentCard>

          {aportesDia.length > 0 && (
            <ContentCard title="Aportes e sangrias do dia" noPadding>
              {aportesDia.map(a => (
                <div key={a.id} style={{ padding: '12px 22px', borderBottom: `1px solid ${COM_C.borda}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                  <div>
                    <div style={{ fontWeight: 600, color: a.tipo === 'aporte' ? COM_C.verde : COM_C.vermelho }}>
                      {a.tipo === 'aporte' ? '↓ Aporte' : '↑ Sangria'}
                      <span style={{ fontWeight: 500, color: COM_C.txtSub, marginLeft: 6, fontSize: 11 }}>
                        · {FORMA_LABEL[a.forma_pagamento] ?? a.forma_pagamento}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: COM_C.txtSub, marginTop: 2 }}>
                      {new Date(a.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      {a.autorizador && ` · Auth: ${(a.autorizador as any).nome_completo}`}
                    </div>
                    {a.observacoes && <div style={{ fontSize: 12, color: '#A8A29E', marginTop: 2 }}>{a.observacoes}</div>}
                  </div>
                  <span style={{ fontWeight: 700, color: a.tipo === 'aporte' ? COM_C.verde : COM_C.vermelho }}>
                    {a.tipo === 'aporte' ? '+' : '−'} {fmtReal(a.valor)}
                  </span>
                </div>
              ))}
            </ContentCard>
          )}

          <Btn variante="marrom" icone="ti-lock" onClick={() => setModalFechar(true)} style={{ width: '100%', justifyContent: 'center', padding: '12px 18px' }}>
            Fechar caixa
          </Btn>
        </div>
      )}

      {modalFechar && (
        <Modal
          titulo="Confirmar fechamento"
          onClose={() => setModalFechar(false)}
          largura={400}
          footer={
            <>
              <Btn variante="cinza" onClick={() => setModalFechar(false)}>Cancelar</Btn>
              <Btn variante="marrom" icone="ti-check" disabled={fechando} onClick={handleFecharCaixa}>
                {fechando ? 'Fechando...' : 'Confirmar fechamento'}
              </Btn>
            </>
          }
        >
          <div className="com-saldo-bar" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 4 }}>Saldo esperado em caixa</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{fmtReal(saldoEsperado)}</div>
            <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>calculado automaticamente</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="Saldo físico contado (opcional — para conferência)">
              <Input type="number" step="0.01" placeholder="0,00" value={saldoFinal}
                onChange={e => setSaldoFinal(e.target.value)} autoFocus />
              {saldoFinal && (() => {
                const diferenca = parseFloat(saldoFinal) - saldoEsperado
                const cor = Math.abs(diferenca) < 0.01 ? COM_C.verde : diferenca > 0 ? COM_C.verde : COM_C.vermelho
                const label = Math.abs(diferenca) < 0.01 ? '✓ Confere' : diferenca > 0 ? `Sobra ${fmtReal(diferenca)}` : `Falta ${fmtReal(Math.abs(diferenca))}`
                return <span style={{ fontSize: 13, color: cor, fontWeight: 600, marginTop: 4 }}>{label}</span>
              })()}
            </Field>
            <Field label="Observações">
              <Input placeholder="Opcional" value={obsFechamento}
                onChange={e => setObsFechamento(e.target.value)} />
            </Field>
          </div>
        </Modal>
      )}
      </PageLayout>
    </>
  )
}