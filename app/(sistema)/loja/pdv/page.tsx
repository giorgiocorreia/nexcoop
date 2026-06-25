'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  abrirCaixaLoja,
  buscarCooperadosPorNomeOuCPF,
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
  const [vendaBalcao, setVendaBalcao] = useState(false)
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([])

  const [produtoSelecionado, setProdutoSelecionado] = useState<ProdutoLoja | null>(null)
  const [modal, setModal] = useState<'quantidade' | 'autorizacao' | 'pagamento' | 'comprovante' | 'sangria' | 'fechamento' | null>(null)
  const [pendencia, setPendencia] = useState<PendenciaAutorizacao | null>(null)
  const [vendaIdFinalizada, setVendaIdFinalizada] = useState<string | null>(null)
  const [resumoFechamento, setResumoFechamento] = useState<ResumoFechamento | null>(null)
  const [fechandoCaixa, setFechandoCaixa] = useState(false)
  const [dadosConferencia, setDadosConferencia] = useState<{ valor_fisico_especie: number; valor_fisico_debito: number; valor_fisico_credito: number } | null>(null)

  const [termoBusca, setTermoBusca] = useState('')
  const [buscandoCliente, setBuscandoCliente] = useState(false)
  const [erroCliente, setErroCliente] = useState('')
  const [resultadosBusca, setResultadosBusca] = useState<CooperadoIdentificado[]>([])
  const [mostrarDropdown, setMostrarDropdown] = useState(false)

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
        .eq('usuario_id', user.id)
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
    setVendaBalcao(false)
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

  async function handleBuscarCliente() {
    if (!orgId || !termoBusca.trim() || termoBusca.trim().length < 2) return
    setBuscandoCliente(true); setErroCliente(''); setResultadosBusca([]); setMostrarDropdown(false)
    const resultados = await buscarCooperadosPorNomeOuCPF(orgId, termoBusca)
    setBuscandoCliente(false)
    if (resultados.length === 0) { setErroCliente('Nenhum cooperado encontrado.'); return }
    if (resultados.length === 1) {
      selecionarCooperado(resultados[0])
      return
    }
    setResultadosBusca(resultados)
    setMostrarDropdown(true)
  }

  function selecionarCooperado(resultado: CooperadoIdentificado) {
    const temConta = resultado.tem_conta_corrente && orgTemModulo(modulos, 'comercializacao')
    setCooperado({ ...resultado, tem_conta_corrente: temConta })
    setTermoBusca('')
    setResultadosBusca([])
    setMostrarDropdown(false)
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
    const tipoCliente: LojaTipoCliente = cooperado ? 'cooperado' : vendaBalcao ? 'balcao' : 'externo'
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
      <div style={{ background: '#fff', border: '1px solid #E5E3DC', borderRadius: 12, padding: 36, width: 360, textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: 14, background: '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
          <i className="ti ti-cash-register" style={{ fontSize: 28, color: '#E07B30' }} />
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 6, color: '#1C1917' }}>Abrir Caixa</div>
        <div style={{ fontSize: 13, color: '#78716C', marginBottom: 20 }}>Informe o fundo de troco inicial</div>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#78716C', display: 'block', textAlign: 'left', marginBottom: 6 }}>Valor de abertura (R$)</label>
        <input type="text" value={valorAbertura} onChange={e => setValorAbertura(e.target.value)} placeholder="0,00" autoFocus
          onKeyDown={e => e.key === 'Enter' && handleAbrirCaixa()}
          style={{ width: '100%', padding: '10px 12px', border: `1.5px solid #E5E3DC`, borderRadius: 8, fontSize: 16, outline: 'none', boxSizing: 'border-box', marginBottom: 16 }}
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
      <style>{`
        .pdv-header { padding: 0 32px; }
        @media (max-width: 640px) { .pdv-header { padding: 0 16px 0 56px; } }
      `}</style>

      <div className="pdv-header" style={{ background: '#fff', borderBottom: '1px solid #E5E3DC', minHeight: 88, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, gap: 12, margin: '0 -2rem 0 -2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <i className="ti ti-shopping-bag" style={{ fontSize: 20, color: '#E07B30' }} />
          </div>
          <div>
            <div style={{ fontSize: 19, fontWeight: 800, color: '#1C1917', lineHeight: 1.2 }}>PDV</div>
            <div style={{ fontSize: 12, color: '#78716C', marginTop: 2 }}>
              Loja Agropecuária · Caixa aberto às {new Date(caixa.aberto_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn icone="ti-arrows-transfer-down" variante="cinza" tamanho="sm" onClick={() => setModal('sangria')}>
            Sangria / Aporte
          </Btn>
          <Btn icone="ti-lock" tamanho="sm" onClick={handleFecharCaixa} disabled={fechandoCaixa}
            style={{ background: '#DC2626', color: '#fff', border: '1.5px solid #DC2626' }}>
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
            ) : vendaBalcao ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#fff8f3', border: '1.5px solid #E07B30', borderRadius: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <i className="ti ti-user-off" style={{ fontSize: 16, color: '#E07B30' }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#92400e' }}>Venda Balcão — Consumidor Final</span>
                </div>
                <button onClick={() => setVendaBalcao(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 16, lineHeight: 1 }}>
                  ×
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      value={termoBusca}
                      onChange={e => {
                        setTermoBusca(e.target.value)
                        setErroCliente('')
                        setMostrarDropdown(false)
                      }}
                      onKeyDown={e => e.key === 'Enter' && handleBuscarCliente()}
                      placeholder="Nome ou CPF do cooperado"
                      autoComplete="off"
                      name="pdv_busca_cliente"
                      style={{ flex: 1, padding: '7px 10px', border: `1.5px solid ${erroCliente ? '#ef4444' : '#d1d5db'}`, borderRadius: 8, fontSize: 13, outline: 'none' }}
                    />
                    <Btn tamanho="sm" variante="cinza" onClick={handleBuscarCliente} disabled={buscandoCliente || termoBusca.trim().length < 2}>
                      {buscandoCliente ? '...' : 'Buscar'}
                    </Btn>
                  </div>

                  {mostrarDropdown && resultadosBusca.length > 1 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200, background: '#fff', border: '1.5px solid #d1d5db', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', marginTop: 4, overflow: 'hidden' }}>
                      {resultadosBusca.map(r => (
                        <button
                          key={r.cooperado_id}
                          onClick={() => selecionarCooperado(r)}
                          style={{ display: 'flex', flexDirection: 'column', width: '100%', padding: '8px 12px', background: 'none', border: 'none', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', textAlign: 'left' }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#f8f7f4' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                        >
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>{r.nome}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button onClick={() => setVendaBalcao(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: 'none', border: '1.5px dashed #d1d5db', borderRadius: 8, cursor: 'pointer', fontSize: 12, color: '#6b7280', width: '100%' }}>
                  <i className="ti ti-user-off" style={{ fontSize: 14 }} />
                  Venda Balcão (sem identificação)
                </button>
              </div>
            )}
            {erroCliente && <div style={{ color: '#ef4444', fontSize: 11, marginTop: 4 }}>{erroCliente}</div>}
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
          <div style={{ background: '#fff', border: '1px solid #E5E3DC', borderRadius: 12, padding: 28, width: 380, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 20, color: '#1C1917' }}>Sangria / Aporte</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {(['sangria', 'aporte'] as const).map(t => (
                <button key={t} onClick={() => setSangriaTipo(t)}
                  style={{ flex: 1, padding: '8px', borderRadius: 8, border: `2px solid ${sangriaTipo === t ? '#E07B30' : '#E5E3DC'}`, background: sangriaTipo === t ? '#FFF7ED' : '#fff', cursor: 'pointer', fontSize: 13, fontWeight: sangriaTipo === t ? 700 : 400, color: sangriaTipo === t ? '#92400e' : '#78716C', textTransform: 'capitalize' }}>
                  {t}
                </button>
              ))}
            </div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#78716C', display: 'block', marginBottom: 6 }}>Valor (R$)</label>
            <input type="text" value={sangriaValor} onChange={e => setSangriaValor(e.target.value)} placeholder="0,00"
              style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #E5E3DC', borderRadius: 8, fontSize: 15, outline: 'none', boxSizing: 'border-box', marginBottom: 12 }}
            />
            <label style={{ fontSize: 12, fontWeight: 600, color: '#78716C', display: 'block', marginBottom: 6 }}>Observações (opcional)</label>
            <input type="text" value={sangriaObs} onChange={e => setSangriaObs(e.target.value)} placeholder="Motivo..."
              style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #E5E3DC', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 20 }}
            />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Btn variante="cinza" onClick={() => setModal(null)}>Cancelar</Btn>
              <Btn onClick={handleSangriaClick} disabled={!sangriaValor}
                style={{ background: '#E07B30', color: '#fff', border: '1.5px solid #E07B30' }}>
                Solicitar autorização
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
          onFechar={dados => setDadosConferencia(dados)}
        />
      )}
    </div>
  )
}
