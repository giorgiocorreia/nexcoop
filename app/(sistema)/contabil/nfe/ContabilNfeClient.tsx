'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { fmt } from '@/lib/fmt'
import {
  listarNfeSaida,
  kpisNfeSaida,
  sincronizarNfeSaidaAction,
  sincronizarNfesSaidaProcessandoAction,
} from '@/app/(sistema)/comercializacao/fiscal/actions'
import { sincronizarEntradasProcessandoAction } from '@/lib/comercializacao/nfe.actions'
import { listarDevolucoesAction } from '@/lib/comercializacao/devolucao'
import { PageLayout, COM_C, MODULO_CONTABIL } from '@/components/nexcoop/ui'
import { Tabs } from '@/components/comercializacao/ui/Tabs'
import { ContentCard } from '@/components/comercializacao/ui/ContentCard'
import { KpiCard } from '@/components/comercializacao/ui/KpiCard'
import { Badge } from '@/components/comercializacao/ui/Badge'
import { EmptyState } from '@/components/comercializacao/ui/EmptyState'
import { Input, Select } from '@/components/comercializacao/ui/Field'
import { Btn } from '@/components/ui/Btn'

type Aba = 'saidas' | 'entradas' | 'devolucoes'

type NfeSaida = {
  id: string
  chave_nfe: string | null
  numero_nfe: string | null
  serie_nfe: string | null
  status_nfe: string | null
  xml_nfe: string | null
  data_emissao_nfe: string | null
  valor_bruto: number
  lote_id: string | null
  compradores: { nome: string; cnpj: string } | null
  lotes: { codigo: string; produto_descricao: string | null; safras: { ano: number } | null } | null
}

const STATUS_SAIDA: Record<string, { label: string; bg: string; cor: string }> = {
  autorizada:  { label: 'Autorizada',  bg: COM_C.verdeLt, cor: COM_C.verde },
  processando: { label: 'Processando', bg: COM_C.laranjaLt, cor: COM_C.laranja },
  cancelada:   { label: 'Cancelada',   bg: COM_C.vermelhoLt, cor: COM_C.vermelho },
  erro:        { label: 'Erro',        bg: COM_C.laranjaLt, cor: '#9a3412' },
}

function danfeDeXml(xml: string | null) {
  if (!xml) return ''
  return xml.replace('/XMLs/', '/DANFEs/').replace('-nfe.xml', '-nfe.pdf')
}

async function listarEntradas(orgId: string) {
  const res = await fetch(`/api/comercializacao/entradas-nfe?org=${orgId}`)
  if (!res.ok) return []
  return res.json()
}

/**
 * Painel contábil de NF-e — só consulta.
 * Diferente de /comercializacao/fiscal: sem Cancelar, sem CC-e, sem operações
 * de caixa/lote. Ações limitadas a XML, DANFE e sincronizar status na SEFAZ.
 */
export default function ContabilNfeClient({ orgId }: { orgId: string }) {
  const [aba, setAba] = useState<Aba>('saidas')
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const [saidas, setSaidas] = useState<NfeSaida[]>([])
  const [kpis, setKpis] = useState({ total: 0, autorizadas: 0, canceladas: 0, processando: 0, valorTotal: 0 })
  const [entradas, setEntradas] = useState<any[]>([])
  const [devolucoes, setDevolucoes] = useState<any[]>([])
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [syncId, setSyncId] = useState<string | null>(null)
  const [syncTodas, setSyncTodas] = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true)
    setErro(null)
    try {
      // Sincroniza entradas órfãs (processando no banco já autorizadas na SEFAZ)
      try {
        const resumo = await sincronizarEntradasProcessandoAction()
        if (resumo.autorizadas > 0) {
          setMsg(`${resumo.autorizadas} NF-e de entrada sincronizada(s) com a SEFAZ.`)
        }
      } catch {
        /* lista mesmo sem token/rede */
      }

      const [s, k, e, d] = await Promise.all([
        listarNfeSaida(),
        kpisNfeSaida(),
        listarEntradas(orgId),
        listarDevolucoesAction(orgId),
      ])
      setSaidas(s as unknown as NfeSaida[])
      setKpis(k)
      setEntradas(Array.isArray(e) ? e : [])
      setDevolucoes(Array.isArray(d) ? d : [])
    } catch (e: any) {
      setErro(e?.message ?? 'Erro ao carregar notas fiscais.')
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    carregar()
  }, [carregar])

  const saidasFiltradas = useMemo(() => {
    return saidas.filter(n => {
      const okStatus = !filtroStatus || n.status_nfe === filtroStatus
      const q = busca.trim().toLowerCase()
      const okBusca =
        !q ||
        n.compradores?.nome?.toLowerCase().includes(q) ||
        n.numero_nfe?.includes(q) ||
        n.chave_nfe?.toLowerCase().includes(q) ||
        n.lotes?.codigo?.toLowerCase().includes(q)
      return okStatus && okBusca
    })
  }, [saidas, busca, filtroStatus])

  async function syncUmaSaida(nfe: NfeSaida) {
    setSyncId(nfe.id)
    setErro(null)
    try {
      const res = await sincronizarNfeSaidaAction(nfe.id)
      await carregar()
      if (res.status === 'autorizada') setMsg(`NF-e ${res.numero_nfe ?? ''} autorizada.`)
      else if (res.status === 'processando') setMsg('Ainda em processamento na SEFAZ.')
      else setErro(res.erro ?? 'Não foi possível sincronizar.')
    } catch (e: any) {
      setErro(e?.message ?? 'Erro ao sincronizar')
    } finally {
      setSyncId(null)
    }
  }

  async function syncTodasSaidas() {
    setSyncTodas(true)
    setErro(null)
    try {
      const resumo = await sincronizarNfesSaidaProcessandoAction()
      await carregar()
      setMsg(
        resumo.total === 0
          ? 'Nenhuma NF-e de saída em processamento.'
          : `Saídas: ${resumo.autorizadas} autorizada(s), ${resumo.aindaProcessando} processando, ${resumo.erros} erro(s).`,
      )
    } catch (e: any) {
      setErro(e?.message ?? 'Erro ao sincronizar saídas')
    } finally {
      setSyncTodas(false)
    }
  }

  async function syncEntradas() {
    setSyncTodas(true)
    setErro(null)
    try {
      const resumo = await sincronizarEntradasProcessandoAction()
      const e = await listarEntradas(orgId)
      setEntradas(Array.isArray(e) ? e : [])
      setMsg(
        resumo.total === 0
          ? 'Nenhuma entrada em processamento.'
          : `Entradas: ${resumo.autorizadas} autorizada(s), ${resumo.aindaProcessando} processando.`,
      )
    } catch (e: any) {
      setErro(e?.message ?? 'Erro ao sincronizar entradas')
    } finally {
      setSyncTodas(false)
    }
  }

  const abas = [
    { id: 'saidas' as const, label: 'NF-e Saídas', icon: 'ti-arrow-up-right', badge: saidas.length },
    { id: 'entradas' as const, label: 'NF-e Entradas', icon: 'ti-arrow-down-left', badge: entradas.length },
    { id: 'devolucoes' as const, label: 'Devoluções', icon: 'ti-refresh-alert', badge: devolucoes.length },
  ]

  return (
    <PageLayout
      titulo="NF-e — Notas Fiscais"
      subtitulo="Consulta contábil das notas emitidas (sem cancelamento nem CC-e)"
      icone="ti-file-invoice"
      modulo={MODULO_CONTABIL}
      breadcrumb={[{ label: 'NF-e' }]}
      fullHeight
    >
      <Tabs tabs={abas} ativa={aba} onChange={id => setAba(id as Aba)} />

      {msg && (
        <div
          style={{
            marginBottom: 12, padding: '10px 14px', borderRadius: 8,
            background: COM_C.verdeLt, color: COM_C.verde, fontSize: 13,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}
        >
          <span>{msg}</span>
          <button type="button" onClick={() => setMsg(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'inherit' }}>×</button>
        </div>
      )}
      {erro && (
        <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 8, background: COM_C.laranjaLt, color: COM_C.laranjaTxt, fontSize: 13 }}>
          {erro}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: COM_C.txtSub, fontSize: 13 }}>
          Carregando notas fiscais…
        </div>
      ) : (
        <>
          {aba === 'saidas' && (
            <>
              <div className="com-kpi-grid-4" style={{ marginBottom: 16 }}>
                <KpiCard label="Total" value={String(kpis.total)} icon="ti-file-invoice" cor={COM_C.azul} corLt={COM_C.azulLt} />
                <KpiCard label="Autorizadas" value={String(kpis.autorizadas)} icon="ti-circle-check" cor={COM_C.verde} corLt={COM_C.verdeLt} />
                <KpiCard label="Canceladas" value={String(kpis.canceladas)} icon="ti-ban" cor={COM_C.vermelho} corLt={COM_C.vermelhoLt} />
                <KpiCard label="Valor autorizado" value={fmt.moeda(Number(kpis.valorTotal))} icon="ti-currency-real" cor={COM_C.marrom} corLt={COM_C.marromLt} />
              </div>

              <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <Input
                    placeholder="Buscar comprador, nº, chave, lote…"
                    value={busca}
                    onChange={e => setBusca(e.target.value)}
                  />
                </div>
                <div style={{ minWidth: 160 }}>
                  <Select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
                    <option value="">Todos os status</option>
                    <option value="autorizada">Autorizada</option>
                    <option value="processando">Processando</option>
                    <option value="cancelada">Cancelada</option>
                    <option value="erro">Erro</option>
                  </Select>
                </div>
                {saidas.some(n => n.status_nfe === 'processando') && (
                  <Btn variante="marrom" tamanho="sm" icone="ti-refresh" disabled={syncTodas} onClick={syncTodasSaidas}>
                    {syncTodas ? 'Sincronizando…' : 'Sincronizar processando'}
                  </Btn>
                )}
              </div>

              <ContentCard noPadding>
                <div style={{ overflowX: 'auto' }}>
                  <table className="com-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        {['Nº / Série', 'Comprador', 'Lote', 'Valor', 'Emissão', 'Status', 'Documentos'].map(h => (
                          <th key={h} style={{ textAlign: h === 'Documentos' ? 'right' : 'left' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {saidasFiltradas.length === 0 && (
                        <tr>
                          <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: COM_C.txtSub }}>
                            Nenhuma NF-e de saída
                          </td>
                        </tr>
                      )}
                      {saidasFiltradas.map(nfe => {
                        const st = STATUS_SAIDA[nfe.status_nfe ?? ''] ?? {
                          label: nfe.status_nfe ?? '—',
                          bg: '#F1F0EB',
                          cor: COM_C.txtSub,
                        }
                        const danfe = danfeDeXml(nfe.xml_nfe)
                        return (
                          <tr key={nfe.id}>
                            <td style={{ fontWeight: 600 }}>
                              {nfe.numero_nfe ? `${nfe.numero_nfe}/${nfe.serie_nfe ?? '—'}` : '—'}
                            </td>
                            <td>
                              <div style={{ fontWeight: 500 }}>{nfe.compradores?.nome ?? '—'}</div>
                              <div style={{ fontSize: 11, color: COM_C.txtSub }}>{nfe.compradores?.cnpj ?? ''}</div>
                            </td>
                            <td>
                              <div>{nfe.lotes?.codigo ?? '—'}</div>
                              <div style={{ fontSize: 11, color: COM_C.txtSub }}>
                                {nfe.lotes?.produto_descricao ?? ''}
                                {(nfe.lotes as any)?.safras?.ano ? ` · Safra ${(nfe.lotes as any).safras.ano}` : ''}
                              </div>
                            </td>
                            <td style={{ fontWeight: 600 }}>{fmt.moeda(Number(nfe.valor_bruto))}</td>
                            <td style={{ color: COM_C.txtSub }}>
                              {nfe.data_emissao_nfe
                                ? new Date(nfe.data_emissao_nfe).toLocaleDateString('pt-BR')
                                : '—'}
                            </td>
                            <td>
                              <Badge label={st.label} bg={st.bg} cor={st.cor} dot />
                            </td>
                            <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                {nfe.xml_nfe && (
                                  <Btn variante="verde" tamanho="sm" onClick={() => window.open(nfe.xml_nfe!, '_blank')}>
                                    XML
                                  </Btn>
                                )}
                                {nfe.status_nfe === 'autorizada' && danfe && (
                                  <Btn variante="azul" tamanho="sm" onClick={() => window.open(danfe, '_blank')}>
                                    DANFE
                                  </Btn>
                                )}
                                {(nfe.status_nfe === 'processando' || nfe.status_nfe === 'erro') && (
                                  <Btn
                                    variante="marrom"
                                    tamanho="sm"
                                    icone="ti-refresh"
                                    disabled={syncId === nfe.id || syncTodas}
                                    onClick={() => syncUmaSaida(nfe)}
                                  >
                                    {syncId === nfe.id ? '…' : 'Sincronizar'}
                                  </Btn>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </ContentCard>
            </>
          )}

          {aba === 'entradas' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                <Btn variante="marrom" tamanho="sm" icone="ti-refresh" disabled={syncTodas} onClick={syncEntradas}>
                  {syncTodas ? 'Sincronizando…' : 'Sincronizar com SEFAZ'}
                </Btn>
              </div>
              {!entradas.length ? (
                <EmptyState emoji="📥" titulo="Nenhuma NF-e de entrada" />
              ) : (
                <ContentCard noPadding>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="com-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          {['Data', 'Produtor', 'NF-e', 'CFOP', 'Kg', 'Valor', 'Status', 'Docs'].map(h => (
                            <th key={h} style={{ textAlign: h === 'Docs' ? 'right' : 'left' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {entradas.map((n: any) => (
                          <tr key={n.id}>
                            <td style={{ color: COM_C.txtSub }}>{fmt.data(n.created_at)}</td>
                            <td style={{ fontWeight: 600 }}>{n.produtores?.nome ?? '—'}</td>
                            <td style={{ fontFamily: 'monospace', fontSize: 11 }}>
                              {n.numero_nfe ? `${n.serie ?? '2'}-${n.numero_nfe}` : '—'}
                            </td>
                            <td style={{ color: COM_C.txtSub }}>{n.cfop ?? '—'}</td>
                            <td>{n.quantidade_kg ? fmt.peso(n.quantidade_kg) : '—'}</td>
                            <td style={{ fontWeight: 600 }}>
                              {n.valor_total ? fmt.moeda(n.valor_total) : '—'}
                            </td>
                            <td>
                              {n.status === 'processando' ? (
                                <Badge label="Processando" bg={COM_C.laranjaLt} cor={COM_C.laranjaTxt} dot />
                              ) : (
                                <Badge label="Autorizada" bg={COM_C.verdeLt} cor={COM_C.verde} dot />
                              )}
                            </td>
                            <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                              {n.xml_url && (
                                <Btn variante="verde" tamanho="sm" onClick={() => window.open(n.xml_url, '_blank')}>
                                  XML
                                </Btn>
                              )}
                              {n.danfe_url && (
                                <Btn
                                  variante="azul"
                                  tamanho="sm"
                                  onClick={() => window.open(n.danfe_url, '_blank')}
                                  style={{ marginLeft: 6 }}
                                >
                                  DANFE
                                </Btn>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </ContentCard>
              )}
            </>
          )}

          {aba === 'devolucoes' && (
            !devolucoes.length ? (
              <EmptyState emoji="📋" titulo="Nenhuma devolução registrada" />
            ) : (
              <ContentCard noPadding>
                <div style={{ overflowX: 'auto' }}>
                  <table className="com-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        {['Data', 'Venda / Lote', 'Kg', 'Valor', 'Chave NF-e'].map(h => (
                          <th key={h}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {devolucoes.map((d: any) => (
                        <tr key={d.id}>
                          <td style={{ color: COM_C.txtSub }}>
                            {d.created_at ? new Date(d.created_at).toLocaleDateString('pt-BR') : '—'}
                          </td>
                          <td>
                            {(d.vendas_externas as any)?.lotes?.codigo
                              ? `Lote ${(d.vendas_externas as any).lotes.codigo}`
                              : '—'}
                          </td>
                          <td>{d.quantidade_kg != null ? fmt.peso(Number(d.quantidade_kg)) : '—'}</td>
                          <td style={{ fontWeight: 600 }}>
                            {d.valor_total != null ? fmt.moeda(Number(d.valor_total)) : '—'}
                          </td>
                          <td style={{ fontFamily: 'monospace', fontSize: 11 }}>
                            {d.chave_nfe_devolucao || d.chave_nfe || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ContentCard>
            )
          )}
        </>
      )}
    </PageLayout>
  )
}
