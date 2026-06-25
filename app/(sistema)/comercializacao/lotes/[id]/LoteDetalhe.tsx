'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { confirmarComposicaoLote, fecharLote, criarVendaExterna, adicionarEntregaAoLote } from '../actions'
import ModalInformarPagamento from '@/components/comercializacao/ModalInformarPagamento'
import { marcarVendaEntregueAction } from '@/lib/comercializacao/devolucao'
import { BotaoNfe } from '@/components/comercializacao/ModalNfeEntrada'
import { fmt } from '@/lib/fmt'

const C = {
  cor:   '#92400e',
  corLt: '#FDF8F4',
  borda: '#E5E3DC',
  bg:    '#F8F7F4',
  txt:   '#1C1917',
  sub:   '#78716C',
}

const STATUS: Record<string, { label: string; bg: string; cor: string; icon: string }> = {
  rascunho: { label: 'Rascunho', bg: '#F3F4F6', cor: '#6B7280',  icon: 'ti-pencil'         },
  aberto:   { label: 'Aberto',   bg: '#F0FDF4', cor: '#16A34A',  icon: 'ti-lock-open'      },
  em_venda: { label: 'Em venda', bg: '#FFF7ED', cor: '#C2410C',  icon: 'ti-arrow-up-right'  },
  entregue: { label: 'Entregue', bg: '#EFF6FF', cor: '#185FA5',  icon: 'ti-circle-check'   },
  pago:     { label: 'Pago',     bg: '#F0FDF4', cor: '#16A34A',  icon: 'ti-cash'            },
}

export default function LoteDetalhe({ lote, entregasDoLote, entregasDisponiveis, compradores }: {
  lote: any
  entregasDoLote: any[]
  entregasDisponiveis: any[]
  compradores: any[]
}) {
  const router        = useRouter()
  const fatorSaca     = lote.produtos?.fator_saca ?? 60
  const podeEditar    = lote.status === 'rascunho' || lote.status === 'aberto'
  const loteFechado   = !podeEditar
  const vendaNfe      = (lote.vendas_externas as any[])?.[0] ?? null
  const nfeAutorizada = vendaNfe?.status_nfe === 'autorizada'
  const st            = STATUS[lote.status] ?? STATUS.rascunho

  const todasEntregas = useMemo(() => loteFechado
    ? entregasDoLote.map((e: any) => ({ ...e, _noLote: true }))
    : [...entregasDoLote.map((e: any) => ({ ...e, _noLote: true })), ...entregasDisponiveis.map((e: any) => ({ ...e, _noLote: false }))]
  , [entregasDoLote, entregasDisponiveis, loteFechado])

  const [selecionados, setSelecionados] = useState<Set<string>>(() =>
    new Set((entregasDoLote.length > 0 ? entregasDoLote : entregasDisponiveis).map((e: any) => e.id))
  )

  const kpis = useMemo(() => {
    const sel        = todasEntregas.filter(e => selecionados.has(e.id))
    const pesoTotal  = sel.reduce((acc, e) => acc + (e.quantidade_produto ?? 0), 0)
    const valorTotal = sel.reduce((acc, e) => acc + ((e.cotacao_dia ?? 0) * (e.quantidade_produto ?? 0)), 0)
    const sacas      = Math.floor(pesoTotal / fatorSaca)
    const resto      = pesoTotal % fatorSaca
    const precoMedio = pesoTotal > 0 ? valorTotal / pesoTotal : 0
    return { pesoTotal, valorTotal, sacas, resto, precoMedio, qtd: sel.length }
  }, [selecionados, todasEntregas, fatorSaca])

  const [mostrarVenda, setMostrarVenda]           = useState(false)
  const [compradorId, setCompradorId]             = useState('')
  const [precoKg, setPrecoKg]                     = useState('')
  const [salvando, setSalvando]                   = useState(false)
  const [inserindo, setInserindo]                 = useState<string | null>(null)
  const [cotacoesEditaveis, setCotacoesEditaveis] = useState<Record<string, string>>({})
  const [modalConfirmar, setModalConfirmar]       = useState<{ movimentacaoId: string; cotacaoValor: number } | null>(null)
  const [showModalPagamento, setShowModalPagamento] = useState(false)
  const [processandoEntrega, setProcessandoEntrega] = useState(false)

  const toggleEntrega = (id: string) =>
    setSelecionados(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  async function handleSalvarComposicao() {
    setSalvando(true)
    try { await confirmarComposicaoLote(lote.id, Array.from(selecionados)); router.refresh() }
    catch (e: any) { alert(e.message) }
    finally { setSalvando(false) }
  }

  async function handleFecharLote() {
    if (!confirm('Fechar o lote? Após fechar, as entregas não poderão ser alteradas.')) return
    await fecharLote(lote.id); router.refresh()
  }

  async function handleCriarVenda() {
    if (!compradorId || !precoKg) { alert('Preencha comprador e preço/kg.'); return }
    setSalvando(true)
    try {
      const venda = await criarVendaExterna({ loteId: lote.id, compradorId, dataVenda: new Date().toISOString().split('T')[0], quantidadeKg: lote.peso_total_kg, precoKg: parseFloat(precoKg) })
      router.push(`/comercializacao/lotes/${lote.id}/nfe?venda=${venda.id}`)
    } catch (e: any) { alert(e.message) }
    finally { setSalvando(false) }
  }

  async function handleMarcarEntregue() {
    if (!vendaNfe?.id) return
    setProcessandoEntrega(true)
    const res = await marcarVendaEntregueAction(vendaNfe.id, lote.organizacao_id)
    setProcessandoEntrega(false)
    if (res.success) router.refresh(); else alert(res.error ?? 'Erro')
  }

  async function confirmarInsercao() {
    if (!modalConfirmar) return
    setInserindo(modalConfirmar.movimentacaoId); setModalConfirmar(null)
    try { await adicionarEntregaAoLote(lote.id, modalConfirmar.movimentacaoId, modalConfirmar.cotacaoValor); router.refresh() }
    catch (e: any) { alert(e.message) }
    finally { setInserindo(null) }
  }

  const btnSec = (label: string, onClick: () => void, disabled = false) => (
    <button onClick={onClick} disabled={disabled} style={{ padding: '8px 14px', fontSize: 13, fontWeight: 600, borderRadius: 8, border: `1px solid ${C.borda}`, background: '#fff', color: C.txt, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1, display: 'inline-flex', alignItems: 'center', gap: 5 }}>{label}</button>
  )
  const btnPri = (label: string, onClick: () => void, disabled = false, bg = C.cor) => (
    <button onClick={onClick} disabled={disabled} style={{ padding: '8px 14px', fontSize: 13, fontWeight: 700, borderRadius: 8, border: 'none', background: bg, color: '#fff', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1, display: 'inline-flex', alignItems: 'center', gap: 5 }}>{label}</button>
  )

  const resultadoBruto = mostrarVenda && precoKg && !isNaN(parseFloat(precoKg))

  return (
    <>
      <style>{`
        .ld-header  { padding: 0 32px; min-height: 88px; display: flex; align-items: center; }
        .ld-content { padding: 28px 32px; }
        @media (max-width: 640px) {
          .ld-header  { padding: 0 16px 0 56px; min-height: 60px; }
          .ld-content { padding: 16px; }
        }
      `}</style>

      {/* Header */}
      <header className="ld-header" style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: '#fff', borderBottom: `1px solid ${C.borda}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, margin: '0 -2rem 0 -2rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: st.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className={`ti ${st.icon}`} style={{ fontSize: 20, color: st.cor }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{ fontSize: 19, fontWeight: 800, color: C.txt, margin: 0, lineHeight: 1.2 }}>Lote {lote.codigo}</h1>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: st.bg, color: st.cor, flexShrink: 0 }}>{st.label}</span>
            </div>
            <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>
              <Link href="/comercializacao" style={{ color: C.sub, textDecoration: 'none' }}>Comercialização</Link>
              {' / '}
              <Link href="/comercializacao/lotes" style={{ color: C.sub, textDecoration: 'none' }}>Lotes</Link>
              {' / '}Lote {lote.codigo}
            </div>
          </div>
        </div>

        {/* Ações */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {podeEditar && (
            <>
              {btnSec(salvando ? 'Salvando...' : lote.status === 'rascunho' ? 'Confirmar lote' : 'Atualizar composição', handleSalvarComposicao, salvando)}
              {lote.status === 'aberto' && selecionados.size > 0 && btnPri('Fechar lote', handleFecharLote)}
            </>
          )}
          {(lote.status === 'em_venda' || lote.status === 'entregue' || lote.status === 'pago') && !mostrarVenda && (
            nfeAutorizada ? (
              <>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 7, background: '#F0FDF4', color: '#16A34A', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <i className="ti ti-file-check" style={{ fontSize: 12 }} /> NF-e nº {vendaNfe.numero_nfe}
                </span>
                <a href={vendaNfe.xml_nfe ? vendaNfe.xml_nfe.replace('/XMLs/', '/DANFEs/').replace('-nfe.xml', '-nfe.pdf') : '#'} target="_blank" rel="noopener noreferrer"
                  style={{ padding: '8px 12px', fontSize: 13, fontWeight: 600, borderRadius: 8, border: `1px solid ${C.borda}`, background: '#fff', color: C.txt, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <i className="ti ti-printer" style={{ fontSize: 13 }} /> DANFE
                </a>
                <Link href="/comercializacao/fiscal"
                  style={{ padding: '8px 12px', fontSize: 13, fontWeight: 600, borderRadius: 8, border: `1px solid ${C.borda}`, background: '#fff', color: C.txt, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <i className="ti ti-file-invoice" style={{ fontSize: 13 }} /> Notas fiscais
                </Link>
                {vendaNfe?.status === 'confirmada' && btnPri(processandoEntrega ? 'Processando...' : 'Marcar entregue', handleMarcarEntregue, processandoEntrega, '#16A34A')}
                {vendaNfe?.status === 'entregue'   && btnPri('Informar pagamento', () => setShowModalPagamento(true))}
              </>
            ) : (
              btnPri('Emitir NF-e de saída', () => setMostrarVenda(true), false, '#16A34A')
            )
          )}
        </div>
      </header>

      {/* Conteúdo */}
      <div className="ld-content" style={{ background: C.bg, margin: '0 -2rem -2rem -2rem', minHeight: 'calc(100vh - 88px)' }}>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${resultadoBruto ? 4 : 3}, 1fr)`, gap: 14, marginBottom: 24 }}>
          {[
            { label: 'Peso total',        icon: 'ti-weight',      cor: '#185FA5', bg: '#EFF6FF', valor: fmt.peso(kpis.pesoTotal),    sub: `${kpis.sacas} sacas${kpis.resto > 0.001 ? ` + ${fmt.peso(kpis.resto)}` : ''}` },
            { label: 'Entregas',          icon: 'ti-package',     cor: C.cor,     bg: C.corLt,  valor: String(kpis.qtd),            sub: 'registros selecionados' },
            { label: 'Custo ref. cotação',icon: 'ti-coin',        cor: '#16A34A', bg: '#F0FDF4', valor: fmt.moeda(kpis.valorTotal),  sub: `médio ${fmt.moeda(kpis.precoMedio)}/kg` },
            ...(resultadoBruto ? [{ label: 'Resultado bruto', icon: 'ti-trending-up', cor: '#0F766E', bg: '#F0FDFA', valor: fmt.moeda((parseFloat(precoKg) * kpis.pesoTotal) - kpis.valorTotal), sub: `${fmt.moeda(parseFloat(precoKg))}/kg negociado` }] : []),
          ].map(k => (
            <div key={k.label} style={{ background: '#fff', border: `1px solid ${C.borda}`, borderRadius: 14, padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.sub, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k.label}</span>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: k.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className={`ti ${k.icon}`} style={{ fontSize: 14, color: k.cor }} />
                </div>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: C.txt }}>{k.valor}</div>
              <div style={{ fontSize: 11, color: C.sub, marginTop: 4 }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Painel de venda */}
        {mostrarVenda && (
          <div style={{ background: '#fff', border: `1px solid ${C.borda}`, borderRadius: 14, padding: '20px 24px', marginBottom: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.txt, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="ti ti-receipt" style={{ color: C.cor }} /> Registrar venda
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.sub, display: 'block', marginBottom: 5 }}>Comprador</label>
                <select value={compradorId} onChange={e => setCompradorId(e.target.value)}
                  style={{ padding: '9px 12px', borderRadius: 8, border: `1.5px solid ${C.borda}`, fontSize: 13, minWidth: 220, background: '#fff', color: C.txt }}>
                  <option value="">Selecione...</option>
                  {compradores.map((c: any) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.sub, display: 'block', marginBottom: 5 }}>Valor negociado (R$/kg)</label>
                <input type="number" step="0.01" value={precoKg} onChange={e => setPrecoKg(e.target.value)} placeholder="0,00"
                  style={{ padding: '9px 12px', borderRadius: 8, border: `1.5px solid ${C.borda}`, fontSize: 13, width: 130 }} />
              </div>
              {btnPri(salvando ? 'Criando...' : 'Avançar para NF-e →', handleCriarVenda, salvando || !compradorId || !precoKg)}
            </div>
          </div>
        )}

        {/* Tabela entregas */}
        <div style={{ background: '#fff', border: `1px solid ${C.borda}`, borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.borda}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="ti ti-list-details" style={{ color: C.cor, fontSize: 16 }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: C.txt }}>Entregas {loteFechado ? 'do lote' : 'disponíveis'}</span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: C.corLt, color: C.cor }}>{todasEntregas.length}</span>
            </div>
            {!loteFechado && (
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => setSelecionados(new Set(todasEntregas.map(e => e.id)))} style={{ fontSize: 12, fontWeight: 600, color: '#185FA5', background: 'none', border: 'none', cursor: 'pointer' }}>Marcar todas</button>
                <span style={{ color: C.borda }}>|</span>
                <button onClick={() => setSelecionados(new Set())} style={{ fontSize: 12, fontWeight: 600, color: C.sub, background: 'none', border: 'none', cursor: 'pointer' }}>Desmarcar</button>
              </div>
            )}
          </div>

          {todasEntregas.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: C.sub, fontSize: 13 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📭</div>Nenhuma entrega disponível.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: C.bg }}>
                  {!loteFechado && <th style={{ width: 44, padding: '10px 16px' }} />}
                  {['Produtor', 'Data', 'Kg', 'Cotação', 'NF-e entrada'].map((h, i) => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: i >= 2 && i <= 3 ? 'right' : i === 4 ? 'center' : 'left', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.sub }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {todasEntregas.map((entrega: any) => {
                  const sel = selecionados.has(entrega.id)
                  return (
                    <tr key={entrega.id} onClick={() => !loteFechado && toggleEntrega(entrega.id)}
                      style={{ borderTop: `1px solid ${C.borda}`, background: sel ? '#F0FDF4' : '#fff', cursor: loteFechado ? 'default' : 'pointer', opacity: loteFechado || sel ? 1 : 0.55 }}>
                      {!loteFechado && (
                        <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                          <input type="checkbox" checked={sel} onChange={() => toggleEntrega(entrega.id)} onClick={e => e.stopPropagation()} style={{ accentColor: '#16A34A', width: 15, height: 15 }} />
                        </td>
                      )}
                      <td style={{ padding: '10px 16px', fontWeight: 600, color: C.txt }}>{(entrega.contas_produtor as any)?.produtores?.nome ?? '—'}</td>
                      <td style={{ padding: '10px 16px', color: C.sub }}>{fmt.data(entrega.created_at)}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: C.txt }}>{fmt.peso(entrega.quantidade_produto)}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                        {entrega.cotacao_dia != null
                          ? <span title={`Cotação de ${entrega.cotacao_data}`}>{fmt.moeda(entrega.cotacao_dia)}/kg</span>
                          : <span style={{ color: '#DC2626', fontSize: 11, fontWeight: 600 }}>Sem cotação</span>}
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                        <BotaoNfe movimentacao_id={entrega.movimentacao_id ?? entrega.id} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>

              {loteFechado && entregasDisponiveis.length > 0 && (
                <tbody>
                  <tr>
                    <td colSpan={5} style={{ padding: '8px 16px', fontSize: 11, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.06em', background: '#FEF9C3', borderTop: '2px solid #FDE047' }}>
                      Entregas disponíveis fora deste lote
                    </td>
                  </tr>
                  {entregasDisponiveis.map((entrega: any) => {
                    const cotacaoAtual = cotacoesEditaveis[entrega.id] ?? (entrega.cotacao_dia != null ? String(entrega.cotacao_dia) : '')
                    return (
                      <tr key={entrega.id} style={{ borderTop: '1px solid #FDE047', background: '#FEFCE8' }}>
                        <td style={{ padding: '10px 16px', fontWeight: 600, color: C.txt }}>{(entrega.contas_produtor as any)?.produtores?.nome ?? '—'}</td>
                        <td style={{ padding: '10px 16px', color: C.sub }}>{fmt.data(entrega.created_at)}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: C.txt }}>{fmt.peso(entrega.quantidade_produto)}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                            <span style={{ fontSize: 12, color: C.sub }}>R$</span>
                            <input type="number" step="0.01" value={cotacaoAtual} onChange={e => setCotacoesEditaveis(prev => ({ ...prev, [entrega.id]: e.target.value }))} placeholder="0,00"
                              style={{ width: 80, padding: '5px 8px', fontSize: 12, borderRadius: 6, border: `1px solid ${C.borda}`, textAlign: 'right' }} />
                            <span style={{ fontSize: 12, color: C.sub }}>/kg</span>
                          </div>
                          {entrega.cotacao_data && <div style={{ fontSize: 10, color: '#92400e', marginTop: 2, textAlign: 'right' }}>cotação de {entrega.cotacao_data}</div>}
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                          <button onClick={() => setModalConfirmar({ movimentacaoId: entrega.id, cotacaoValor: parseFloat(cotacaoAtual || '0') })}
                            disabled={inserindo === entrega.id || !cotacaoAtual}
                            style={{ padding: '5px 12px', fontSize: 12, fontWeight: 700, borderRadius: 7, border: `1px solid ${C.cor}`, background: '#fff', color: C.cor, cursor: 'pointer', opacity: !cotacaoAtual ? 0.5 : 1 }}>
                            {inserindo === entrega.id ? 'Inserindo...' : '+ Inserir no lote'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              )}
            </table>
          )}
        </div>
      </div>

      {/* Modal confirmar inserção */}
      {modalConfirmar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '28px 32px', width: 420, maxWidth: '90vw', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
            <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 8, color: C.txt }}>Inserir entrega no lote?</div>
            <div style={{ fontSize: 13, color: C.sub, marginBottom: 24, lineHeight: 1.6 }}>
              A entrega será vinculada ao <strong style={{ color: C.txt }}>Lote {lote.codigo}</strong> com cotação de <strong style={{ color: C.txt }}>{fmt.moeda(modalConfirmar.cotacaoValor)}/kg</strong>. O peso total será recalculado.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setModalConfirmar(null)} style={{ flex: 1, padding: '10px 0', fontSize: 13, fontWeight: 600, borderRadius: 9, border: `1px solid ${C.borda}`, background: '#fff', color: C.txt, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={confirmarInsercao} style={{ flex: 1, padding: '10px 0', fontSize: 13, fontWeight: 700, borderRadius: 9, border: 'none', background: C.cor, color: '#fff', cursor: 'pointer' }}>Confirmar inserção</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal pagamento */}
      {showModalPagamento && vendaNfe && (
        <ModalInformarPagamento
          venda={{ id: vendaNfe.id, quantidade_kg: vendaNfe.quantidade_kg, valor_bruto: vendaNfe.valor_bruto, lote_codigo: lote.codigo }}
          orgId={lote.organizacao_id}
          onClose={() => setShowModalPagamento(false)}
          onSuccess={() => { setShowModalPagamento(false); router.refresh() }}
        />
      )}
    </>
  )
}
