'use client'

import { useState } from 'react'
import { emitirNfeSaidaAction, gerarZipLoteAction } from './actions'
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
  const [resultado, setResultado] = useState<{ sucesso: boolean; chave_nfe?: string; danfe_url?: string; erro?: string } | null>(null)
  const [gerandoZip, setGerandoZip] = useState(false)

  const comprador = venda?.compradores

  async function handleEmitir() {
    if (!vendaId) return
    setEmitindo(true)
    try {
      const res = await emitirNfeSaidaAction(vendaId)
      setResultado(res)
    } catch (e: any) {
      setResultado({ sucesso: false, erro: e.message })
    } finally {
      setEmitindo(false)
    }
  }

  async function handleGerarZip() {
    setGerandoZip(true)
    try {
      const res = await gerarZipLoteAction(lote.id)
      if (res.sucesso) {
        if (res.zipBase64) {
          const blob = new Blob([Buffer.from(res.zipBase64, 'base64')], { type: 'application/zip' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url; a.download = `lote_${lote.codigo}.zip`; a.click()
          URL.revokeObjectURL(url)
        }
      } else {
        alert('Erro ao gerar ZIP: ' + res.erro)
      }
    } catch (e: any) {
      alert(e.message)
    } finally {
      setGerandoZip(false)
    }
  }

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

        {(venda?.status_nfe === 'autorizada' || resultado?.sucesso) ? (
          <ContentCard title="NF-e autorizada">
            {(resultado?.chave_nfe || venda?.chave_nfe) && (
              <div style={{ fontSize: 12, color: COM_C.verde, marginBottom: 14, wordBreak: 'break-all' }}>
                Chave: {resultado?.chave_nfe ?? venda?.chave_nfe}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(resultado?.danfe_url || venda?.chave_nfe) && (
                <a href={resultado?.danfe_url ?? `https://${process.env.NEXT_PUBLIC_FOCUSNFE_AMBIENTE === 'producao' ? 'api' : 'homologacao'}.focusnfe.com.br/danfe/${venda?.chave_nfe}`}
                  target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                  <Btn variante="verde" icone="ti-printer">Imprimir DANFE</Btn>
                </a>
              )}
              <Btn variante="verde" icone="ti-file-zip" disabled={gerandoZip} onClick={handleGerarZip}>
                {gerandoZip ? 'Gerando...' : 'ZIP + Email'}
              </Btn>
            </div>
          </ContentCard>
        ) : resultado?.sucesso === false ? (
          <ContentCard title="Erro ao emitir">
            <div style={{ fontSize: 13, color: COM_C.vermelho }}>{resultado.erro}</div>
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