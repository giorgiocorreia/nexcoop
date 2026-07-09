'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getProdutorCompleto, editarProdutor } from '@/lib/comercializacao/produtores.actions'
import { getCotacaoHoje } from '@/lib/comercializacao/cotacoes.actions'
import { getContextoUsuario } from '@/lib/cooperados/actions'
import { fmtReal } from '@/lib/comercializacao/fmt'
import { Btn } from '@/components/ui/Btn'
import ModalPromoverCooperado from '@/components/cooperados/ModalPromoverCooperado'
import ModalCaixaFechado from '@/components/comercializacao/ModalCaixaFechado'
import { PageLayout } from '@/components/comercializacao/ui/PageLayout'
import { ContentCard } from '@/components/comercializacao/ui/ContentCard'
import { Modal } from '@/components/comercializacao/ui/Modal'
import { Field, Input, Select } from '@/components/comercializacao/ui/Field'
import { Badge } from '@/components/comercializacao/ui/Badge'
import { COM_C } from '@/components/comercializacao/ui/tokens'

const TIPO_POSSE_LABEL: Record<string, string> = {
  proprietario: 'Proprietário',
  meeiro: 'Meeiro',
  arrendatario: 'Arrendatário',
}

const TIPO_CONTA_LABEL: Record<string, string> = {
  corrente: 'Corrente',
  poupanca: 'Poupança',
  pix: 'Pix',
}

const TIPO_MOV_LABEL: Record<string, string> = {
  entrega: 'Entrega',
  conversao: 'Conversão',
  saque_especie: 'Saque espécie',
  saque_pix: 'Saque Pix',
  ajuste_produto: 'Ajuste produto',
  ajuste_financeiro: 'Ajuste financeiro',
  estorno: 'Estorno',
}

type Produtor = {
  id: string; nome: string; cpf: string | null; telefone: string | null
  email: string | null; municipio: string | null; endereco: string | null
  tipo: string; area_total_ha: number | null; area_cacau_ha: number | null
  tem_certificacao: boolean; tipo_certificacao: string | null
  banco: string | null; agencia: string | null; conta_bancaria: string | null
  tipo_conta: string | null; chave_pix: string | null; ativo: boolean
  nome_propriedade: string | null; tipo_posse: string | null
  percentual_posse: number | null; ie_produtor_rural: string | null
  conjuge_nome: string | null; conjuge_cpf: string | null
  conjuge_ie_produtor_rural: string | null
  cooperado_id: string | null
}

type SaldoProduto = {
  quantidade: number
  produtos: { id: string; nome: string; unidade: string }
}

type Conta = {
  id: string; saldo_financeiro: number
  saldos_produto: SaldoProduto[]
}

type Movimentacao = {
  id: string; tipo: string; quantidade_produto: number | null
  valor_financeiro: number | null; forma_pagamento: string | null
  created_at: string; observacoes: string | null
  produtos: { nome: string; unidade: string } | null
}

type Sessao = { id: string; status: string }

type PrevisaoSaldo = {
  produto_id: string
  nome: string
  unidade: string
  quantidade: number
  preco: number | null
  valor_estimado: number | null
}

type FormEdit = {
  nome: string
  cpf: string
  email: string
  telefone: string
  tipo: string
  municipio: string
  endereco: string
  nome_propriedade: string
  area_total_ha: string
  area_cacau_ha: string
  tipo_posse: string
  ie_produtor_rural: string
  conjuge_nome: string
  conjuge_cpf: string
  conjuge_ie_produtor_rural: string
  tem_certificacao: boolean
  tipo_certificacao: string
  banco: string
  agencia: string
  conta_bancaria: string
  tipo_conta: string
  chave_pix: string
}

function validarCPF(cpf: string): boolean {
  const d = cpf.replace(/\D/g, '')
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false
  const calc = (len: number) => {
    const sum = d.slice(0, len).split('').reduce((acc, n, i) => acc + +n * (len + 1 - i), 0)
    const r = (sum * 10) % 11
    return r === 10 || r === 11 ? 0 : r
  }
  return calc(9) === +d[9] && calc(10) === +d[10]
}

function mascararCPF(v: string) {
  return v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

function mascararTelefone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3')
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3')
}

function exibirCPF(cpf: string | null): string | null {
  if (!cpf) return null
  const d = cpf.replace(/\D/g, '')
  return d.length === 11 ? mascararCPF(d) : cpf
}

function exibirTelefone(tel: string | null): string | null {
  if (!tel) return null
  return mascararTelefone(tel)
}

function formatarKg(v: number): { inteiro: string; decimal: string } {
  const s = v.toFixed(3).replace(/\.?0+$/, '')
  const [int, dec] = s.split('.')
  return { inteiro: int, decimal: dec ? `,${dec}` : '' }
}

function KgDisplay({ valor, fontSize = 22, cor }: { valor: number; fontSize?: number; cor?: string }) {
  const { inteiro, decimal } = formatarKg(valor)
  return (
    <span style={{ color: cor ?? COM_C.marrom }}>
      <span style={{ fontSize, fontWeight: 700 }}>{inteiro}</span>
      <span style={{ fontSize: fontSize * 0.6, fontWeight: 600 }}>{decimal}</span>
      <span style={{ fontSize: fontSize * 0.55, fontWeight: 400, marginLeft: 2 }}> kg</span>
    </span>
  )
}

function initFormEdit(p: Produtor): FormEdit {
  return {
    nome: p.nome,
    cpf: p.cpf ? p.cpf.replace(/\D/g, '') : '',
    email: p.email ?? '',
    telefone: p.telefone ? mascararTelefone(p.telefone) : '',
    tipo: p.tipo || 'externo',
    municipio: p.municipio ?? '',
    endereco: p.endereco ?? '',
    nome_propriedade: p.nome_propriedade ?? '',
    area_total_ha: p.area_total_ha !== null ? String(p.area_total_ha) : '',
    area_cacau_ha: p.area_cacau_ha !== null ? String(p.area_cacau_ha) : '',
    tipo_posse: p.tipo_posse ?? '',
    ie_produtor_rural: p.ie_produtor_rural ?? '',
    conjuge_nome: p.conjuge_nome ?? '',
    conjuge_cpf: p.conjuge_cpf ? p.conjuge_cpf.replace(/\D/g, '') : '',
    conjuge_ie_produtor_rural: p.conjuge_ie_produtor_rural ?? '',
    tem_certificacao: p.tem_certificacao ?? false,
    tipo_certificacao: p.tipo_certificacao ?? '',
    banco: p.banco ?? '',
    agencia: p.agencia ?? '',
    conta_bancaria: p.conta_bancaria ?? '',
    tipo_conta: p.tipo_conta ?? '',
    chave_pix: p.chave_pix ?? '',
  }
}

const cardLabel: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 600,
  color: COM_C.txtSub,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

function Campo({ label, valor }: { label: string; valor: string | null | undefined }) {
  return (
    <div>
      <div style={{ fontSize: '11px', color: COM_C.txtSub, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '3px', fontWeight: 500 }}>
        {label}
      </div>
      {valor ? (
        <div style={{ fontSize: '14px', color: COM_C.txt }}>{valor}</div>
      ) : (
        <div style={{ fontSize: '14px', color: '#b0aea8', fontStyle: 'italic' }}>Não informado</div>
      )}
    </div>
  )
}

function BlocoHeader({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ ...cardLabel, borderTop: '1px solid #f0ede8', paddingTop: '16px', marginBottom: '12px', marginTop: '4px' }}>
      {children}
    </div>
  )
}

const FORM_VAZIO: FormEdit = {
  nome: '', cpf: '', email: '', telefone: '', tipo: 'externo',
  municipio: '', endereco: '', nome_propriedade: '',
  area_total_ha: '', area_cacau_ha: '', tipo_posse: '',
  ie_produtor_rural: '',
  conjuge_nome: '', conjuge_cpf: '', conjuge_ie_produtor_rural: '',
  tem_certificacao: false,
  tipo_certificacao: '', banco: '', agencia: '',
  conta_bancaria: '', tipo_conta: '', chave_pix: '',
}

export default function PerfilProdutorPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [produtor, setProdutor] = useState<Produtor | null>(null)
  const [conta, setConta] = useState<Conta | null>(null)
  const [extrato, setExtrato] = useState<Movimentacao[]>([])
  const [sessao, setSessao] = useState<Sessao | null>(null)
  const [carregando, setCarregando] = useState(true)

  const [previsoes, setPrevisoes] = useState<PrevisaoSaldo[]>([])
  const [carregandoPrevisao, setCarregandoPrevisao] = useState(false)

  const [editando, setEditando] = useState(false)
  const [formEdit, setFormEdit] = useState<FormEdit>(FORM_VAZIO)
  const [salvando, setSalvando] = useState(false)
  const [erroEdit, setErroEdit] = useState('')
  const [okEdit, setOkEdit] = useState('')

  const [ehAdmin, setEhAdmin] = useState(false)
  const [organizacaoId, setOrganizacaoId] = useState<string | null>(null)
  const [modalPromoverAberto, setModalPromoverAberto] = useState(false)
  const [modalCaixaAcao, setModalCaixaAcao] = useState<'entrega' | 'receber' | 'saque' | null>(null)

  const [modalExtrato, setModalExtrato] = useState(false)
  const [extratoTipo, setExtratoTipo] = useState<'total' | 'periodo'>('total')
  const [extratoInicio, setExtratoInicio] = useState('')
  const [extratoFim, setExtratoFim] = useState('')
  const [gerandoExtrato, setGerandoExtrato] = useState(false)

  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => { carregar() }, [id])

  async function carregar() {
    setCarregando(true)
    try {
      const [res, ctx] = await Promise.all([
        getProdutorCompleto(id),
        getContextoUsuario(),
      ])
      setEhAdmin(ctx.ehAdmin)
      setOrganizacaoId(ctx.organizacaoId)
      const prod = res.produtor as unknown as Produtor
      setProdutor(prod)
      setConta(res.conta as unknown as Conta | null)
      setExtrato(res.extrato as unknown as Movimentacao[])
      setSessao(res.sessaoAberta as unknown as Sessao | null)
      if (prod) setFormEdit(initFormEdit(prod))
      if (res.conta) {
        carregarPrevisoes(res.conta as unknown as Conta, res.produtor?.tipo ?? 'externo')
      }
    } finally {
      setCarregando(false)
    }
  }

  async function carregarPrevisoes(contaDados: Conta, tipoProdutor: string) {
    const saldosComProduto = (contaDados.saldos_produto ?? []).filter(s => s.quantidade > 0)
    if (saldosComProduto.length === 0) return
    setCarregandoPrevisao(true)
    try {
      const lista: PrevisaoSaldo[] = await Promise.all(
        saldosComProduto.map(async (s) => {
          const cot = await getCotacaoHoje(s.produtos.id)
          const preco = cot
            ? (tipoProdutor === 'cooperado' ? (cot as any).preco_cooperado : (cot as any).preco_externo)
            : null
          return {
            produto_id: s.produtos.id,
            nome: s.produtos.nome,
            unidade: s.produtos.unidade,
            quantidade: s.quantidade,
            preco,
            valor_estimado: preco !== null ? parseFloat((s.quantidade * preco).toFixed(2)) : null,
          }
        })
      )
      setPrevisoes(lista)
    } finally {
      setCarregandoPrevisao(false)
    }
  }

  async function handleSalvarEdicao() {
    if (!produtor) return
    if (formEdit.cpf && !validarCPF(formEdit.cpf)) {
      setErroEdit('CPF inválido. Verifique os dígitos informados.')
      return
    }
    if (formEdit.conjuge_cpf && !validarCPF(formEdit.conjuge_cpf)) {
      setErroEdit('CPF do cônjuge inválido. Verifique os dígitos informados.')
      return
    }
    setSalvando(true)
    setErroEdit('')
    try {
      await editarProdutor(produtor.id, {
        nome: formEdit.nome.trim() || undefined,
        cpf: formEdit.cpf.replace(/\D/g, '') || undefined,
        email: formEdit.email.trim() || undefined,
        telefone: formEdit.telefone ? formEdit.telefone.replace(/\D/g, '') : undefined,
        tipo: formEdit.tipo as 'externo' | 'cooperado',
        municipio: formEdit.municipio.trim() || undefined,
        endereco: formEdit.endereco.trim() || undefined,
        nome_propriedade: formEdit.nome_propriedade.trim() || undefined,
        area_total_ha: formEdit.area_total_ha ? parseFloat(formEdit.area_total_ha) : undefined,
        area_cacau_ha: formEdit.area_cacau_ha ? parseFloat(formEdit.area_cacau_ha) : undefined,
        tipo_posse: formEdit.tipo_posse || undefined,
        ie_produtor_rural: formEdit.ie_produtor_rural.trim() || undefined,
        conjuge_nome: formEdit.conjuge_nome.trim() || undefined,
        conjuge_cpf: formEdit.conjuge_cpf ? formEdit.conjuge_cpf.replace(/\D/g, '') : undefined,
        conjuge_ie_produtor_rural: formEdit.conjuge_ie_produtor_rural.trim() || undefined,
        tem_certificacao: formEdit.tem_certificacao,
        tipo_certificacao: formEdit.tem_certificacao ? (formEdit.tipo_certificacao.trim() || undefined) : undefined,
        banco: formEdit.banco.trim() || undefined,
        agencia: formEdit.agencia.trim() || undefined,
        conta_bancaria: formEdit.conta_bancaria.trim() || undefined,
        tipo_conta: formEdit.tipo_conta || undefined,
        chave_pix: formEdit.chave_pix.trim() || undefined,
      })
      setOkEdit('Dados atualizados.')
      setEditando(false)
      setTimeout(() => setOkEdit(''), 3000)
      await carregar()
    } catch (e: unknown) {
      setErroEdit(e instanceof Error ? e.message : 'Erro ao salvar.')
    } finally {
      setSalvando(false)
    }
  }

  function handleGerarExtrato() {
    setGerandoExtrato(true)
    let url = `/api/comercializacao/extrato-produtor/${id}?tipo=${extratoTipo}`
    if (extratoTipo === 'periodo') {
      if (extratoInicio) url += `&inicio=${extratoInicio}`
      if (extratoFim) url += `&fim=${extratoFim}`
    }
    window.open(url, '_blank')
    setGerandoExtrato(false)
    setModalExtrato(false)
  }

  function irParaCaixa(acao: 'entrega' | 'receber' | 'saque') {
    if (!sessao) {
      setModalCaixaAcao(acao)
      return
    }
    router.push(`/comercializacao/caixa?produtor_id=${id}&acao=${acao}`)
  }

  if (carregando) return <div style={{ padding: '32px', color: COM_C.txtSub, fontFamily: 'system-ui' }}>Carregando...</div>
  if (!produtor) return <div style={{ padding: '32px', color: COM_C.txtSub, fontFamily: 'system-ui' }}>Produtor não encontrado.</div>

  const allSaldosProduto = conta?.saldos_produto ?? []
  const mainSaldo = allSaldosProduto.length > 0
    ? allSaldosProduto.reduce((max, s) => s.quantidade > max.quantidade ? s : max, allSaldosProduto[0])
    : null
  const mainPrevisao = mainSaldo ? (previsoes.find(p => p.produto_id === mainSaldo.produtos.id) ?? null) : null
  const saldoFinanceiro = conta?.saldo_financeiro ?? 0
  const temPrevisao = mainPrevisao !== null && mainPrevisao.valor_estimado !== null
  const totalEstimado = (temPrevisao ? mainPrevisao!.valor_estimado! : 0) + saldoFinanceiro

  const f = formEdit
  const setF = (update: Partial<FormEdit>) => setFormEdit(prev => ({ ...prev, ...update }))

  const cols4 = isMobile ? '1fr 1fr' : '1fr 1fr 1fr 1fr'
  const span2: React.CSSProperties = { gridColumn: '1 / 3' }
  const spanAll: React.CSSProperties = { gridColumn: '1 / -1' }

  return (
    <>
      <PageLayout
        titulo={produtor.nome}
        icone="ti-user-check"
        breadcrumb={[
          { label: 'Produtores', href: '/comercializacao/produtores' },
          { label: produtor.nome },
        ]}
        fullHeight
        acoes={
          <>
            <Btn variante="cinza" icone="ti-file-text" onClick={() => setModalExtrato(true)}>
              Extrato
            </Btn>
            <Btn variante="cinza" icone="ti-arrow-down" onClick={() => irParaCaixa('entrega')}>
              Registrar entrega
            </Btn>
            <Btn variante="cinza" icone="ti-arrow-up" onClick={() => irParaCaixa('receber')}>
              Pagar produtor
            </Btn>
            <Btn
              variante="cinza"
              icone="ti-cash"
              onClick={() => saldoFinanceiro > 0 ? irParaCaixa('saque') : undefined}
              disabled={saldoFinanceiro <= 0}
            >
              Saque financeiro
            </Btn>
            {!produtor.cooperado_id ? (
              ehAdmin ? (
                <Btn variante="cinza" icone="ti-user-check" onClick={() => setModalPromoverAberto(true)}>
                  Promover a cooperado
                </Btn>
              ) : null
            ) : (
              <Badge label="Cooperado" bg="#dbeafe" cor="#1e40af" />
            )}
            {!sessao && (
              <Btn
                variante="cinza"
                icone="ti-alert-triangle"
                disabled
                style={{ background: '#fef3c7', border: '1px solid #fbbf24', color: COM_C.marrom, opacity: 1 }}
              >
                Caixa fechado
              </Btn>
            )}
          </>
        }
      >

      {/* Mensagens globais */}
      {okEdit && (
        <div style={{ background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 16px', fontSize: '13px', color: '#166534', marginBottom: '16px' }}>
          ✓ {okEdit}
        </div>
      )}
      {/* PARTE 2: Card "Dados cadastrais" */}
      <div style={{ marginBottom: 20 }}>
      <ContentCard
        title="Dados cadastrais"
        action={
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {editando ? (
              <>
                {erroEdit && (
                  <span style={{ fontSize: '12px', color: '#991b1b' }}>{erroEdit}</span>
                )}
                <Btn tamanho="sm" variante="cinza" onClick={() => { setEditando(false); setErroEdit(''); setFormEdit(initFormEdit(produtor)) }}>
                  Cancelar
                </Btn>
                <Btn tamanho="sm" variante="azul" onClick={handleSalvarEdicao} disabled={salvando}>
                  {salvando ? 'Salvando...' : 'Salvar'}
                </Btn>
              </>
            ) : (
              <Btn tamanho="sm" variante="cinza" icone="ti-pencil" onClick={() => { setEditando(true); setErroEdit('') }}>
                Editar
              </Btn>
            )}
          </div>
        }
      >

        {/* LEITURA — campos e blocos ocultos quando vazios */}
        {!editando && (
          <div>
            {/* Bloco principal — Nome, CPF, Tipo sempre visíveis; E-mail e Telefone só se preenchidos */}
            <div style={{ display: 'grid', gridTemplateColumns: cols4, gap: '16px', marginBottom: '4px' }}>
              <div style={span2}><Campo label="Nome" valor={produtor.nome} /></div>
              <Campo label="CPF" valor={exibirCPF(produtor.cpf)} />
              <Campo label="Tipo" valor={produtor.tipo === 'cooperado' ? 'Cooperado' : 'Não membro'} />
              {produtor.email && (
                <div style={span2}><Campo label="E-mail" valor={produtor.email} /></div>
              )}
              {produtor.telefone && (
                <Campo label="Telefone" valor={exibirTelefone(produtor.telefone)} />
              )}
            </div>

            {/* Bloco Propriedade — oculto se todos os campos estiverem vazios */}
            {(produtor.nome_propriedade || produtor.municipio || produtor.area_total_ha !== null ||
              produtor.area_cacau_ha !== null || produtor.tipo_posse || produtor.ie_produtor_rural ||
              produtor.endereco) && (
              <>
                <BlocoHeader>Propriedade</BlocoHeader>
                <div style={{ display: 'grid', gridTemplateColumns: cols4, gap: '16px', marginBottom: '4px' }}>
                  {produtor.nome_propriedade && (
                    <div style={span2}><Campo label="Nome da propriedade" valor={produtor.nome_propriedade} /></div>
                  )}
                  {produtor.municipio && <Campo label="Município" valor={produtor.municipio} />}
                  {produtor.area_total_ha !== null && <Campo label="Área total (ha)" valor={`${produtor.area_total_ha} ha`} />}
                  {produtor.area_cacau_ha !== null && <Campo label="Área cacau (ha)" valor={`${produtor.area_cacau_ha} ha`} />}
                  {produtor.tipo_posse && <Campo label="Tipo de posse" valor={TIPO_POSSE_LABEL[produtor.tipo_posse] ?? produtor.tipo_posse} />}
                  {produtor.ie_produtor_rural && <Campo label="IE Produtor Rural" valor={produtor.ie_produtor_rural} />}
                  {produtor.endereco && (
                    <div style={spanAll}><Campo label="Endereço" valor={produtor.endereco} /></div>
                  )}
                </div>
              </>
            )}

            {/* Bloco Cônjuge — oculto se todos os campos estiverem vazios */}
            {(produtor.conjuge_nome || produtor.conjuge_cpf || produtor.conjuge_ie_produtor_rural) && (
              <>
                <BlocoHeader>Cônjuge</BlocoHeader>
                <div style={{ display: 'grid', gridTemplateColumns: cols4, gap: '16px', marginBottom: '4px' }}>
                  {produtor.conjuge_nome && (
                    <div style={span2}><Campo label="Nome do cônjuge" valor={produtor.conjuge_nome} /></div>
                  )}
                  {produtor.conjuge_cpf && <Campo label="CPF do cônjuge" valor={exibirCPF(produtor.conjuge_cpf)} />}
                  {produtor.conjuge_ie_produtor_rural && (
                    <Campo label="IE Produtor Rural (cônjuge)" valor={produtor.conjuge_ie_produtor_rural} />
                  )}
                </div>
              </>
            )}

            {/* Bloco Certificação — oculto se não tem certificação */}
            {produtor.tem_certificacao && (
              <>
                <BlocoHeader>Certificação</BlocoHeader>
                <div style={{ display: 'grid', gridTemplateColumns: cols4, gap: '16px', marginBottom: '4px' }}>
                  <Campo label="Possui certificação" valor="Sim" />
                  {produtor.tipo_certificacao && (
                    <Campo label="Tipo de certificação" valor={produtor.tipo_certificacao} />
                  )}
                </div>
              </>
            )}

            {/* Bloco Dados bancários — oculto se todos os campos estiverem vazios */}
            {(produtor.banco || produtor.agencia || produtor.conta_bancaria ||
              produtor.tipo_conta || produtor.chave_pix) && (
              <>
                <BlocoHeader>Dados bancários</BlocoHeader>
                <div style={{ display: 'grid', gridTemplateColumns: cols4, gap: '16px' }}>
                  {produtor.banco && <Campo label="Banco" valor={produtor.banco} />}
                  {produtor.agencia && <Campo label="Agência" valor={produtor.agencia} />}
                  {produtor.conta_bancaria && <Campo label="Conta" valor={produtor.conta_bancaria} />}
                  {produtor.tipo_conta && (
                    <Campo label="Tipo de conta" valor={TIPO_CONTA_LABEL[produtor.tipo_conta] ?? produtor.tipo_conta} />
                  )}
                  {produtor.chave_pix && (
                    <div style={span2}><Campo label="Chave Pix" valor={produtor.chave_pix} /></div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* EDIÇÃO */}
        {editando && (
          <div>
            {/* Bloco principal — 4 colunas */}
            <div style={{ display: 'grid', gridTemplateColumns: cols4, gap: '12px', marginBottom: '4px' }}>
              <div style={span2}>
                <Field label="Nome completo">
                  <Input value={f.nome} onChange={e => setF({ nome: e.target.value })} />
                </Field>
              </div>
              <Field label="CPF">
                <Input value={mascararCPF(f.cpf)} onChange={e => setF({ cpf: e.target.value.replace(/\D/g, '').slice(0, 11) })} placeholder="000.000.000-00" />
              </Field>
              <Field label="Tipo">
                <Select value={f.tipo} onChange={e => setF({ tipo: e.target.value })}>
                  <option value="externo">Não membro</option>
                </Select>
              </Field>
              <div style={span2}>
                <Field label="E-mail">
                  <Input type="email" value={f.email} onChange={e => setF({ email: e.target.value })} />
                </Field>
              </div>
              <Field label="Telefone">
                <Input value={f.telefone} onChange={e => setF({ telefone: mascararTelefone(e.target.value) })} placeholder="(00) 00000-0000" />
              </Field>
            </div>

            {/* Bloco Propriedade — 4 colunas */}
            <BlocoHeader>Propriedade</BlocoHeader>
            <div style={{ display: 'grid', gridTemplateColumns: cols4, gap: '12px', marginBottom: '4px' }}>
              <div style={span2}>
                <Field label="Nome da propriedade">
                  <Input value={f.nome_propriedade} onChange={e => setF({ nome_propriedade: e.target.value })} />
                </Field>
              </div>
              <Field label="Município">
                <Input value={f.municipio} onChange={e => setF({ municipio: e.target.value })} />
              </Field>
              <div />
              <Field label="Área total (ha)">
                <Input type="number" step="0.01" min="0" value={f.area_total_ha} onChange={e => setF({ area_total_ha: e.target.value })} />
              </Field>
              <Field label="Área cacau (ha)">
                <Input type="number" step="0.01" min="0" value={f.area_cacau_ha} onChange={e => setF({ area_cacau_ha: e.target.value })} />
              </Field>
              <Field label="Tipo de posse">
                <Select value={f.tipo_posse} onChange={e => setF({ tipo_posse: e.target.value })}>
                  <option value="">Selecionar...</option>
                  <option value="proprietario">Proprietário</option>
                  <option value="meeiro">Meeiro</option>
                  <option value="arrendatario">Arrendatário</option>
                </Select>
              </Field>
              <Field label="IE Produtor Rural">
                <Input value={f.ie_produtor_rural} onChange={e => setF({ ie_produtor_rural: e.target.value })} />
              </Field>
              <div style={spanAll}>
                <Field label="Endereço">
                  <Input value={f.endereco} onChange={e => setF({ endereco: e.target.value })} />
                </Field>
              </div>
            </div>

            {/* Bloco Cônjuge — 4 colunas */}
            <BlocoHeader>Cônjuge</BlocoHeader>
            <div style={{ display: 'grid', gridTemplateColumns: cols4, gap: '12px', marginBottom: '4px' }}>
              <div style={span2}>
                <Field label="Nome do cônjuge">
                  <Input value={f.conjuge_nome} onChange={e => setF({ conjuge_nome: e.target.value })} placeholder="Nome completo do cônjuge" />
                </Field>
              </div>
              <Field label="CPF do cônjuge">
                <Input value={mascararCPF(f.conjuge_cpf)} onChange={e => setF({ conjuge_cpf: e.target.value.replace(/\D/g, '').slice(0, 11) })} placeholder="000.000.000-00" />
              </Field>
              <Field label="IE Produtor Rural (cônjuge)">
                <Input value={f.conjuge_ie_produtor_rural} onChange={e => setF({ conjuge_ie_produtor_rural: e.target.value })} />
              </Field>
            </div>

            {/* Bloco Certificação — 4 colunas */}
            <BlocoHeader>Certificação</BlocoHeader>
            <div style={{ display: 'grid', gridTemplateColumns: cols4, gap: '12px', marginBottom: '4px' }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', padding: '6px 0' }}>
                  <input type="checkbox" checked={f.tem_certificacao} onChange={e => setF({ tem_certificacao: e.target.checked })} />
                  Possui certificação
                </label>
              </div>
              {f.tem_certificacao && (
                <Field label="Tipo de certificação">
                  <Input value={f.tipo_certificacao} onChange={e => setF({ tipo_certificacao: e.target.value })} placeholder="Ex: Orgânico, UTZ, Rainforest" />
                </Field>
              )}
            </div>

            {/* Bloco Dados bancários — 4 colunas */}
            <BlocoHeader>Dados bancários</BlocoHeader>
            <div style={{ display: 'grid', gridTemplateColumns: cols4, gap: '12px' }}>
              <Field label="Banco">
                <Input value={f.banco} onChange={e => setF({ banco: e.target.value })} />
              </Field>
              <Field label="Agência">
                <Input value={f.agencia} onChange={e => setF({ agencia: e.target.value })} />
              </Field>
              <Field label="Conta">
                <Input value={f.conta_bancaria} onChange={e => setF({ conta_bancaria: e.target.value })} />
              </Field>
              <Field label="Tipo de conta">
                <Select value={f.tipo_conta} onChange={e => setF({ tipo_conta: e.target.value })}>
                  <option value="">Selecionar...</option>
                  <option value="corrente">Corrente</option>
                  <option value="poupanca">Poupança</option>
                  <option value="pix">Pix</option>
                </Select>
              </Field>
              <div style={span2}>
                <Field label="Chave Pix">
                  <Input value={f.chave_pix} onChange={e => setF({ chave_pix: e.target.value })} placeholder="CPF, telefone, e-mail ou chave aleatória" />
                </Field>
              </div>
            </div>
          </div>
        )}
      </ContentCard>
      </div>

      {/* PARTE 3: Card "Extrato" */}
      <div style={{ marginBottom: 20 }}>
      <ContentCard title="Extrato" noPadding>
        {extrato.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: COM_C.txtSub, fontSize: '13px' }}>
            Nenhuma movimentação registrada.
          </div>
        ) : (
          <table className="com-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>Data/Hora</th>
                <th>Operação</th>
                <th style={{ textAlign: 'right' }}>Quantidade</th>
                <th style={{ textAlign: 'right' }}>Valor</th>
              </tr>
            </thead>
            <tbody>
              {extrato.map(m => (
                <tr key={m.id}>
                  <td style={{ color: COM_C.txtSub }}>
                    {new Date(m.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td>
                    <div>{TIPO_MOV_LABEL[m.tipo] ?? m.tipo}</div>
                    {m.observacoes && <div style={{ fontSize: '11px', color: COM_C.txtSub, marginTop: '2px' }}>{m.observacoes}</div>}
                  </td>
                  <td style={{ textAlign: 'right', color: COM_C.txtSub }}>
                    {m.quantidade_produto ? (() => {
                      const { inteiro, decimal } = formatarKg(m.quantidade_produto)
                      return <span>{inteiro}<span style={{ fontSize: '0.8em' }}>{decimal}</span> {m.produtos?.unidade ?? 'kg'}</span>
                    })() : '—'}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 500, color: m.valor_financeiro ? (m.tipo === 'conversao' ? '#166534' : '#991b1b') : COM_C.txt }}>
                    {m.valor_financeiro ? fmtReal(Math.abs(m.valor_financeiro)) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </ContentCard>
      </div>

      {/* PARTE 4: Card "Saldos" */}
      <ContentCard title="Saldos">
        {!conta ? (
          <div style={{ fontSize: '13px', color: '#9a9a9a' }}>Sem conta aberta para este produtor.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {/* Sub-card Produto */}
            <div style={{ background: '#f8f7f4', borderRadius: '10px', padding: '1rem' }}>
              {mainSaldo ? (
                <>
                  <div style={{ fontSize: '11px', color: '#6b6b6b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                    {mainSaldo.produtos.nome}
                  </div>
                  <KgDisplay valor={mainSaldo.quantidade} fontSize={22} />
                  <div style={{ marginTop: '8px' }}>
                    {carregandoPrevisao ? (
                      <div style={{ fontSize: '12px', color: '#9a9a9a' }}>calculando...</div>
                    ) : temPrevisao ? (
                      <>
                        <div style={{ fontSize: '13px', color: '#1a1a1a' }}>
                          ≈ <strong style={{ color: '#166534' }}>{fmtReal(mainPrevisao!.valor_estimado!)}</strong>
                        </div>
                        <div style={{ fontSize: '11px', color: '#9a9a9a', marginTop: '2px' }}>
                          Estimativa à cotação atual @ {fmtReal(mainPrevisao!.preco ?? 0)}/{mainSaldo.produtos.unidade}
                        </div>
                      </>
                    ) : (
                      <div style={{ fontSize: '12px', color: '#9a9a9a' }}>≈ — sem cotação hoje</div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: '11px', color: '#6b6b6b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                    Produto
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: COM_C.marrom }}>
                    0 <span style={{ fontSize: '13px', fontWeight: 400 }}>kg</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#9a9a9a', marginTop: '8px' }}>R$ 0,00</div>
                </>
              )}
            </div>

            {/* Sub-card Saldo financeiro */}
            <div style={{ background: '#E1F5EE', borderRadius: '10px', padding: '1rem' }}>
              <div style={{ fontSize: '11px', color: '#085041', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                Saldo financeiro
              </div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#0F6E56' }}>
                {fmtReal(saldoFinanceiro)}
              </div>
              <div style={{ fontSize: '11px', color: '#085041', marginTop: '6px' }}>Disponível para saque</div>
            </div>

            {/* Sub-card Total estimado */}
            <div style={{ background: '#E6F1FB', borderRadius: '10px', padding: '1rem' }}>
              <div style={{ fontSize: '11px', color: '#0C447C', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                Total estimado
              </div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#185FA5' }}>
                {(mainSaldo && !temPrevisao && !carregandoPrevisao) ? '—' : fmtReal(totalEstimado)}
              </div>
              <div style={{ fontSize: '11px', color: '#0C447C', marginTop: '6px' }}>Produto + financeiro</div>
            </div>
          </div>
        )}
      </ContentCard>

      </PageLayout>

      {/* Modal Extrato PDF */}
      {modalExtrato && (
        <Modal
          titulo="Gerar extrato"
          onClose={() => setModalExtrato(false)}
          footer={
            <>
              <Btn variante="cinza" onClick={() => setModalExtrato(false)}>Cancelar</Btn>
              <Btn variante="azul" icone="ti-file-download" onClick={handleGerarExtrato} disabled={gerandoExtrato}>
                {gerandoExtrato ? 'Gerando...' : 'Gerar PDF'}
              </Btn>
            </>
          }
        >
          <Field label="Período">
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setExtratoTipo('total')}
                style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: `1px solid ${extratoTipo === 'total' ? COM_C.marrom : COM_C.borda}`, background: extratoTipo === 'total' ? COM_C.marromLt : '#fff', color: extratoTipo === 'total' ? COM_C.marrom : COM_C.txtSub, fontWeight: extratoTipo === 'total' ? 600 : 400, cursor: 'pointer', fontSize: 13 }}>
                Extrato total
              </button>
              <button
                onClick={() => setExtratoTipo('periodo')}
                style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: `1px solid ${extratoTipo === 'periodo' ? COM_C.marrom : COM_C.borda}`, background: extratoTipo === 'periodo' ? COM_C.marromLt : '#fff', color: extratoTipo === 'periodo' ? COM_C.marrom : COM_C.txtSub, fontWeight: extratoTipo === 'periodo' ? 600 : 400, cursor: 'pointer', fontSize: 13 }}>
                Por período
              </button>
            </div>
          </Field>

          {extratoTipo === 'periodo' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
              <Field label="Data início">
                <Input type="date" value={extratoInicio} onChange={e => setExtratoInicio(e.target.value)} />
              </Field>
              <Field label="Data fim">
                <Input type="date" value={extratoFim} onChange={e => setExtratoFim(e.target.value)} />
              </Field>
            </div>
          )}
        </Modal>
      )}

      {/* Modal Caixa Fechado */}
      <ModalCaixaFechado
        aberto={modalCaixaAcao !== null}
        onClose={() => setModalCaixaAcao(null)}
        produtorId={id}
        acao={modalCaixaAcao ?? 'entrega'}
      />

      {/* Modal Promover Cooperado */}
      {modalPromoverAberto && organizacaoId && (
        <ModalPromoverCooperado
          produtorId={produtor.id}
          nome={produtor.nome}
          cpf={produtor.cpf}
          emailAtual={produtor.email}
          organizacaoId={organizacaoId}
          onClose={() => setModalPromoverAberto(false)}
          onSucesso={async () => {
            setModalPromoverAberto(false)
            setOkEdit('Produtor promovido a cooperado.')
            setTimeout(() => setOkEdit(''), 3000)
            await carregar()
          }}
        />
      )}
    </>
  )
}
