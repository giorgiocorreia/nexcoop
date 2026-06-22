'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { emitirNfeSaidaAction, gerarZipLoteAction } from './actions'
import { fmt } from '@/lib/fmt'

export default function NfeSaidaClient({ lote, venda, vendaId }: {
  lote: any
  venda: any
  vendaId: string | null
}) {
  const router = useRouter()
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
          a.href = url
          a.download = `lote_${lote.codigo}.zip`
          a.click()
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
    <div style={{ padding: '2rem', maxWidth: 800, margin: '0 auto' }}>
      <button
        onClick={() => router.push(`/comercializacao/lotes/${lote.id}`)}
        style={{ fontSize: 12, color: '#888', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 8 }}
      >
        ← Lote {lote.codigo}
      </button>

      <h1 style={{ fontSize: 22, fontWeight: 500, margin: '0 0 4px' }}>NF-e de Saída</h1>
      <p style={{ fontSize: 13, color: '#888', margin: '0 0 24px' }}>{lote.produto_descricao}</p>

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
        <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: 12, padding: '1.25rem', marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Destinatário</div>
          <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>{comprador.nome}</div>
          <div style={{ fontSize: 13, color: '#666' }}>CNPJ: {comprador.cnpj ?? '—'}</div>
          <div style={{ fontSize: 13, color: '#666' }}>IE: {comprador.ie ?? '—'}</div>
          <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
            {[comprador.logradouro, comprador.numero, comprador.bairro, comprador.municipio, comprador.uf, comprador.cep].filter(Boolean).join(', ')}
          </div>
        </div>
      )}

      {/* Status NF-e */}
      {(venda?.status_nfe === 'autorizada' || resultado?.sucesso) ? (
        <div style={{ background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: 12, padding: '1.25rem', marginBottom: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#166534', marginBottom: 8 }}>✅ NF-e autorizada</div>
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
                <button style={{
                  padding: '8px 16px', fontSize: 13, fontWeight: 600, borderRadius: 8,
                  border: 'none', background: '#166534', color: '#fff', cursor: 'pointer'
                }}>
                  🖨️ Imprimir DANFE
                </button>
              </a>
            )}
            <button
              onClick={handleGerarZip}
              disabled={gerandoZip}
              style={{
                padding: '8px 16px', fontSize: 13, fontWeight: 600, borderRadius: 8,
                border: 'none', background: '#166534', color: '#fff', cursor: 'pointer',
                opacity: gerandoZip ? 0.6 : 1
              }}
            >
              {gerandoZip ? '⏳ Gerando...' : '📦 ZIP + Email'}
            </button>
          </div>
        </div>
      ) : resultado?.sucesso === false ? (
        <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 12, padding: '1.25rem', marginBottom: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#991b1b', marginBottom: 4 }}>❌ Erro ao emitir</div>
          <div style={{ fontSize: 13, color: '#991b1b' }}>{resultado.erro}</div>
        </div>
      ) : vendaId ? (
        <button
          onClick={handleEmitir}
          disabled={emitindo}
          style={{
            padding: '12px 24px', fontSize: 14, fontWeight: 600, borderRadius: 8,
            border: 'none', background: '#92400e', color: '#fff', cursor: 'pointer',
            opacity: emitindo ? 0.6 : 1
          }}
        >
          {emitindo ? '⏳ Emitindo NF-e...' : '🧾 Emitir NF-e de Saída'}
        </button>
      ) : (
        <div style={{ color: '#888', fontSize: 13 }}>Nenhuma venda vinculada a este lote.</div>
      )}

    </div>
  )
}
