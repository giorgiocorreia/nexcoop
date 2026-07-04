'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { confirmarComposicaoLote, fecharLote, criarVendaExterna, adicionarEntregaAoLote } from '../actions'
import ModalInformarPagamento from '@/components/comercializacao/ModalInformarPagamento'
import { marcarVendaEntregueAction } from '@/lib/comercializacao/devolucao'
import { BotaoNfe } from '@/components/comercializacao/ModalNfeEntrada'
import { fmt } from '@/lib/fmt'
import { Btn, BtnLink } from '@/components/ui/Btn'
import { PageLayout } from '@/components/comercializacao/ui/PageLayout'
import { KpiCard } from '@/components/comercializacao/ui/KpiCard'
import { ContentCard } from '@/components/comercializacao/ui/ContentCard'
import { Modal } from '@/components/comercializacao/ui/Modal'
import { Field, Input, Select } from '@/components/comercializacao/ui/Field'
import { Badge } from '@/components/comercializacao/ui/Badge'
import { COM_C, STATUS_LOTE } from '@/components/comercializacao/ui/tokens'

const STATUS_ICONE: Record<string, string> = {
  rascunho: 'ti-pencil',
  aberto:   'ti-lock-open',
  em_venda: 'ti-arrow-up-right',
  entregue: 'ti-circle-check',
  pago:     'ti-cash',
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
  const st            = STATUS_LOTE[lote.status] ?? STATUS_LOTE.rascunho

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

  const resultadoBruto = mostrarVenda && precoKg && !isNaN(parseFloat(precoKg))

  const kpiItems = [
    { label: 'Peso total', icon: 'ti-weight', cor: '#185FA5', corLt: '#EFF6FF', valor: fmt.peso(kpis.pesoTotal), sub: `${kpis.sacas} sacas${kpis.resto > 0.001 ? ` + ${fmt.peso(kpis.resto)}` : ''}` },
    { label: 'Entregas', icon: 'ti-package', cor: COM_C.marrom, corLt: COM_C.marromLt, valor: String(kpis.qtd), sub: 'registros selecionados' },
    { label: 'Custo ref. cotação', icon: 'ti-coin', cor: COM_C.verde, corLt: COM_C.verdeLt, valor: fmt.moeda(kpis.valorTotal), sub: `médio ${fmt.moeda(kpis.precoMedio)}/kg` },
    ...(resultadoBruto ? [{ label: 'Resultado bruto', icon: 'ti-trending-up', cor: '#0F766E', corLt: '#F0FDFA', valor: fmt.moeda((parseFloat(precoKg) * kpis.pesoTotal) - kpis.valorTotal), sub: `${fmt.moeda(parseFloat(precoKg))}/kg negociado` }] : []),
  ]

  return (
    <PageLayout
      titulo={`Lote ${lote.codigo}`}
      subtitulo={st.label}
      icone={STATUS_ICONE[lote.status] ?? 'ti-stack-2'}
      breadcrumb={[
        { label: 'Lotes', href: '/comercializacao/lotes' },
        { label: `Lote ${lote.codigo}` },
      ]}
      fullHeight
      acoes={
        <>
          <Badge label={st.label} bg={st.bg} cor={st.cor} />
          {podeEditar && (
            <>
              <Btn
                variante="cinza"
                onClick={handleSalvarComposicao}
                disabled={salvando}
              >
                {salvando ? 'Salvando...' : lote.status === 'rascunho' ? 'Confirmar lote' : 'Atualizar composição'}
              </Btn>
              {lote.status === 'aberto' && selecionados.size > 0 && (
                <Btn variante="marrom" onClick={handleFecharLote}>Fechar lote</Btn>
              )}
            </>
          )}
          {(lote.status === 'em_venda' || lote.status === 'entregue' || lote.status === 'pago') && !mostrarVenda && (
            nfeAutorizada ? (
              <>
                <Badge label={`NF-e nº ${vendaNfe.numero_nfe}`} bg={COM_C.verdeLt} cor={COM_C.verde} />
                <BtnLink
                  variante="cinza"
                  icone="ti-printer"
                  href={vendaNfe.xml_nfe ? vendaNfe.xml_nfe.replace('/XMLs/', '/DANFEs/').replace('-nfe.xml', '-nfe.pdf') : '#'}
                >
                  DANFE
                </BtnLink>
                <BtnLink variante="cinza" icone="ti-file-invoice" href="/comercializacao/fiscal">
                  Notas fiscais
                </BtnLink>
                {vendaNfe?.status === 'confirmada' && (
                  <Btn variante="verde" onClick={handleMarcarEntregue} disabled={processandoEntrega}>
                    {processandoEntrega ? 'Processando...' : 'Marcar entregue'}
                  </Btn>
                )}
                {vendaNfe?.status === 'entregue' && (
                  <Btn variante="verde" onClick={() => setShowModalPagamento(true)}>
                    Informar pagamento
                  </Btn>
                )}
              </>
            ) : (
              <Btn variante="verde" onClick={() => setMostrarVenda(true)}>
                Emitir NF-e de saída
              </Btn>
            )
          )}
        </>
      }
    >
      {/* KPIs */}
      <div
        className={resultadoBruto ? 'com-kpi-grid-4' : undefined}
        style={!resultadoBruto ? { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 } : { marginBottom: 24 }}
      >
        {kpiItems.map(k => (
          <KpiCard
            key={k.label}
            label={k.label}
            value={k.valor}
            sub={k.sub}
            icon={k.icon}
            cor={k.cor}
            corLt={k.corLt}
          />
        ))}
      </div>

      {/* Painel de venda */}
      {mostrarVenda && (
        <div style={{ marginBottom: 24 }}>
        <ContentCard title="Registrar venda">
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <Field label="Comprador">
              <Select value={compradorId} onChange={e => setCompradorId(e.target.value)} style={{ minWidth: 220 }}>
                <option value="">Selecione...</option>
                {compradores.map((c: any) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </Select>
            </Field>
            <Field label="Valor negociado (R$/kg)">
              <Input type="number" step="0.01" value={precoKg} onChange={e => setPrecoKg(e.target.value)} placeholder="0,00" style={{ width: 130 }} />
            </Field>
            <Btn
              variante="marrom"
              onClick={handleCriarVenda}
              disabled={salvando || !compradorId || !precoKg}
            >
              {salvando ? 'Criando...' : 'Avançar para NF-e →'}
            </Btn>
          </div>
        </ContentCard>
        </div>
      )}

      {/* Tabela entregas */}
      <ContentCard
        title={`Entregas ${loteFechado ? 'do lote' : 'disponíveis'}`}
        action={
          <>
            <Badge label={String(todasEntregas.length)} bg={COM_C.marromLt} cor={COM_C.marrom} />
            {!loteFechado && (
              <div style={{ display: 'flex', gap: 12, marginLeft: 12 }}>
                <button onClick={() => setSelecionados(new Set(todasEntregas.map(e => e.id)))} style={{ fontSize: 12, fontWeight: 600, color: '#185FA5', background: 'none', border: 'none', cursor: 'pointer' }}>Marcar todas</button>
                <span style={{ color: COM_C.borda }}>|</span>
                <button onClick={() => setSelecionados(new Set())} style={{ fontSize: 12, fontWeight: 600, color: COM_C.txtSub, background: 'none', border: 'none', cursor: 'pointer' }}>Desmarcar</button>
              </div>
            )}
          </>
        }
        noPadding
      >
        {todasEntregas.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: COM_C.txtSub, fontSize: 13 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📭</div>Nenhuma entrega disponível.
          </div>
        ) : (
          <table className="com-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {!loteFechado && <th style={{ width: 44 }} />}
                {['Produtor', 'Data', 'Kg', 'Cotação', 'NF-e entrada'].map((h, i) => (
                  <th key={h} style={{ textAlign: i >= 2 && i <= 3 ? 'right' : i === 4 ? 'center' : 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {todasEntregas.map((entrega: any) => {
                const sel = selecionados.has(entrega.id)
                return (
                  <tr key={entrega.id} onClick={() => !loteFechado && toggleEntrega(entrega.id)}
                    style={{ cursor: loteFechado ? 'default' : 'pointer', background: sel ? COM_C.verdeLt : '#fff', opacity: loteFechado || sel ? 1 : 0.55 }}>
                    {!loteFechado && (
                      <td style={{ textAlign: 'center' }}>
                        <input type="checkbox" checked={sel} onChange={() => toggleEntrega(entrega.id)} onClick={e => e.stopPropagation()} style={{ accentColor: COM_C.verde, width: 15, height: 15 }} />
                      </td>
                    )}
                    <td style={{ fontWeight: 600 }}>{(entrega.contas_produtor as any)?.produtores?.nome ?? '—'}</td>
                    <td style={{ color: COM_C.txtSub }}>{fmt.data(entrega.created_at)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt.peso(entrega.quantidade_produto)}</td>
                    <td style={{ textAlign: 'right' }}>
                      {entrega.cotacao_dia != null
                        ? <span title={`Cotação de ${entrega.cotacao_data}`}>{fmt.moeda(entrega.cotacao_dia)}/kg</span>
                        : <span style={{ color: COM_C.vermelho, fontSize: 11, fontWeight: 600 }}>Sem cotação</span>}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <BotaoNfe movimentacao_id={entrega.movimentacao_id ?? entrega.id} />
                    </td>
                  </tr>
                )
              })}
            </tbody>

            {loteFechado && entregasDisponiveis.length > 0 && (
              <tbody>
                <tr>
                  <td colSpan={5} style={{ padding: '8px 16px', fontSize: 11, fontWeight: 700, color: COM_C.marrom, textTransform: 'uppercase', letterSpacing: '0.06em', background: '#FEF9C3', borderTop: '2px solid #FDE047' }}>
                    Entregas disponíveis fora deste lote
                  </td>
                </tr>
                {entregasDisponiveis.map((entrega: any) => {
                  const cotacaoAtual = cotacoesEditaveis[entrega.id] ?? (entrega.cotacao_dia != null ? String(entrega.cotacao_dia) : '')
                  return (
                    <tr key={entrega.id} style={{ borderTop: '1px solid #FDE047', background: '#FEFCE8' }}>
                      <td style={{ fontWeight: 600 }}>{(entrega.contas_produtor as any)?.produtores?.nome ?? '—'}</td>
                      <td style={{ color: COM_C.txtSub }}>{fmt.data(entrega.created_at)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt.peso(entrega.quantidade_produto)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                          <span style={{ fontSize: 12, color: COM_C.txtSub }}>R$</span>
                          <Input type="number" step="0.01" value={cotacaoAtual} onChange={e => setCotacoesEditaveis(prev => ({ ...prev, [entrega.id]: e.target.value }))} placeholder="0,00"
                            style={{ width: 80, padding: '5px 8px', fontSize: 12, textAlign: 'right' }} />
                          <span style={{ fontSize: 12, color: COM_C.txtSub }}>/kg</span>
                        </div>
                        {entrega.cotacao_data && <div style={{ fontSize: 10, color: COM_C.marrom, marginTop: 2, textAlign: 'right' }}>cotação de {entrega.cotacao_data}</div>}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <Btn
                          tamanho="sm"
                          variante="marrom-outline"
                          onClick={() => setModalConfirmar({ movimentacaoId: entrega.id, cotacaoValor: parseFloat(cotacaoAtual || '0') })}
                          disabled={inserindo === entrega.id || !cotacaoAtual}
                        >
                          {inserindo === entrega.id ? 'Inserindo...' : '+ Inserir no lote'}
                        </Btn>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            )}
          </table>
        )}
      </ContentCard>

      {/* Modal confirmar inserção */}
      {modalConfirmar && (
        <Modal
          titulo="Inserir entrega no lote?"
          onClose={() => setModalConfirmar(null)}
          footer={
            <>
              <Btn variante="cinza" onClick={() => setModalConfirmar(null)}>Cancelar</Btn>
              <Btn variante="marrom" onClick={confirmarInsercao}>Confirmar inserção</Btn>
            </>
          }
        >
          <p style={{ fontSize: 13, color: COM_C.txtSub, lineHeight: 1.6, margin: 0 }}>
            A entrega será vinculada ao <strong style={{ color: COM_C.txt }}>Lote {lote.codigo}</strong> com cotação de{' '}
            <strong style={{ color: COM_C.txt }}>{fmt.moeda(modalConfirmar.cotacaoValor)}/kg</strong>. O peso total será recalculado.
          </p>
        </Modal>
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
    </PageLayout>
  )
}