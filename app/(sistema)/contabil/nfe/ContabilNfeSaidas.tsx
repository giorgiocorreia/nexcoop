'use client'

/**
 * Contábil — lista de NF-e de saída (consulta).
 * Independente de comercializacao/fiscal/FiscalNfeClient.tsx
 */

import { useEffect, useMemo, useState } from 'react'
import { fmt } from '@/lib/fmt'
import {
  listarNfeSaidaContabil,
  kpisNfeSaidaContabil,
  sincronizarNfeSaidaContabil,
  sincronizarSaidasProcessandoContabil,
} from './actions'
import { ContentCard } from '@/components/comercializacao/ui/ContentCard'
import { KpiCard } from '@/components/comercializacao/ui/KpiCard'
import { Badge } from '@/components/comercializacao/ui/Badge'
import { Input, Select } from '@/components/comercializacao/ui/Field'
import { COM_C } from '@/components/comercializacao/ui/tokens'
import { Btn } from '@/components/ui/Btn'

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
  autorizada: { label: 'Autorizada', bg: COM_C.verdeLt, cor: COM_C.verde },
  processando: { label: 'Processando', bg: COM_C.laranjaLt, cor: COM_C.laranja },
  cancelada: { label: 'Cancelada', bg: COM_C.vermelhoLt, cor: COM_C.vermelho },
  erro: { label: 'Erro', bg: COM_C.laranjaLt, cor: '#9a3412' },
}

function danfeDeXml(xml: string | null) {
  if (!xml) return ''
  return xml.replace('/XMLs/', '/DANFEs/').replace('-nfe.xml', '-nfe.pdf')
}

export default function ContabilNfeSaidas() {
  const [lista, setLista] = useState<NfeSaida[]>([])
  const [kpis, setKpis] = useState({
    total: 0,
    autorizadas: 0,
    canceladas: 0,
    processando: 0,
    valorTotal: 0,
  })
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [syncId, setSyncId] = useState<string | null>(null)
  const [syncTodas, setSyncTodas] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  async function carregar() {
    setLoading(true)
    try {
      const [s, k] = await Promise.all([listarNfeSaidaContabil(), kpisNfeSaidaContabil()])
      setLista(s as unknown as NfeSaida[])
      setKpis(k)
    } catch (e: any) {
      setErro(e?.message ?? 'Erro ao carregar saídas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  const filtradas = useMemo(() => {
    return lista.filter(n => {
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
  }, [lista, busca, filtroStatus])

  async function syncUma(nfe: NfeSaida) {
    setSyncId(nfe.id)
    setErro(null)
    try {
      const res = await sincronizarNfeSaidaContabil(nfe.id)
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

  async function syncTodasFn() {
    setSyncTodas(true)
    setErro(null)
    try {
      const resumo = await sincronizarSaidasProcessandoContabil()
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

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: COM_C.txtSub, fontSize: 13 }}>
        Carregando saídas…
      </div>
    )
  }

  return (
    <>
      {msg && (
        <div
          style={{
            marginBottom: 12,
            padding: '10px 14px',
            borderRadius: 8,
            background: COM_C.verdeLt,
            color: COM_C.verde,
            fontSize: 13,
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span>{msg}</span>
          <button type="button" onClick={() => setMsg(null)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
            ×
          </button>
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

      <div className="com-kpi-grid-4" style={{ marginBottom: 16 }}>
        <KpiCard label="Total" value={String(kpis.total)} icon="ti-file-invoice" cor={COM_C.azul} corLt={COM_C.azulLt} />
        <KpiCard label="Autorizadas" value={String(kpis.autorizadas)} icon="ti-circle-check" cor={COM_C.verde} corLt={COM_C.verdeLt} />
        <KpiCard label="Canceladas" value={String(kpis.canceladas)} icon="ti-ban" cor={COM_C.vermelho} corLt={COM_C.vermelhoLt} />
        <KpiCard
          label="Valor autorizado"
          value={fmt.moeda(Number(kpis.valorTotal))}
          icon="ti-currency-real"
          cor={COM_C.marrom}
          corLt={COM_C.marromLt}
        />
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
        {lista.some(n => n.status_nfe === 'processando') && (
          <Btn variante="marrom" tamanho="sm" icone="ti-refresh" disabled={syncTodas} onClick={syncTodasFn}>
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
                  <th key={h} style={{ textAlign: h === 'Documentos' ? 'right' : 'left' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: COM_C.txtSub }}>
                    Nenhuma NF-e de saída
                  </td>
                </tr>
              )}
              {filtradas.map(nfe => {
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
                        {(nfe.lotes as any)?.safras?.ano
                          ? ` · Safra ${(nfe.lotes as any).safras.ano}`
                          : ''}
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
                            onClick={() => syncUma(nfe)}
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
  )
}
