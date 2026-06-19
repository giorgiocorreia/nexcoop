'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  abrirCaixaLoja,
  buscarCooperadoPorCPF,
  finalizarVenda,
  registrarSangriaLoja,
  fecharCaixaLoja,
} from '@/lib/loja/actions'
import type { ResumoFechamento } from '@/lib/loja/actions'
import { podeVenderLoja, orgTemModulo } from '@/lib/permissoes'
import { fmtReal } from '@/lib/comercializacao/fmt'
import { Btn } from '@/components/ui/Btn'
import PainelProdutos from './components/PainelProdutos'
import PainelCarrinho from './components/PainelCarrinho'
import BadgeCooperado from './components/BadgeCooperado'
import ModalQuantidade from './components/ModalQuantidade'
import ModalAutorizacao from './components/ModalAutorizacao'
import ModalPagamento from './components/ModalPagamento'
import ModalComprovante from './components/ModalComprovante'
import ModalFechamentoCaixa from './components/ModalFechamentoCaixa'
import { useToast } from '@/components/ui/Toast'
import type {
  ProdutoLoja,
  ItemCarrinho,
  CooperadoIdentificado,
  EstadoCaixa,
  PendenciaAutorizacao,
  PagamentoVenda,
  LojaTipoCliente,
} from '@/lib/loja/types'

export default function PDVPage() {
  const supabase = createClient()
  const { toast } = useToast()

  const [orgId, setOrgId] = useState<string | null>(null)
  const [usuarioId, setUsuarioId] = useState<string | null>(null)
  const [chavePixOrg, setChavePixOrg] = useState('')
  const [temFiscal, setTemFiscal] = useState(false)
  const [modulos, setModulos] = useState<string[]>([])

  const [caixa, setCaixa] = useState<EstadoCaixa | null>(null)
  const [produtos, setProdutos] = useState<ProdutoLoja[]>([])
  const [cooperado, setCooperado] = useState<CooperadoIdentificado | null>(null)
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([])

  const [produtoSelecionado, setProdutoSelecionado] = useState<ProdutoLoja | null>(null)
  const [modal, setModal] = useState<'quantidade' | 'autorizacao' | 'pagamento' | 'comprovante' | 'sangria' | 'fechamento' | null>(null)
  const [pendencia, setPendencia] = useState<PendenciaAutorizacao | null>(null)
  const [vendaIdFinalizada, setVendaIdFinalizada] = useState<string | null>(null)
  const [resumoFechamento, setResumoFechamento] = useState<ResumoFechamento | null>(null)
  const [fechandoCaixa, setFechandoCaixa] = useState(false)

  const [cpfBusca, setCpfBusca] = useState('')
  const [buscandoCpf, setBuscandoCpf] = useState(false)
  const [erroCpf, setErroCpf] = useState('')

  const [valorAbertura, setValorAbertura] = useState('')
  const [abrindoCaixa, setAbrindoCaixa] = useState(false)

  const [sangriaValor, setSangriaValor] = useState('')
  const [sangriaTipo, setSangriaTipo] = useState<'aporte' | 'sangria'>('sangria')
  const [sangriaObs, setSangriaObs] = useState('')

  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: usuario } = await supabase
        .from('usuarios')
        .select('*, organizacao:organizacoes(*)')
        .eq('id', user.id)
        .single()
      if (!usuario) return

      setUsuarioId(user.id)
      const oid = usuario.organizacao_id
      setOrgId(oid)

      const org = (usuario as any).organizacao
      const modulosOrg = org?.modulos_ativos ?? []
      setModulos(modulosOrg)

      if (!orgTemModulo(modulosOrg, 'loja')) {
        toast('error', 'Módulo Loja não ativo para esta organização.')
        setCarregando(false)
        return
      }

      if (!podeVenderLoja(usuario)) {
        toast('error', 'Você não tem permissão para acessar o PDV.')
        setCarregando(false)
        return
      }

      setChavePixOrg(org?.chave_pix ?? '')

      // Verifica se org tem fiscal configurado (série NF-e sempre existe; NFC-e exige CSC)
      const fiscalConfigurado = !!(org?.loja_nfe_saida_serie || org?.loja_nfce_csc_token)
      setTemFiscal(fiscalConfigurado)

      const { data: caixaAberto } = await supabase
        .from('loja_caixas')
        .select('id, usuario_id, valor_abertura, aberto_em, status')
        .eq('org_id', oid as string)
        .eq('status', 'aberto')
        .maybeSingle()

      if (caixaAberto) setCaixa(caixaAberto as EstadoCaixa)

      const { data: prods } = await supabase
        .from('loja_produtos')
        .select('*')
        .eq('org_id', oid as string)
        .eq('ativo', true)
        .order('nome')

      setProdutos((prods ?? []) as ProdutoLoja[])
      setCarregando(false)
    }
    init()
  }, [])

  const totalBruto = carrinho.reduce((s, i) => s + i.preco_unitario * i.quantidade, 0)
  const totalDesconto = carrinho.reduce((s, i) => s + (i.preco_unitario * i.quantidade * i.desconto_pct / 100), 0)
  const totalLiquido = totalBruto - totalDesconto

  function adicionarAoCarrinho(produto: ProdutoLoja, quantidade: number) {
    const desconto = cooperado && produto.desconto_cooperado ? (produto.desconto_cooperado_pct ?? 0) : 0
    const subtotal = produto.preco_normal * quantidade * (1 - desconto / 100)
    setCarrinho(prev => [...prev, { produto, quantidade, preco_unitario: produto.preco_normal, desconto_pct: desconto, subtotal, desconto_autorizado_por: null }])
    setProdutoSelecionado(null)
    setModal(null)
  }

  function removerItem(index: number) {
    setCarrinho(prev => prev.filter((_, i) => i !== index))
  }

  function limparCarrinho() {
    setCarrinho([])
    setCooperado(null)
  }

  function alterarDesconto(index: number, novoPct: number, _cb: (id: string, nome: string) => void) {
    const item = carrinho[index]
    const padrao = cooperado && item.produto.desconto_cooperado ? (item.produto.desconto_cooperado_pct ?? 0) : 0

    if (novoPct > padrao) {
      setPendencia({
        tipo: 'desconto_extra',
        descricao: `Desconto de ${novoPct}% solicitado. Padrao cooperado: ${padrao}%.`,
        onAutorizado: (autId) => {
          setCarrinho(prev => prev.map((it, i) => {
            if (i !== index) return it
            const subtotal = it.preco_unitario * it.quantidade * (1 - novoPct / 100)
            return { ...it, desconto_pct: novoPct, subtotal, desconto_autorizado_por: autId }
          }))
          setModal(null)
          setPendencia(null)
        },
      })
      setModal('autorizacao')
    } else {
      setCarrinho(prev => prev.map((it, i) => {
        if (i !== index) return it
        const subtotal = it.preco_unitario * it.quantidade * (1 - novoPct / 100)
        return { ...it, desconto_pct: novoPct, subtotal, desconto_autorizado_por: null }
      }))
    }
  }

  async function handleBuscarCooperado() {
    if (!orgId || !cpfBusca.trim()) return
    setBuscandoCpf(true); setErroCpf('')
    const resultado = await buscarCooperadoPorCPF(orgId, cpfBusca)
    setBuscandoCpf(false)
    if (!resultado) { setErroCpf('Cooperado nao encontrado.'); return }
    const temConta = resultado.tem_conta_corrente && orgTemModulo(modulos, 'comercializacao')
    setCooperado({ ...resultado, tem_conta_corrente: temConta })
    setCpfBusca('')
    setCarrinho(prev => prev.map(item => {
      if (!item.produto.desconto_cooperado) return item
      const desconto = item.produto.desconto_cooperado_pct ?? 0
      const subtotal = item.preco_unitario * item.quantidade * (1 - desconto / 100)
      return { ...item, desconto_pct: desconto, subtotal }
    }))
  }

  async function handleAbrirCaixa() {
    if (!orgId || !usuarioId) return
    setAbrindoCaixa(true)
    const res = await abrirCaixaLoja(orgId, usuarioId, parseFloat(valorAbertura.replace(',', '.')) || 0)
    setAbrindoCaixa(false)
    if ('error' in res) { toast('error', res.error); return }
    setCaixa({ id: res.caixaId, usuario_id: usuarioId, valor_abertura: parseFloat(valorAbertura) || 0, aberto_em: new Date().toISOString(), status: 'aberto' })
    setValorAbertura('')
    toast('info', 'Caixa aberto com sucesso.')
  }

  async function handleFinalizarVenda(pagamento: PagamentoVenda) {
    if (!orgId || !usuarioId || !caixa) return
    setModal(null)
    const tipoCliente: LojaTipoCliente = cooperado ? 'cooperado' : 'externo'
    const snap = [...carrinho]

    const res = await finalizarVenda(
      orgId, usuarioId, caixa.id,
      {
        cooperado_id: cooperado?.cooperado_id,
        tipo_cliente: tipoCliente,
        total: totalLiquido,
        desconto_total: totalDesconto,
        pago_especie: pagamento.dinheiro,
        pago_pix: pagamento.pix,
        pago_cartao: pagamento.cartao,
        pago_conta: pagamento.conta_corrente,
        tipo_cartao: pagamento.tipo_cartao,
        cartao_nsu: pagamento.nsu,
        cartao_autorizacao: pagamento.autorizacao,
        pix_identificador: pagamento.pix_identificador,
      },
      snap
    )

    if ('error' in res) { toast('error', 'Erro ao finalizar venda.'); return }
    setVendaIdFinalizada(res.vendaId)
    setModal('comprovante')
    setCarrinho([])
    setCooperado(null)
    setProdutos(prev => prev.map(p => {
      const item = snap.find(i => i.produto.id === p.id)
      if (!item) return p
      return { ...p, estoque_atual: p.estoque_atual - item.quantidade }
    }))
  }

  function handleSangriaClick() {
    const valor = parseFloat(sangriaValor.replace(',', '.')) || 0
    setPendencia({
      tipo: 'sangria',
      descricao: `${sangriaTipo === 'sangria' ? 'Sangria' : 'Aporte'} de ${fmtReal(valor)} solicitado.`,
      onAutorizado: async (autId) => {
        if (!orgId || !usuarioId || !caixa) return
        await registrarSangriaLoja(orgId, caixa.id, sangriaTipo, valor, autId, usuarioId, sangriaObs || undefined)
        setSangriaValor(''); setSangriaObs(''); setModal(null); setPendencia(null)
      },
    })
    setModal('autorizacao')
  }

  async function handleFecharCaixa() {
    if (!orgId || !usuarioId || !caixa) return
    setFechandoCaixa(true)
    const res = await fecharCaixaLoja(orgId, caixa.id, usuarioId)
    setFechandoCaixa(false)
    if ('error' in res) { toast('error', res.error); return }
    setResumoFechamento(res.resumo)
    setModal('fechamento' as any)
  }

  if (carregando) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#6b7280', fontSize: 15 }}>
      Carregando PDV...
    </div>
  )

  if (erro) return <div style={{ padding: 32, color: '#ef4444', fontSize: 15 }}>{erro}</div>

  if (!caixa) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '70vh' }}>
      <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: 12, padding: 36, width: 360, textAlign: 'center' }}>
        <i className="ti ti-cash-register" style={{ fontSize: 48, color: '#E07B30', display: 'block', marginBottom: 12 }} />
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: '#1a1a2e' }}>Abrir Caixa</div>
        <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>Informe o fundo de troco inicial</div>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', textAlign: 'left', marginBottom: 6 }}>Valor de abertura (R$)</label>
        <input type="text" value={valorAbertura} onChange={e => setValorAbertura(e.target.value)} placeholder="0,00" autoFocus
          onKeyDown={e => e.key === 'Enter' && handleAbrirCaixa()}
          style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #d1d5db', borderRadius: 8, fontSize: 16, outline: 'none', boxSizing: 'border-box', marginBottom: 16 }}
        />
        <Btn onClick={handleAbrirCaixa} disabled={abrindoCaixa}
          style={{ width: '100%', justifyContent: 'center', background: '#E07B30', color: '#fff', border: '1.5px solid #E07B30' }}>
          {abrindoCaixa ? 'Abrindo...' : 'Abrir Caixa'}
        </Btn>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', background: '#f8f7f4', overflow: 'hidden' }}>

      <div style={{ background: '#fff', borderBottom: '1px solid #e5e3dc', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <i className="ti ti-shopping-bag" style={{ fontSize: 22, color: '#E07B30' }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>PDV - Loja Agropecuaria</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>Caixa aberto - {new Date(caixa.aberto_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn icone="ti-arrows-transfer-down" variante="cinza" tamanho="sm" onClick={() => setModal('sangria')}>
            Sangria / Aporte
          </Btn>
          <Btn icone="ti-lock" tamanho="sm" onClick={handleFecharCaixa} disabled={fechandoCaixa}
            style={{ background: '#1a1a2e', color: '#fff', border: '1.5px solid #1a1a2e' }}>
            {fechandoCaixa ? 'Fechando...' : 'Fechar Caixa'}
          </Btn>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        <div style={{ width: '60%', borderRight: '1px solid #e5e3dc', background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <PainelProdutos
            produtos={produtos}
            cooperadoIdentificado={!!cooperado}
            onSelecionarProduto={p => { setProdutoSelecionado(p); setModal('quantidade') }}
          />
        </div>

        <div style={{ width: '40%', background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', flexShrink: 0 }}>
            {cooperado ? (
              <BadgeCooperado
                cooperado={cooperado}
                onRemover={() => {
                  setCooperado(null)
                  setCarrinho(prev => prev.map(i => ({ ...i, desconto_pct: 0, subtotal: i.preco_unitario * i.quantidade, desconto_autorizado_por: null })))
                }}
              />
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  value={cpfBusca}
                  onChange={e => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, 11)
                    let mask = v
                    if (v.length > 9)      mask = `${v.slice(0,3)}.${v.slice(3,6)}.${v.slice(6,9)}-${v.slice(9)}`
                    else if (v.length > 6) mask = `${v.slice(0,3)}.${v.slice(3,6)}.${v.slice(6)}`
                    else if (v.length > 3) mask = `${v.slice(0,3)}.${v.slice(3)}`
                    setCpfBusca(mask)
                    setErroCpf('')
                  }}
                  onKeyDown={e => e.key === 'Enter' && handleBuscarCooperado()}
                  placeholder="CPF do cooperado"
                  autoComplete="off"
                  name="pdv_cpf_cooperado"
                  style={{ flex: 1, padding: '7px 10px', border: `1.5px solid ${erroCpf ? '#ef4444' : '#d1d5db'}`, borderRadius: 8, fontSize: 13, outline: 'none' }}
                />
                <Btn tamanho="sm" variante="cinza" onClick={handleBuscarCooperado} disabled={buscandoCpf}>
                  {buscandoCpf ? '...' : 'Buscar'}
                </Btn>
              </div>
            )}
            {erroCpf && <div style={{ color: '#ef4444', fontSize: 11, marginTop: 4 }}>{erroCpf}</div>}
          </div>

          <PainelCarrinho
            itens={carrinho}
            cooperado={cooperado}
            onAlterarDesconto={alterarDesconto}
            onRemoverItem={removerItem}
            onFinalizar={() => setModal('pagamento')}
            onLimpar={limparCarrinho}
            totalBruto={totalBruto}
            totalDesconto={totalDesconto}
            totalLiquido={totalLiquido}
          />
        </div>
      </div>

      {modal === 'quantidade' && produtoSelecionado && (
        <ModalQuantidade
          produto={produtoSelecionado}
          onConfirmar={qtd => adicionarAoCarrinho(produtoSelecionado, qtd)}
          onCancelar={() => { setModal(null); setProdutoSelecionado(null) }}
        />
      )}

      {modal === 'autorizacao' && pendencia && orgId && (
        <ModalAutorizacao
          orgId={orgId}
          titulo={pendencia.tipo === 'desconto_extra' ? 'Autorizar Desconto Extra' : 'Autorizar Sangria'}
          descricao={pendencia.descricao}
          onAutorizado={pendencia.onAutorizado}
          onCancelar={() => { setModal(null); setPendencia(null) }}
        />
      )}

      {modal === 'pagamento' && (
        <ModalPagamento
          total={totalLiquido}
          cooperado={cooperado}
          chavePixOrg={chavePixOrg}
          onConfirmar={handleFinalizarVenda}
          onCancelar={() => setModal(null)}
        />
      )}

      {modal === 'comprovante' && vendaIdFinalizada && orgId && (
        <ModalComprovante
          vendaId={vendaIdFinalizada}
          orgId={orgId}
          temFiscal={temFiscal}
          onNovaVenda={() => { setModal(null); setVendaIdFinalizada(null) }}
        />
      )}

      {modal === 'sangria' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 380, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, color: '#1a1a2e' }}>Sangria / Aporte</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {(['sangria', 'aporte'] as const).map(t => (
                <button key={t} onClick={() => setSangriaTipo(t)}
                  style={{ flex: 1, padding: '8px', borderRadius: 8, border: `2px solid ${sangriaTipo === t ? '#E07B30' : '#e5e3dc'}`, background: sangriaTipo === t ? '#fff8f3' : '#fff', cursor: 'pointer', fontSize: 13, fontWeight: sangriaTipo === t ? 700 : 400, color: sangriaTipo === t ? '#92400e' : '#374151', textTransform: 'capitalize' }}>
                  {t}
                </button>
              ))}
            </div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Valor (R$)</label>
            <input type="text" value={sangriaValor} onChange={e => setSangriaValor(e.target.value)} placeholder="0,00"
              style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #d1d5db', borderRadius: 8, fontSize: 15, outline: 'none', boxSizing: 'border-box', marginBottom: 12 }}
            />
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Observacoes (opcional)</label>
            <input type="text" value={sangriaObs} onChange={e => setSangriaObs(e.target.value)} placeholder="Motivo..."
              style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #d1d5db', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 20 }}
            />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Btn variante="cinza" onClick={() => setModal(null)}>Cancelar</Btn>
              <Btn onClick={handleSangriaClick} disabled={!sangriaValor}
                style={{ background: '#E07B30', color: '#fff', border: '1.5px solid #E07B30' }}>
                Solicitar autorizacao
              </Btn>
            </div>
          </div>
        </div>
      )}

      {modal === 'fechamento' && resumoFechamento && (
        <ModalFechamentoCaixa
          resumo={resumoFechamento}
          confirmando={false}
          onImprimir={() => window.open(`/api/loja/fechamento/${resumoFechamento.caixa_id}`, '_blank')}
          onConfirmar={() => { setModal(null); setResumoFechamento(null); setCaixa(null) }}
          onCancelar={() => { setModal(null); setResumoFechamento(null); setCaixa(null) }}
        />
      )}
    </div>
  )
}
