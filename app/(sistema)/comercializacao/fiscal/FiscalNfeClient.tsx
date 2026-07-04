'use client'

import { useState, useEffect } from 'react'
import { fmt } from '@/lib/fmt'
import { cancelarNfe, buscarDocsLoteAction, gerarZipLoteAction, enviarZipEmailAction, listarNfeSaida, kpisNfeSaida } from './actions'
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

  async function handleBaixarZip() {
    if (!modalDocs?.lote_id) return
    setBaixandoZip(true)
    try {
      const res = await gerarZipLoteAction(modalDocs.lote_id)
      if (res.sucesso && res.zipBase64) {
        const blob = new Blob([Buffer.from(res.zipBase64, 'base64')], { type: 'application/zip' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `lote_${modalDocs.lotes?.codigo ?? 'lote'}.zip`
        a.click()
        URL.revokeObjectURL(url)
      } else {
        setMensagem({ tipo: 'erro', texto: res.erro ?? 'Erro ao gerar ZIP' })
      }
    } catch (e: any) {
      setMensagem({ tipo: 'erro', texto: e.message })
    } finally {
      setBaixandoZip(false)
    }
  }

  async function handleEnviarEmail() {
    if (!modalDocs?.lote_id || !emailEnvio) return
    setEnviandoEmail(true)
    try {
      const res = await enviarZipEmailAction(modalDocs.lote_id, emailEnvio)
      if (res.sucesso) {
        setEnviandoEmail(false)
        setMensagem({ tipo: 'ok', texto: `Documentos enviados para ${emailEnvio}` })
        setTimeout(() => setModalDocs(null), 3000)
      } else {
        setEnviandoEmail(false)
        setErroModal(res.erro ?? 'Erro ao enviar email')
      }
    } catch (e: any) {
      setEnviandoEmail(false)
      setErroModal(e.message)
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

        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
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
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          {nfe.xml_nfe && (
                            <Btn variante="verde" tamanho="sm" onClick={() => window.open(nfe.xml_nfe!, '_blank')}>XML</Btn>
                          )}
                          {nfe.chave_nfe && nfe.status_nfe === 'autorizada' && danfeUrl && (
                            <Btn variante="azul" tamanho="sm" onClick={() => window.open(danfeUrl, '_blank')}>DANFE</Btn>
                          )}
                          {nfe.status_nfe === 'autorizada' && nfe.lote_id && (
                            <Btn variante="roxo" tamanho="sm" onClick={() => handleAbrirDocs(nfe)}>Docs</Btn>
                          )}
                          {nfe.status_nfe === 'autorizada' && (
                            <Btn variante="cinza" tamanho="sm" onClick={() => setModalCancelar(nfe)} style={{ color: COM_C.vermelho, borderColor: '#fecaca' }}>
                              Cancelar
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