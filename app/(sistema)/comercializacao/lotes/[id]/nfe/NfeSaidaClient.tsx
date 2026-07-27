'use client'

import { useEffect, useState } from 'react'
import { emitirNfeSaidaAction, gerarZipLoteAction, sincronizarNfeSaidaAction } from './actions'
import { fmt } from '@/lib/fmt'
import { PageLayout } from '@/components/comercializacao/ui/PageLayout'
import { KpiCard } from '@/components/comercializacao/ui/KpiCard'
import { ContentCard } from '@/components/comercializacao/ui/ContentCard'
import { COM_C } from '@/components/comercializacao/ui/tokens'
import { Btn } from '@/components/ui/Btn'

export default function NfeSaidaClient({ lote, venda, vendaId }: {
  lote: any
  venda: any
  vendaId: string | null
}) {
  const [emitindo, setEmitindo] = useState(false)
  const [sincronizando, setSincronizando] = useState(false)
  const [resultado, setResultado] = useState<{
    sucesso: boolean
    chave_nfe?: string
    danfe_url?: string
    erro?: string
    processando?: boolean
    numero_nfe?: string | number
  } | null>(null)
  const [gerandoZip, setGerandoZip] = useState(false)
  const [statusLocal, setStatusLocal] = useState<string | null>(venda?.status_nfe ?? null)
  const [chaveLocal, setChaveLocal] = useState<string | null>(venda?.chave_nfe ?? null)

  const comprador = venda?.compradores
  const autorizada =
    statusLocal === 'autorizada' ||
    (resultado?.sucesso && !resultado.processando && !!resultado.chave_nfe) ||
    (!!chaveLocal && statusLocal === 'autorizada')
  const processando =
    statusLocal === 'processando' ||
    (!!resultado?.processando && !autorizada)

  // Se a página abriu com nota em processamento, reconsulta a Focus automaticamente
  useEffect(() => {
    if (!vendaId || venda?.status_nfe !== 'processando') return
    let cancelado = false
    ;(async () => {
      setSincronizando(true)
      try {
        const res = await sincronizarNfeSaidaAction(vendaId)
        if (cancelado) return
        if (res.status === 'autorizada') {
          setStatusLocal('autorizada')
          setChaveLocal(res.chave_nfe ?? null)
          setResultado({
            sucesso: true,
            chave_nfe: res.chave_nfe,
            danfe_url: res.danfe_url,
            numero_nfe: res.numero_nfe,
          })
        } else if (res.status === 'processando') {
          setStatusLocal('processando')
          setResultado({ sucesso: true, processando: true })
        } else if (res.erro) {
          setStatusLocal('erro')
          setResultado({ sucesso: false, erro: res.erro })
        }
      } catch (e: any) {
        if (!cancelado) setResultado({ sucesso: false, erro: e.message })
      } finally {
        if (!cancelado) setSincronizando(false)
      }
    })()
    return () => { cancelado = true }
  }, [vendaId, venda?.status_nfe])

  async function handleEmitir() {
    if (!vendaId) return
    setEmitindo(true)
    setResultado(null)
    try {
      const res = await emitirNfeSaidaAction(vendaId)
      setResultado(res)
      if (res.processando) setStatusLocal('processando')
      else if (res.sucesso && res.chave_nfe) {
        setStatusLocal('autorizada')
        setChaveLocal(res.chave_nfe)
      } else if (!res.sucesso) {
        setStatusLocal('erro')
      }
    } catch (e: any) {
      setResultado({ sucesso: false, erro: e.message })
    } finally {
      setEmitindo(false)
    }
  }

  async function handleSincronizar() {
    if (!vendaId) return
    setSincronizando(true)
    setResultado(null)
    try {
      const res = await sincronizarNfeSaidaAction(vendaId)
      if (res.status === 'autorizada') {
        setStatusLocal('autorizada')
        setChaveLocal(res.chave_nfe ?? null)
        setResultado({
          sucesso: true,
          chave_nfe: res.chave_nfe,
          danfe_url: res.danfe_url,
          numero_nfe: res.numero_nfe,
        })
      } else if (res.status === 'processando') {
        setStatusLocal('processando')
        setResultado({ sucesso: true, processando: true })
      } else {
        setStatusLocal('erro')
        setResultado({ sucesso: false, erro: res.erro ?? 'Falha na sincronização' })
      }
    } catch (e: any) {
      setResultado({ sucesso: false, erro: e.message })
    } finally {
      setSincronizando(false)
    }
  }

  async function handleGerarZip() {
    setGerandoZip(true)
    try {
      const res = await gerarZipLoteAction(lote.id)
      if (res.sucesso && res.zipBase64) {
        const bin = atob(res.zipBase64)
        const bytes = new Uint8Array(bin.length)
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
        const blob = new Blob([bytes], { type: 'application/zip' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `lote_${res.codigoLote ?? lote.codigo}.zip`
        a.click()
        URL.revokeObjectURL(url)
      } else {
        alert('Erro ao gerar ZIP: ' + (res.erro ?? 'desconhecido'))
      }
    } catch (e: any) {
      alert(e.message)
    } finally {
      setGerandoZip(false)
    }
  }

  const chaveExibida = resultado?.chave_nfe ?? chaveLocal ?? venda?.chave_nfe
  const danfeHref = resultado?.danfe_url
    ?? (chaveExibida
      ? `https://api.focusnfe.com.br/danfe/${String(chaveExibida).replace(/^NFe/i, '')}`
      : null)

  return (
    <PageLayout
      titulo="NF-e de Saída"
      subtitulo={`Lote ${lote.codigo}`}
      icone="ti-file-invoice"
      breadcrumb={[
        { label: 'Lotes', href: '/comercializacao/lotes' },
        { label: `Lote ${lote.codigo}`, href: `/comercializacao/lotes/${lote.id}` },
        { label: 'NF-e de Saída' },
      ]}
      fullHeight
    >
      <div style={{ maxWidth: 800 }}>
        {venda && (
          <div className="com-kpi-grid-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
            <KpiCard label="Quantidade" value={fmt.peso(venda.quantidade_kg)} icon="ti-weight" cor={COM_C.azul} corLt={COM_C.azulLt} />
            <KpiCard label="Preço/kg" value={fmt.moeda(venda.preco_kg)} icon="ti-tag" cor={COM_C.azul} corLt={COM_C.azulLt} />
            <KpiCard label="Valor bruto" value={fmt.moeda(venda.valor_bruto)} icon="ti-cash" cor={COM_C.azul} corLt={COM_C.azulLt} />
            <KpiCard label="Valor líquido" value={fmt.moeda(venda.valor_liquido)} sub={`taxa ${fmt.pct(venda.taxa_comercializacao_pct)}`}
              icon="ti-receipt" cor={COM_C.verde} corLt={COM_C.verdeLt} />
          </div>
        )}

        {comprador && (
          <div style={{ marginBottom: 24 }}>
          <ContentCard title="Destinatário">
            <div style={{ fontSize: 15, fontWeight: 700, color: COM_C.txt, marginBottom: 6 }}>{comprador.nome}</div>
            <div style={{ fontSize: 13, color: COM_C.txtSub, lineHeight: 1.6 }}>
              <div>CNPJ: {comprador.cnpj ?? '—'}</div>
              <div>IE: {comprador.ie ?? '—'}</div>
              <div>{[comprador.logradouro, comprador.numero, comprador.bairro, comprador.municipio, comprador.uf, comprador.cep].filter(Boolean).join(', ')}</div>
            </div>
          </ContentCard>
          </div>
        )}

        {autorizada ? (
          <ContentCard title="NF-e autorizada">
            {chaveExibida && (
              <div style={{ fontSize: 12, color: COM_C.verde, marginBottom: 14, wordBreak: 'break-all' }}>
                Chave: {chaveExibida}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {danfeHref && (
                <a href={danfeHref} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                  <Btn variante="verde" icone="ti-printer">Imprimir DANFE</Btn>
                </a>
              )}
              <Btn variante="verde" icone="ti-file-zip" disabled={gerandoZip} onClick={handleGerarZip}>
                {gerandoZip ? 'Gerando...' : 'ZIP + Email'}
              </Btn>
            </div>
          </ContentCard>
        ) : processando ? (
          <ContentCard title="NF-e em processamento">
            <div style={{ fontSize: 13, color: COM_C.txtSub, marginBottom: 14, lineHeight: 1.5 }}>
              A nota foi enviada à SEFAZ e ainda não retornou autorização no NexCoop.
              Use sincronizar para atualizar o status pela Focus.
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Btn
                variante="marrom"
                icone="ti-refresh"
                disabled={sincronizando || emitindo}
                onClick={handleSincronizar}
              >
                {sincronizando ? 'Consultando SEFAZ...' : 'Sincronizar status'}
              </Btn>
            </div>
          </ContentCard>
        ) : resultado?.sucesso === false ? (
          <ContentCard title="Erro ao emitir">
            <div style={{ fontSize: 13, color: COM_C.vermelho, marginBottom: 14 }}>{resultado.erro}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Btn variante="marrom" icone="ti-refresh" disabled={sincronizando} onClick={handleSincronizar}>
                {sincronizando ? 'Consultando...' : 'Tentar sincronizar'}
              </Btn>
              <Btn variante="cinza" icone="ti-file-invoice" disabled={emitindo} onClick={handleEmitir}>
                {emitindo ? 'Emitindo...' : 'Reemitir'}
              </Btn>
            </div>
          </ContentCard>
        ) : vendaId ? (
          <Btn variante="marrom" icone="ti-file-invoice" disabled={emitindo} onClick={handleEmitir}>
            {emitindo ? 'Emitindo NF-e...' : 'Emitir NF-e de Saída'}
          </Btn>
        ) : (
          <div style={{ color: COM_C.txtSub, fontSize: 13 }}>Nenhuma venda vinculada a este lote.</div>
        )}
      </div>
    </PageLayout>
  )
}
