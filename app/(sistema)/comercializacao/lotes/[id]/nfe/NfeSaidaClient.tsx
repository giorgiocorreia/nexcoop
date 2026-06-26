'use client'

import { useState } from 'react'
import Link from 'next/link'
import { emitirNfeSaidaAction, gerarZipLoteAction } from './actions'
import { fmt } from '@/lib/fmt'

const C = {
  cor: '#92400e', corLt: '#FDF8F4',
  borda: '#E5E3DC', bg: '#F8F7F4',
  txt: '#1C1917', sub: '#78716C',
}

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

  const cardAzul: React.CSSProperties = { background: '#E6F1FB', borderRadius: 12, padding: '1rem', minWidth: 140 }

  return (
    <>
      <style>{`
        .nfe-header  { padding: 0 32px; min-height: 88px; display: flex; align-items: center; }
        .nfe-content { padding: 28px 32px; }
        @media (max-width: 640px) {
          .nfe-header  { padding: 0 16px 0 56px; min-height: 60px; }
          .nfe-content { padding: 16px; }
        }
      `}</style>

      <header className="nfe-header" style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: '#fff', borderBottom: `1px solid ${C.borda}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, margin: '0 -2rem 0 -2rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: C.corLt, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <i className="ti ti-file-invoice" style={{ fontSize: 20, color: C.cor }} />
          </div>
          <div>
            <h1 style={{ fontSize: 19, fontWeight: 800, color: C.txt, margin: 0, lineHeight: 1.2 }}>NF-e de Saída</h1>
            <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>
              <Link href="/comercializacao" style={{ color: C.sub, textDecoration: 'none' }}>Comercialização</Link>
              {' / '}
              <Link href="/comercializacao/lotes" style={{ color: C.sub, textDecoration: 'none' }}>Lotes</Link>
              {' / '}
              <Link href={`/comercializacao/lotes/${lote.id}`} style={{ color: C.sub, textDecoration: 'none' }}>Lote {lote.codigo}</Link>
              {' / '}NF-e de Saída
            </div>
          </div>
        </div>
      </header>

      <div className="nfe-content" style={{ background: C.bg, margin: '0 -2rem -2rem -2rem', minHeight: 'calc(100vh - 88px)' }}>
        <div style={{ maxWidth: 800 }}>

          {/* KPIs da venda */}
          {venda && (
            <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
              <div style={cardAzul}>
                <div style={{ fontSize: 11, fontWeight: 500, color: '#185FA5', textTransform: 'uppercase', marginBottom: 4 }}>Quantidade</div>
                <div style={{ fontSize: 22, fontWeight: 500, color: '#042C53' }}>{fmt.peso(venda.quantidade_kg)}</div>
              </div>
              <div style={cardAzul}>
                <div style={{ fontSize: 11, fontWeight: 500, color: '#185FA5', textTransform: 'uppercase', marginBottom: 4 }}>Preço/kg</div>
                <div style={{ fontSize: 22, fontWeight: 500, color: '#042C53' }}>{fmt.moeda(venda.preco_kg)}</div>
              </div>
              <div style={cardAzul}>
                <div style={{ fontSize: 11, fontWeight: 500, color: '#185FA5', textTransform: 'uppercase', marginBottom: 4 }}>Valor bruto</div>
                <div style={{ fontSize: 22, fontWeight: 500, color: '#042C53' }}>{fmt.moeda(venda.valor_bruto)}</div>
              </div>
              <div style={{ ...cardAzul, background: '#E1F5EE' }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: '#0F6E56', textTransform: 'uppercase', marginBottom: 4 }}>Valor líquido</div>
                <div style={{ fontSize: 22, fontWeight: 500, color: '#04342C' }}>{fmt.moeda(venda.valor_liquido)}</div>
                <div style={{ fontSize: 12, color: '#0F6E56', marginTop: 2 }}>taxa {fmt.pct(venda.taxa_comercializacao_pct)}</div>
              </div>
            </div>
          )}

          {/* Dados do comprador */}
          {comprador && (
            <div style={{ background: '#fff', border: `1px solid ${C.borda}`, borderRadius: 12, padding: '1.25rem', marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.sub, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Destinatário</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: C.txt, marginBottom: 4 }}>{comprador.nome}</div>
              <div style={{ fontSize: 13, color: C.sub }}>CNPJ: {comprador.cnpj ?? '—'}</div>
              <div style={{ fontSize: 13, color: C.sub }}>IE: {comprador.ie ?? '—'}</div>
              <div style={{ fontSize: 13, color: C.sub, marginTop: 4 }}>
                {[comprador.logradouro, comprador.numero, comprador.bairro, comprador.municipio, comprador.uf, comprador.cep].filter(Boolean).join(', ')}
              </div>
            </div>
          )}

          {/* Status NF-e */}
          {(venda?.status_nfe === 'autorizada' || resultado?.sucesso) ? (
            <div style={{ background: '#DCFCE7', border: '1px solid #BBF7D0', borderRadius: 12, padding: '1.25rem', marginBottom: 24 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#166534', marginBottom: 8 }}>✅ NF-e autorizada</div>
              {(resultado?.chave_nfe || venda?.chave_nfe) && (
                <div style={{ fontSize: 12, color: '#166534', marginBottom: 12, wordBreak: 'break-all' }}>
                  Chave: {resultado?.chave_nfe ?? venda?.chave_nfe}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {(resultado?.danfe_url || venda?.chave_nfe) && (
                  <a
                    href={resultado?.danfe_url ?? `https://${process.env.NEXT_PUBLIC_FOCUSNFE_AMBIENTE === 'producao' ? 'api' : 'homologacao'}.focusnfe.com.br/danfe/${venda?.chave_nfe}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ textDecoration: 'none' }}
                  >
                    <button style={{ padding: '8px 16px', fontSize: 13, fontWeight: 700, borderRadius: 8, border: 'none', background: '#166534', color: '#fff', cursor: 'pointer' }}>
                      🖨️ Imprimir DANFE
                    </button>
                  </a>
                )}
                <button onClick={handleGerarZip} disabled={gerandoZip}
                  style={{ padding: '8px 16px', fontSize: 13, fontWeight: 700, borderRadius: 8, border: 'none', background: '#166534', color: '#fff', cursor: 'pointer', opacity: gerandoZip ? 0.6 : 1 }}>
                  {gerandoZip ? '⏳ Gerando...' : '📦 ZIP + Email'}
                </button>
              </div>
            </div>
          ) : resultado?.sucesso === false ? (
            <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: 12, padding: '1.25rem', marginBottom: 24 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#991B1B', marginBottom: 4 }}>❌ Erro ao emitir</div>
              <div style={{ fontSize: 13, color: '#991B1B' }}>{resultado.erro}</div>
            </div>
          ) : vendaId ? (
            <button onClick={handleEmitir} disabled={emitindo}
              style={{ padding: '12px 24px', fontSize: 14, fontWeight: 700, borderRadius: 8, border: 'none', background: C.cor, color: '#fff', cursor: 'pointer', opacity: emitindo ? 0.6 : 1 }}>
              {emitindo ? '⏳ Emitindo NF-e...' : '🧾 Emitir NF-e de Saída'}
            </button>
          ) : (
            <div style={{ color: C.sub, fontSize: 13 }}>Nenhuma venda vinculada a este lote.</div>
          )}

        </div>
      </div>
    </>
  )
}
