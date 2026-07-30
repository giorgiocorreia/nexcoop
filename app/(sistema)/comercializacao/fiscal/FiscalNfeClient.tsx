'use client'

import { useState, useEffect } from 'react'
import { fmt } from '@/lib/fmt'
import {
  cancelarNfe,
  buscarDocsLoteAction,
  listarNfeSaida,
  kpisNfeSaida,
  sincronizarNfeSaidaAction,
  sincronizarNfesSaidaProcessandoAction,
  emitirCartaCorrecaoAction,
  listarEventosNfeAction,
  type EventoNfe,
} from './actions'

function mensagemErroRede(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e ?? '')
  if (/Failed to find Server Action|server action/i.test(msg)) {
    return 'A página ficou desatualizada após o deploy. Atualize com Ctrl+Shift+R e tente de novo.'
  }
  return msg || 'Erro inesperado'
}

async function postLoteZip(body: { loteId: string; modo: 'download' | 'email'; email?: string }) {
  const res = await fetch('/api/comercializacao/lote-zip', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  let data: any = null
  try {
    data = await res.json()
  } catch {
    data = null
  }
  if (!res.ok && !data?.erro) {
    throw new Error(res.status === 401 ? 'Sessão expirada. Faça login novamente.' : `Erro HTTP ${res.status}`)
  }
  return data as { sucesso: boolean; erro?: string; zipBase64?: string; codigoLote?: string; email?: string }
}
import { Btn } from '@/components/ui/Btn'
import { HubStyles } from '@/components/comercializacao/ui/HubStyles'
import { ContentCard } from '@/components/comercializacao/ui/ContentCard'
import { KpiCard } from '@/components/comercializacao/ui/KpiCard'
import { Badge } from '@/components/comercializacao/ui/Badge'
import { Modal } from '@/components/comercializacao/ui/Modal'
import { Field, Input, Select, Textarea } from '@/components/comercializacao/ui/Field'
import { COM_C } from '@/components/comercializacao/ui/tokens'

type NfeSaida = {
  id: string
  chave_nfe: string | null
  numero_nfe: string | null
  serie_nfe: string | null
  status_nfe: string | null
  xml_nfe: string | null
  data_emissao_nfe: string | null
  quantidade_kg: number
  preco_kg: number
  valor_bruto: number
  lote_id: string | null
  compradores: { id: string; nome: string; cnpj: string; email: string | null } | null
  lotes: { codigo: string; produto_descricao: string | null; safras: { ano: number } | null } | null
}

type Kpis = {
  total: number
  autorizadas: number
  canceladas: number
  processando: number
  valorTotal: number
}

/**
 * A SEFAZ só aceita cancelamento até 24h após a emissão — a mesma regra que
 * `cancelarNfe` aplica no servidor. Espelhada aqui para o botão não oferecer
 * uma ação que já não é possível.
 */
function dentroDoPrazoCancelamento(dataEmissao: string | null): boolean {
  if (!dataEmissao) return true // sem data, deixa o servidor decidir
  return Date.now() - new Date(dataEmissao).getTime() <= 24 * 60 * 60 * 1000
}

const STATUS_LABEL: Record<string, { label: string; bg: string; cor: string }> = {
  autorizada:  { label: 'Autorizada',  bg: COM_C.verdeLt, cor: COM_C.verde },
  processando: { label: 'Processando', bg: COM_C.laranjaLt, cor: COM_C.laranja },
  cancelada:   { label: 'Cancelada',   bg: COM_C.vermelhoLt, cor: COM_C.vermelho },
  erro:        { label: 'Erro',        bg: COM_C.laranjaLt, cor: '#9a3412' },
}

export default function FiscalNfeClient({ nfes: nfesProp, kpis: kpisProp, embedded }: { nfes?: NfeSaida[]; kpis?: Kpis; usuario?: any; embedded?: boolean }) {
  const [filtroStatus, setFiltroStatus] = useState('')
  const [busca, setBusca] = useState('')
  const [modalCancelar, setModalCancelar] = useState<NfeSaida | null>(null)
  const [justificativa, setJustificativa] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [mensagem, setMensagem] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)
  const [kpisState, setKpisState] = useState<Kpis>(kpisProp ?? { total: 0, autorizadas: 0, canceladas: 0, processando: 0, valorTotal: 0 })
  const [lista, setLista] = useState<NfeSaida[]>(nfesProp ?? [])

  useEffect(() => {
    if (!embedded) return
    Promise.all([listarNfeSaida(), kpisNfeSaida()]).then(([n, k]) => {
      setLista(n as unknown as NfeSaida[])
      setKpisState(k)
    })
  }, [embedded])
  const [erroModal, setErroModal] = useState<string | null>(null)
  const [modalDocs, setModalDocs] = useState<NfeSaida | null>(null)
  const [docsLote, setDocsLote] = useState<{ notasEntrada: any[]; notaSaida: any } | null>(null)
  const [loadingDocs, setLoadingDocs] = useState(false)
  const [emailEnvio, setEmailEnvio] = useState('')
  const [enviandoEmail, setEnviandoEmail] = useState(false)
  const [baixandoZip, setBaixandoZip] = useState(false)
  const [sincronizandoId, setSincronizandoId] = useState<string | null>(null)
  const [sincronizandoTodas, setSincronizandoTodas] = useState(false)
  const [modalCCe, setModalCCe] = useState<NfeSaida | null>(null)
  const [correcao, setCorrecao] = useState('')
  const [enviandoCCe, setEnviandoCCe] = useState(false)
  const [eventosCCe, setEventosCCe] = useState<EventoNfe[]>([])
  const [carregandoEventos, setCarregandoEventos] = useState(false)
  // Preenchido quando a SEFAZ registra a carta: troca o formulário pelo painel
  // de confirmação, em vez de fechar o modal e levar os links embora.
  const [cceRegistrada, setCceRegistrada] = useState<{
    eventoId?: string
    sequencia?: number
    pdf_url?: string
    xml_url?: string
  } | null>(null)
  const [emailCCe, setEmailCCe] = useState('')
  const [enviandoEmailCCe, setEnviandoEmailCCe] = useState(false)

  // Ao abrir a tela, reconsulta automaticamente notas ainda em "processando"
  useEffect(() => {
    const pendentes = (nfesProp ?? lista).filter(n => n.status_nfe === 'processando')
    if (pendentes.length === 0) return
    let cancelado = false
    ;(async () => {
      try {
        const resumo = await sincronizarNfesSaidaProcessandoAction()
        if (cancelado || resumo.total === 0) return
        const [n, k] = await Promise.all([listarNfeSaida(), kpisNfeSaida()])
        if (cancelado) return
        setLista(n as unknown as NfeSaida[])
        setKpisState(k)
        if (resumo.autorizadas > 0) {
          setMensagem({
            tipo: 'ok',
            texto: `${resumo.autorizadas} NF-e sincronizada(s) com a SEFAZ (autorizada).`,
          })
        }
      } catch {
        // silencioso — usuário ainda tem botão manual
      }
    })()
    return () => { cancelado = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function recarregarLista() {
    const [n, k] = await Promise.all([listarNfeSaida(), kpisNfeSaida()])
    setLista(n as unknown as NfeSaida[])
    setKpisState(k)
  }

  async function handleSincronizarUma(nfe: NfeSaida) {
    setSincronizandoId(nfe.id)
    setMensagem(null)
    try {
      const res = await sincronizarNfeSaidaAction(nfe.id)
      await recarregarLista()
      if (res.status === 'autorizada') {
        setMensagem({ tipo: 'ok', texto: `NF-e ${res.numero_nfe ?? ''} autorizada e sincronizada.` })
      } else if (res.status === 'processando') {
        setMensagem({ tipo: 'ok', texto: 'Ainda em processamento na SEFAZ. Tente novamente em instantes.' })
      } else {
        setMensagem({ tipo: 'erro', texto: res.erro ?? 'Não foi possível sincronizar a NF-e.' })
      }
    } catch (e: any) {
      setMensagem({ tipo: 'erro', texto: e.message ?? 'Erro ao sincronizar' })
    } finally {
      setSincronizandoId(null)
    }
  }

  async function handleSincronizarTodas() {
    setSincronizandoTodas(true)
    setMensagem(null)
    try {
      const resumo = await sincronizarNfesSaidaProcessandoAction()
      await recarregarLista()
      if (resumo.total === 0) {
        setMensagem({ tipo: 'ok', texto: 'Nenhuma NF-e em processamento.' })
      } else {
        setMensagem({
          tipo: resumo.erros > 0 && resumo.autorizadas === 0 ? 'erro' : 'ok',
          texto: `Sincronizadas: ${resumo.autorizadas} autorizada(s), ${resumo.aindaProcessando} ainda processando, ${resumo.erros} com erro.`,
        })
      }
    } catch (e: any) {
      setMensagem({ tipo: 'erro', texto: e.message ?? 'Erro ao sincronizar' })
    } finally {
      setSincronizandoTodas(false)
    }
  }

  const filtradas = lista.filter(n => {
    const matchStatus = !filtroStatus || n.status_nfe === filtroStatus
    const matchBusca = !busca ||
      n.compradores?.nome.toLowerCase().includes(busca.toLowerCase()) ||
      n.numero_nfe?.includes(busca) ||
      n.chave_nfe?.includes(busca) ||
      n.lotes?.codigo.toLowerCase().includes(busca.toLowerCase())
    return matchStatus && matchBusca
  })

  async function handleAbrirDocs(nfe: NfeSaida) {
    setModalDocs(nfe)
    setLoadingDocs(true)
    setEmailEnvio((nfe as any).compradores?.email ?? '')
    try {
      const res = await buscarDocsLoteAction(nfe.lote_id!)
      setDocsLote(res)
    } catch (e: any) {
      setMensagem({ tipo: 'erro', texto: e.message })
    } finally {
      setLoadingDocs(false)
    }
  }

  function base64ToBlob(b64: string, type: string) {
    const bin = atob(b64)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return new Blob([bytes], { type })
  }

  async function handleBaixarZip() {
    if (!modalDocs?.lote_id) return
    setBaixandoZip(true)
    setErroModal(null)
    try {
      const res = await postLoteZip({ loteId: modalDocs.lote_id, modo: 'download' })
      if (res.sucesso && res.zipBase64) {
        const blob = base64ToBlob(res.zipBase64, 'application/zip')
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `lote_${res.codigoLote ?? modalDocs.lotes?.codigo ?? 'lote'}.zip`
        a.click()
        URL.revokeObjectURL(url)
        setMensagem({ tipo: 'ok', texto: 'ZIP baixado com sucesso.' })
      } else {
        setErroModal(res.erro ?? 'Erro ao gerar ZIP')
      }
    } catch (e: any) {
      setErroModal(mensagemErroRede(e))
    } finally {
      setBaixandoZip(false)
    }
  }

  async function handleEnviarEmail() {
    if (!modalDocs?.lote_id || !emailEnvio) return
    setEnviandoEmail(true)
    setErroModal(null)
    try {
      const res = await postLoteZip({
        loteId: modalDocs.lote_id,
        modo: 'email',
        email: emailEnvio,
      })
      if (res.sucesso) {
        setEnviandoEmail(false)
        setMensagem({ tipo: 'ok', texto: `Documentos enviados para ${res.email ?? emailEnvio}` })
        setTimeout(() => setModalDocs(null), 3000)
      } else {
        setEnviandoEmail(false)
        setErroModal(res.erro ?? 'Erro ao enviar email')
      }
    } catch (e: any) {
      setEnviandoEmail(false)
      setErroModal(mensagemErroRede(e))
    }
  }

  async function handleCancelar() {
    if (!modalCancelar?.chave_nfe) return
    setCarregando(true)
    const res = await cancelarNfe(modalCancelar.chave_nfe, justificativa)
    setCarregando(false)
    if (res.sucesso) {
      setErroModal(null)
      setLista(l => l.map(n => n.chave_nfe === modalCancelar.chave_nfe ? { ...n, status_nfe: 'cancelada' } : n))
      setMensagem({ tipo: 'ok', texto: 'NF-e cancelada com sucesso.' })
      setModalCancelar(null)
      setJustificativa('')
    } else {
      setErroModal(res.erro ?? 'Erro ao cancelar')
    }
  }

  async function handleAbrirCCe(nfe: NfeSaida) {
    setModalCCe(nfe)
    setCorrecao('')
    setErroModal(null)
    setEventosCCe([])
    setCceRegistrada(null)
    setEmailCCe(nfe.compradores?.email ?? '')
    setCarregandoEventos(true)
    try {
      setEventosCCe(await listarEventosNfeAction(nfe.id))
    } catch {
      // histórico é acessório — não bloqueia a emissão de uma nova carta
    } finally {
      setCarregandoEventos(false)
    }
  }

  async function handleEmitirCCe() {
    if (!modalCCe) return
    setEnviandoCCe(true)
    setErroModal(null)
    try {
      const res = await emitirCartaCorrecaoAction(modalCCe.id, correcao)
      if (res.sucesso) {
        // Modal continua aberto: os links do PDF e do XML são justamente o que
        // se precisa neste instante.
        setCceRegistrada({
          eventoId: res.eventoId,
          sequencia: res.sequencia,
          pdf_url: res.pdf_url,
          xml_url: res.xml_url,
        })
        setCorrecao('')
        setEventosCCe(await listarEventosNfeAction(modalCCe.id).catch(() => eventosCCe))
      } else {
        setErroModal(res.erro ?? 'Erro ao emitir a carta de correção')
        setEventosCCe(await listarEventosNfeAction(modalCCe.id).catch(() => eventosCCe))
      }
    } catch (e: any) {
      setErroModal(mensagemErroRede(e))
    } finally {
      setEnviandoCCe(false)
    }
  }

  async function handleEnviarEmailCCe() {
    if (!cceRegistrada?.eventoId || !emailCCe) return
    setEnviandoEmailCCe(true)
    setErroModal(null)
    try {
      const r = await fetch('/api/comercializacao/cce-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventoId: cceRegistrada.eventoId, email: emailCCe }),
      })
      const data = await r.json().catch(() => null)
      if (!r.ok && !data?.erro) {
        throw new Error(r.status === 401 ? 'Sessão expirada. Faça login novamente.' : `Erro HTTP ${r.status}`)
      }
      if (data?.sucesso) {
        setMensagem({ tipo: 'ok', texto: `Carta de correção enviada para ${data.email ?? emailCCe}` })
      } else {
        setErroModal(data?.erro ?? 'Erro ao enviar a carta por e-mail')
      }
    } catch (e: any) {
      setErroModal(mensagemErroRede(e))
    } finally {
      setEnviandoEmailCCe(false)
    }
  }

  function fecharModalCCe() {
    if (cceRegistrada) {
      setMensagem({
        tipo: 'ok',
        texto: `Carta de correção ${cceRegistrada.sequencia ? `nº ${cceRegistrada.sequencia} ` : ''}registrada na SEFAZ para a NF-e ${modalCCe?.numero_nfe}/${modalCCe?.serie_nfe}.`,
      })
    }
    setModalCCe(null)
    setCorrecao('')
    setEventosCCe([])
    setCceRegistrada(null)
    setEmailCCe('')
    setErroModal(null)
  }

  function fecharModalCancelar() {
    setModalCancelar(null)
    setJustificativa('')
    setErroModal(null)
  }

  function fecharModalDocs() {
    setModalDocs(null)
    setEmailEnvio('')
    setErroModal(null)
  }

  return (
    <div style={embedded ? undefined : { padding: '2rem', background: COM_C.bg, minHeight: '100vh' }}>
      <HubStyles />
      <div style={{ maxWidth: embedded ? undefined : 1100, margin: embedded ? undefined : '0 auto' }}>

        {!embedded && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: COM_C.txt, margin: 0 }}>Notas Fiscais</h1>
            <p style={{ color: COM_C.txtSub, fontSize: 13, marginTop: 4 }}>NF-e de entrada e saída da comercialização</p>
          </div>
        )}

        {mensagem && (
          <div style={{
            padding: '12px 16px', borderRadius: 10, marginBottom: 16,
            background: mensagem.tipo === 'ok' ? COM_C.verdeLt : COM_C.vermelhoLt,
            color: mensagem.tipo === 'ok' ? COM_C.verde : COM_C.vermelho,
            fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            {mensagem.texto}
            <button onClick={() => setMensagem(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 16, lineHeight: 1 }}>×</button>
          </div>
        )}

        <div className="com-kpi-grid-4">
          <KpiCard label="Total emitidas" value={String(kpisState.total)} icon="ti-file-invoice" cor={COM_C.azul} corLt={COM_C.azulLt} />
          <KpiCard label="Autorizadas" value={String(kpisState.autorizadas)} icon="ti-circle-check" cor={COM_C.verde} corLt={COM_C.verdeLt} />
          <KpiCard label="Canceladas" value={String(kpisState.canceladas)} icon="ti-ban" cor={COM_C.vermelho} corLt={COM_C.vermelhoLt} />
          <KpiCard label="Valor autorizado" value={fmt.moeda(Number(kpisState.valorTotal))} icon="ti-currency-real" cor={COM_C.marrom} corLt={COM_C.marromLt} />
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <Input
              placeholder="Buscar comprador, nº NF-e, chave, lote..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
            />
          </div>
          <div style={{ minWidth: 180 }}>
            <Select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
              <option value="">Todos os status</option>
              <option value="autorizada">Autorizada</option>
              <option value="processando">Processando</option>
              <option value="cancelada">Cancelada</option>
              <option value="erro">Erro</option>
            </Select>
          </div>
          {lista.some(n => n.status_nfe === 'processando') && (
            <Btn
              variante="marrom"
              tamanho="sm"
              icone="ti-refresh"
              disabled={sincronizandoTodas}
              onClick={handleSincronizarTodas}
            >
              {sincronizandoTodas ? 'Sincronizando...' : 'Sincronizar processando'}
            </Btn>
          )}
        </div>

        <ContentCard noPadding>
          <div style={{ overflowX: 'auto' }}>
            <table className="com-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Nº / Série', 'Comprador', 'Lote / Safra', 'Valor', 'Emissão', 'Status', 'Ações'].map(h => (
                    <th key={h} style={{ textAlign: h === 'Ações' ? 'right' : 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtradas.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: COM_C.txtSub }}>
                      Nenhuma NF-e encontrada
                    </td>
                  </tr>
                )}
                {filtradas.map(nfe => {
                  const st = STATUS_LABEL[nfe.status_nfe ?? ''] ?? { label: nfe.status_nfe ?? '—', bg: '#F1F0EB', cor: COM_C.txtSub }
                  const danfeUrl = nfe.xml_nfe
                    ? nfe.xml_nfe.replace('/XMLs/', '/DANFEs/').replace('-nfe.xml', '-nfe.pdf')
                    : ''
                  return (
                    <tr key={nfe.id}>
                      <td style={{ fontWeight: 600 }}>
                        {nfe.numero_nfe ? `${nfe.numero_nfe}/${nfe.serie_nfe}` : '—'}
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{nfe.compradores?.nome ?? '—'}</div>
                        <div style={{ fontSize: 11, color: COM_C.txtSub }}>{nfe.compradores?.cnpj ?? ''}</div>
                      </td>
                      <td>
                        <div>{nfe.lotes?.codigo ?? '—'}</div>
                        <div style={{ fontSize: 11, color: COM_C.txtSub }}>
                          {nfe.lotes?.produto_descricao ?? 'Multi-produto'}{(nfe.lotes as any)?.safras?.ano ? ` · Safra ${(nfe.lotes as any).safras.ano}` : ''}
                        </div>
                      </td>
                      <td style={{ fontWeight: 600 }}>{fmt.moeda(Number(nfe.valor_bruto))}</td>
                      <td style={{ color: COM_C.txtSub }}>
                        {nfe.data_emissao_nfe ? new Date(nfe.data_emissao_nfe).toLocaleDateString('pt-BR') : '—'}
                      </td>
                      <td>
                        <Badge label={st.label} bg={st.bg} cor={st.cor} dot />
                      </td>
                      {/* nowrap: com 5 ações a linha quebrava e jogava o último
                          botão sozinho numa segunda linha. O container da tabela
                          já tem overflow-x, então em tela estreita rola de lado. */}
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                          {nfe.xml_nfe && (
                            <Btn variante="verde" tamanho="sm" onClick={() => window.open(nfe.xml_nfe!, '_blank')}>XML</Btn>
                          )}
                          {nfe.chave_nfe && nfe.status_nfe === 'autorizada' && danfeUrl && (
                            <Btn variante="azul" tamanho="sm" onClick={() => window.open(danfeUrl, '_blank')}>DANFE</Btn>
                          )}
                          {(nfe.status_nfe === 'processando' || nfe.status_nfe === 'erro') && (
                            <Btn
                              variante="marrom"
                              tamanho="sm"
                              icone="ti-refresh"
                              disabled={sincronizandoId === nfe.id || sincronizandoTodas}
                              onClick={() => handleSincronizarUma(nfe)}
                            >
                              {sincronizandoId === nfe.id ? '...' : 'Sincronizar'}
                            </Btn>
                          )}
                          {nfe.status_nfe === 'autorizada' && nfe.lote_id && (
                            <Btn variante="roxo" tamanho="sm" onClick={() => handleAbrirDocs(nfe)}>Docs</Btn>
                          )}
                          {nfe.status_nfe === 'autorizada' && (
                            <Btn
                              variante="marrom-outline"
                              tamanho="sm"
                              title="Emitir Carta de Correção Eletrônica"
                              onClick={() => handleAbrirCCe(nfe)}
                            >
                              CC-e
                            </Btn>
                          )}
                          {nfe.status_nfe === 'autorizada' && (() => {
                            const noPrazo = dentroDoPrazoCancelamento(nfe.data_emissao_nfe)
                            return (
                              // Ícone junto do rótulo: a ação destrutiva não pode
                              // se distinguir das demais só pela cor do texto.
                              <Btn
                                variante="cinza"
                                tamanho="sm"
                                icone="ti-ban"
                                disabled={!noPrazo}
                                title={noPrazo
                                  ? 'Cancelar NF-e junto à SEFAZ'
                                  : 'Prazo esgotado: a SEFAZ só aceita cancelamento até 24h após a emissão'}
                                onClick={() => setModalCancelar(nfe)}
                                style={noPrazo ? { color: COM_C.vermelho, borderColor: '#fecaca' } : undefined}
                              >
                                Cancelar
                              </Btn>
                            )
                          })()}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </ContentCard>
      </div>

      {modalCancelar && (
        <Modal
          titulo="Cancelar NF-e"
          subtitulo={`NF-e ${modalCancelar.numero_nfe}/${modalCancelar.serie_nfe} — ${modalCancelar.compradores?.nome}`}
          onClose={fecharModalCancelar}
          largura={460}
          footer={
            <>
              <Btn variante="cinza" onClick={fecharModalCancelar}>Voltar</Btn>
              <Btn
                variante="marrom"
                onClick={handleCancelar}
                disabled={justificativa.length < 15 || carregando}
                style={justificativa.length >= 15 ? { background: COM_C.vermelho, borderColor: COM_C.vermelho } : undefined}
              >
                {carregando ? 'Cancelando...' : 'Confirmar cancelamento'}
              </Btn>
            </>
          }
        >
          <div style={{ background: COM_C.laranjaLt, border: `1px solid ${COM_C.borda}`, borderRadius: 10, padding: '12px 14px', marginBottom: 16, fontSize: 12, color: '#9a3412' }}>
            Cancelamento irreversível. Permitido somente em até 24h após a emissão.
          </div>
          <Field label="Justificativa (mínimo 15 caracteres)">
            <Textarea
              value={justificativa}
              onChange={e => setJustificativa(e.target.value)}
              rows={3}
              placeholder="Ex: Erro no preço informado na nota fiscal"
            />
          </Field>
          <div style={{ fontSize: 11, color: justificativa.length < 15 ? COM_C.vermelho : COM_C.verde, marginTop: 8 }}>
            {justificativa.length}/15 caracteres mínimos
          </div>
          {erroModal && (
            <div style={{ background: COM_C.vermelhoLt, border: '1px solid #fecaca', borderRadius: 10, padding: '12px 14px', marginTop: 12, fontSize: 12, color: COM_C.vermelho }}>
              {erroModal}
            </div>
          )}
        </Modal>
      )}

      {modalCCe && (() => {
        // Conta como a SEFAZ vai contar: sem espaço duplo e sem quebra de linha.
        const textoNormalizado = correcao.replace(/\s+/g, ' ').trim()
        const cartasRegistradas = eventosCCe.filter(e => e.tipo === 'carta_correcao' && e.status === 'registrado')
        const limiteAtingido = cartasRegistradas.length >= 20
        const podeEnviar =
          textoNormalizado.length >= 15 && textoNormalizado.length <= 1000 && !enviandoCCe && !limiteAtingido

        return (
          <Modal
            titulo="Carta de Correção Eletrônica"
            subtitulo={`NF-e ${modalCCe.numero_nfe}/${modalCCe.serie_nfe} — ${modalCCe.compradores?.nome}`}
            onClose={fecharModalCCe}
            largura={520}
            footer={
              cceRegistrada ? (
                <Btn variante="marrom" onClick={fecharModalCCe}>Concluir</Btn>
              ) : (
                <>
                  <Btn variante="cinza" onClick={fecharModalCCe}>Voltar</Btn>
                  <Btn variante="marrom" onClick={handleEmitirCCe} disabled={!podeEnviar}>
                    {enviandoCCe ? 'Enviando à SEFAZ...' : 'Emitir CC-e'}
                  </Btn>
                </>
              )
            }
          >
            {cceRegistrada ? (
              <>
                <div style={{
                  background: COM_C.verdeLt, border: `1px solid ${COM_C.verde}`, borderRadius: 10,
                  padding: '14px 16px', marginBottom: 18, color: COM_C.verde,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700 }}>
                    <i className="ti ti-circle-check" aria-hidden="true" />
                    Carta {cceRegistrada.sequencia ? `nº ${cceRegistrada.sequencia} ` : ''}registrada na SEFAZ
                  </div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>
                    Vinculada à NF-e {modalCCe.numero_nfe}/{modalCCe.serie_nfe}. O registro é definitivo:
                    uma carta não pode ser cancelada, apenas substituída por outra.
                  </div>
                </div>

                <div className="com-section-label">Documentos da carta</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                  {cceRegistrada.pdf_url && (
                    <Btn variante="azul" icone="ti-file-text" onClick={() => window.open(cceRegistrada.pdf_url!, '_blank')}>
                      Ver PDF
                    </Btn>
                  )}
                  {cceRegistrada.xml_url && (
                    <Btn variante="verde" icone="ti-download" onClick={() => window.open(cceRegistrada.xml_url!, '_blank')}>
                      Baixar XML
                    </Btn>
                  )}
                </div>
                <div style={{ fontSize: 11, color: COM_C.txtSub, marginTop: -12, marginBottom: 20 }}>
                  O XML é o arquivo que a contabilidade do comprador importa; o PDF é a versão legível.
                </div>

                <div style={{ borderTop: `1px solid ${COM_C.borda}`, paddingTop: 16 }}>
                  <div className="com-section-label">Enviar ao comprador</div>
                  <Field label="E-mail do destinatário">
                    <Input
                      type="email"
                      value={emailCCe}
                      onChange={e => setEmailCCe(e.target.value)}
                      placeholder="email@exemplo.com"
                    />
                  </Field>
                  <div style={{ marginTop: 10 }}>
                    <Btn
                      variante="marrom"
                      icone="ti-mail"
                      onClick={handleEnviarEmailCCe}
                      disabled={enviandoEmailCCe || !emailCCe.includes('@')}
                    >
                      {enviandoEmailCCe ? 'Enviando...' : 'Enviar por e-mail'}
                    </Btn>
                  </div>
                </div>

                {erroModal && (
                  <div style={{
                    background: COM_C.vermelhoLt, border: '1px solid #fecaca', borderRadius: 10,
                    padding: '12px 14px', marginTop: 12, fontSize: 12, color: COM_C.vermelho,
                  }}>
                    {erroModal}
                  </div>
                )}
              </>
            ) : (
              <>
            <div style={{
              background: COM_C.bg, border: `1px solid ${COM_C.borda}`, borderRadius: 10,
              padding: '12px 14px', marginBottom: 16, fontSize: 12, color: COM_C.txt, lineHeight: 1.5,
            }}>
              A CC-e <strong>não corrige</strong> valores, base de cálculo, alíquota, CST, dados do
              destinatário nem data de emissão (Ajuste SINIEF 07/05). Para esses casos o caminho é
              cancelamento (até 24h) ou nota de ajuste.
              <br />
              Cada carta <strong>substitui</strong> a anterior — repita nesta o que ainda vale das antigas.
            </div>

            <Field label="Texto da correção (15 a 1000 caracteres)">
              <Textarea
                value={correcao}
                onChange={e => setCorrecao(e.target.value)}
                rows={4}
                placeholder="Ex: Fica corrigida a natureza da operacao para Venda de producao do estabelecimento rural."
              />
            </Field>
            <div style={{
              fontSize: 11, marginTop: 8,
              color: textoNormalizado.length < 15 || textoNormalizado.length > 1000 ? COM_C.vermelho : COM_C.txtSub,
            }}>
              {textoNormalizado.length}/1000 caracteres
              {textoNormalizado.length < 15 && ' — mínimo de 15'}
              {textoNormalizado.length > 1000 && ' — passou do limite'}
            </div>

            {limiteAtingido && (
              <div style={{
                background: COM_C.vermelhoLt, border: '1px solid #fecaca', borderRadius: 10,
                padding: '12px 14px', marginTop: 12, fontSize: 12, color: COM_C.vermelho,
              }}>
                Esta NF-e já tem 20 cartas de correção registradas — limite da SEFAZ atingido.
              </div>
            )}

            {erroModal && (
              <div style={{
                background: COM_C.vermelhoLt, border: '1px solid #fecaca', borderRadius: 10,
                padding: '12px 14px', marginTop: 12, fontSize: 12, color: COM_C.vermelho,
              }}>
                {erroModal}
              </div>
            )}

            <div style={{ borderTop: `1px solid ${COM_C.borda}`, marginTop: 20, paddingTop: 16 }}>
              <div className="com-section-label">
                Cartas anteriores{carregandoEventos ? '' : ` (${eventosCCe.length})`}
              </div>
              {carregandoEventos ? (
                <div style={{ fontSize: 12, color: COM_C.txtSub }}>Carregando histórico...</div>
              ) : eventosCCe.length === 0 ? (
                <div style={{ fontSize: 12, color: COM_C.txtSub }}>Nenhuma carta emitida para esta nota.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {eventosCCe.map(ev => (
                    <div key={ev.id} style={{ background: COM_C.bg, borderRadius: 10, padding: '10px 12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: COM_C.txt }}>
                          {ev.status === 'registrado'
                            ? `Carta nº ${ev.sequencia ?? '—'} · registrada`
                            : 'Tentativa recusada'}
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span style={{ fontSize: 11, color: COM_C.txtSub }}>
                            {new Date(ev.criado_em).toLocaleString('pt-BR')}
                          </span>
                          {ev.pdf_url && (
                            <Btn variante="azul" tamanho="sm" onClick={() => window.open(ev.pdf_url!, '_blank')}>PDF</Btn>
                          )}
                          {ev.xml_url && (
                            <Btn variante="verde" tamanho="sm" onClick={() => window.open(ev.xml_url!, '_blank')}>XML</Btn>
                          )}
                        </div>
                      </div>
                      <div style={{ fontSize: 12, color: COM_C.txtSub, marginTop: 4 }}>{ev.texto}</div>
                      {ev.status !== 'registrado' && ev.mensagem_sefaz && (
                        <div style={{ fontSize: 11, color: COM_C.vermelho, marginTop: 4 }}>{ev.mensagem_sefaz}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
              </>
            )}
          </Modal>
        )
      })()}

      {modalDocs && (
        <Modal
          titulo={`Documentos — Lote ${modalDocs.lotes?.codigo}`}
          onClose={fecharModalDocs}
          largura={560}
          footer={
            !loadingDocs ? (
              <>
                <Btn variante="cinza" onClick={fecharModalDocs}>Fechar</Btn>
                <Btn variante="cinza" onClick={handleBaixarZip} disabled={baixandoZip} icone="ti-download">
                  {baixandoZip ? 'Gerando...' : 'Baixar ZIP'}
                </Btn>
                <Btn variante="marrom" onClick={handleEnviarEmail} disabled={enviandoEmail || !emailEnvio} icone="ti-mail">
                  {enviandoEmail ? 'Enviando...' : 'Enviar por email'}
                </Btn>
              </>
            ) : undefined
          }
        >
          {loadingDocs ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: COM_C.txtSub, fontSize: 13 }}>Carregando documentos...</div>
          ) : (
            <>
              <div style={{ marginBottom: 16 }}>
                <div className="com-section-label">NF-e de Saída</div>
                <div style={{ background: COM_C.bg, borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: COM_C.txt }}>
                      NF-e {modalDocs.numero_nfe}/{modalDocs.serie_nfe} — {modalDocs.compradores?.nome}
                    </div>
                    <div style={{ fontSize: 11, color: COM_C.txtSub, marginTop: 2 }}>{modalDocs.chave_nfe}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {modalDocs.xml_nfe && (
                      <Btn variante="verde" tamanho="sm" onClick={() => window.open(modalDocs.xml_nfe!, '_blank')}>XML</Btn>
                    )}
                    {modalDocs.xml_nfe && (
                      <Btn
                        variante="azul"
                        tamanho="sm"
                        onClick={() => window.open(modalDocs.xml_nfe!.replace('/XMLs/', '/DANFEs/').replace('-nfe.xml', '-nfe.pdf'), '_blank')}
                      >
                        DANFE
                      </Btn>
                    )}
                  </div>
                </div>
              </div>

              {docsLote && docsLote.notasEntrada.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div className="com-section-label">NF-e de Entrada ({docsLote.notasEntrada.length})</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {docsLote.notasEntrada.map((nota: any, i: number) => (
                      <div key={i} style={{ background: COM_C.bg, borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500, color: COM_C.txt }}>{nota.produtor_nome}</div>
                          <div style={{ fontSize: 11, color: COM_C.txtSub, marginTop: 2 }}>NF-e {nota.numero_nfe} · {nota.quantidade_kg} kg</div>
                        </div>
                        {nota.xml_url && (
                          <Btn variante="verde" tamanho="sm" onClick={() => window.open(nota.xml_url, '_blank')}>XML</Btn>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ borderTop: `1px solid ${COM_C.borda}`, paddingTop: 16 }}>
                <div className="com-section-label">Enviar documentos</div>
                <Field label="Email do destinatário">
                  <Input
                    type="email"
                    value={emailEnvio}
                    onChange={e => setEmailEnvio(e.target.value)}
                    placeholder="email@exemplo.com"
                  />
                </Field>
                {erroModal && (
                  <div style={{ background: COM_C.vermelhoLt, border: '1px solid #fecaca', borderRadius: 10, padding: '12px 14px', marginTop: 12, fontSize: 12, color: COM_C.vermelho }}>
                    {erroModal}
                  </div>
                )}
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  )
}