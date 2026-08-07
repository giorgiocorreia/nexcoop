'use client'

/**
 * Contábil — lista de NF-e de entrada (consulta).
 * Independente de comercializacao/fiscal/FiscalEntradasClient.tsx
 */

import { useCallback, useEffect, useState } from 'react'
import { fmt } from '@/lib/fmt'
import {
  listarEntradasContabil,
  sincronizarEntradasProcessandoContabil,
} from './actions'
import { ContentCard } from '@/components/comercializacao/ui/ContentCard'
import { Badge } from '@/components/comercializacao/ui/Badge'
import { EmptyState } from '@/components/comercializacao/ui/EmptyState'
import { COM_C } from '@/components/comercializacao/ui/tokens'
import { Btn } from '@/components/ui/Btn'

export default function ContabilNfeEntradas() {
  const [dados, setDados] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [sincronizando, setSincronizando] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    const e = await listarEntradasContabil()
    setDados(Array.isArray(e) ? e : [])
    setLoading(false)
  }, [])

  useEffect(() => {
    let cancelado = false
    ;(async () => {
      setLoading(true)
      try {
        const resumo = await sincronizarEntradasProcessandoContabil()
        if (!cancelado && resumo.autorizadas > 0) {
          setMsg(`${resumo.autorizadas} NF-e de entrada sincronizada(s) com a SEFAZ.`)
        }
      } catch {
        /* lista mesmo se sync falhar */
      }
      if (!cancelado) await carregar()
    })()
    return () => {
      cancelado = true
    }
  }, [carregar])

  async function handleSincronizar() {
    setSincronizando(true)
    setErro(null)
    setMsg(null)
    try {
      const resumo = await sincronizarEntradasProcessandoContabil()
      await carregar()
      setMsg(
        resumo.total === 0
          ? 'Nenhuma entrada em processamento.'
          : `Entradas: ${resumo.autorizadas} autorizada(s), ${resumo.aindaProcessando} processando.`,
      )
    } catch (e: any) {
      setErro(e?.message ?? 'Erro ao sincronizar entradas')
    } finally {
      setSincronizando(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: COM_C.txtSub, fontSize: 13 }}>
        Sincronizando com a SEFAZ e carregando…
      </div>
    )
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Btn variante="marrom" tamanho="sm" icone="ti-refresh" disabled={sincronizando} onClick={handleSincronizar}>
          {sincronizando ? 'Sincronizando…' : 'Sincronizar com SEFAZ'}
        </Btn>
      </div>

      {msg && (
        <div
          style={{
            marginBottom: 12,
            padding: '10px 14px',
            borderRadius: 8,
            background: COM_C.verdeLt,
            color: COM_C.verde,
            fontSize: 13,
          }}
        >
          {msg}
        </div>
      )}
      {erro && (
        <div
          style={{
            marginBottom: 12,
            padding: '10px 14px',
            borderRadius: 8,
            background: COM_C.laranjaLt,
            color: COM_C.laranjaTxt,
            fontSize: 13,
          }}
        >
          {erro}
        </div>
      )}

      {!dados.length ? (
        <EmptyState emoji="📥" titulo="Nenhuma NF-e de entrada" />
      ) : (
        <ContentCard noPadding>
          <div style={{ overflowX: 'auto' }}>
            <table className="com-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Data', 'Produtor', 'NF-e', 'CFOP', 'Kg', 'Valor', 'Status', 'Docs'].map(h => (
                    <th key={h} style={{ textAlign: h === 'Docs' ? 'right' : 'left' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dados.map((n: any) => (
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
  )
}
