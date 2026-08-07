'use client'

/**
 * Contábil — lista de NF-e de entrada (consulta).
 * Layout alinhado a ContabilNfeSaidas (KPIs + filtros).
 * Exportar XMLs com seleção (todas ou algumas).
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { fmt } from '@/lib/fmt'
import {
  listarEntradasContabil,
  exportarXmlsEntradasContabil,
} from './actions'
import { ContentCard } from '@/components/comercializacao/ui/ContentCard'
import { KpiCard } from '@/components/comercializacao/ui/KpiCard'
import { Badge } from '@/components/comercializacao/ui/Badge'
import { EmptyState } from '@/components/comercializacao/ui/EmptyState'
import { Input, Select } from '@/components/comercializacao/ui/Field'
import { COM_C } from '@/components/comercializacao/ui/tokens'
import { Btn } from '@/components/ui/Btn'

type Entrada = {
  id: string
  numero_nfe: string | null
  serie: string | null
  chave_nfe: string | null
  status: string
  created_at: string
  quantidade_kg: number | null
  valor_total: number | null
  cfop: string | null
  xml_url: string | null
  danfe_url: string | null
  produtores: { nome: string; cpf?: string } | null
}

const STATUS_ENT: Record<string, { label: string; bg: string; cor: string }> = {
  autorizada: { label: 'Autorizada', bg: COM_C.verdeLt, cor: COM_C.verde },
  emitida: { label: 'Autorizada', bg: COM_C.verdeLt, cor: COM_C.verde },
  processando: { label: 'Processando', bg: COM_C.laranjaLt, cor: COM_C.laranja },
}

function base64ToBlob(b64: string, type: string) {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type })
}

export default function ContabilNfeEntradas() {
  const [lista, setLista] = useState<Entrada[]>([])
  const [kpis, setKpis] = useState({
    total: 0,
    autorizadas: 0,
    processando: 0,
    valorTotal: 0,
  })
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [exportando, setExportando] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setLoading(true)
    setErro(null)
    try {
      const rows = ((await listarEntradasContabil()) as Entrada[]) ?? []
      setLista(rows)
      const autorizadas = rows.filter(
        r => r.status === 'autorizada' || r.status === 'emitida',
      )
      setKpis({
        total: rows.length,
        autorizadas: autorizadas.length,
        processando: rows.filter(r => r.status === 'processando').length,
        valorTotal: autorizadas.reduce((s, r) => s + Number(r.valor_total ?? 0), 0),
      })
      setSelecionados(new Set())
    } catch (e: any) {
      setErro(e?.message ?? 'Erro ao carregar entradas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  const filtradas = useMemo(() => {
    return lista.filter(n => {
      const st = n.status === 'emitida' ? 'autorizada' : n.status
      const okStatus =
        !filtroStatus ||
        st === filtroStatus ||
        (filtroStatus === 'autorizada' && (n.status === 'autorizada' || n.status === 'emitida'))
      const q = busca.trim().toLowerCase()
      const okBusca =
        !q ||
        n.produtores?.nome?.toLowerCase().includes(q) ||
        n.numero_nfe?.includes(q) ||
        n.chave_nfe?.toLowerCase().includes(q) ||
        n.cfop?.includes(q)
      return okStatus && okBusca
    })
  }, [lista, busca, filtroStatus])

  const todosFiltradosMarcados =
    filtradas.length > 0 && filtradas.every(n => selecionados.has(n.id))

  function toggleUm(id: string) {
    setSelecionados(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  function toggleTodosFiltrados() {
    if (todosFiltradosMarcados) {
      setSelecionados(prev => {
        const n = new Set(prev)
        filtradas.forEach(r => n.delete(r.id))
        return n
      })
    } else {
      setSelecionados(prev => {
        const n = new Set(prev)
        filtradas.forEach(r => n.add(r.id))
        return n
      })
    }
  }

  async function handleExportarXmls() {
    const ids = Array.from(selecionados)
    if (!ids.length) {
      setErro('Selecione ao menos uma NF-e para exportar.')
      return
    }
    setExportando(true)
    setErro(null)
    setMsg(null)
    try {
      const res = await exportarXmlsEntradasContabil(ids)
      const blob = base64ToBlob(res.zipBase64, 'application/zip')
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = res.fileName
      a.click()
      URL.revokeObjectURL(url)
      setMsg(
        res.falhas?.length
          ? `${res.incluidos} XML(s) no ZIP. ${res.falhas.length} sem arquivo.`
          : `${res.incluidos} XML(s) exportado(s).`,
      )
    } catch (e: any) {
      setErro(e?.message ?? 'Erro ao exportar XMLs')
    } finally {
      setExportando(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: COM_C.txtSub, fontSize: 13 }}>
        Carregando entradas…
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
        <KpiCard
          label="Autorizadas"
          value={String(kpis.autorizadas)}
          icon="ti-circle-check"
          cor={COM_C.verde}
          corLt={COM_C.verdeLt}
        />
        <KpiCard
          label="Processando"
          value={String(kpis.processando)}
          icon="ti-loader"
          cor={COM_C.laranja}
          corLt={COM_C.laranjaLt}
        />
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
            placeholder="Buscar produtor, nº, chave, CFOP…"
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
        </div>
        <div style={{ minWidth: 160 }}>
          <Select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
            <option value="">Todos os status</option>
            <option value="autorizada">Autorizada</option>
            <option value="processando">Processando</option>
          </Select>
        </div>
        <Btn
          variante="marrom"
          tamanho="sm"
          icone="ti-file-zip"
          disabled={exportando || selecionados.size === 0}
          onClick={handleExportarXmls}
        >
          {exportando
            ? 'Exportando…'
            : `Exportar XMLs${selecionados.size ? ` (${selecionados.size})` : ''}`}
        </Btn>
      </div>

      {!lista.length ? (
        <EmptyState emoji="📥" titulo="Nenhuma NF-e de entrada" />
      ) : (
        <ContentCard noPadding>
          <div style={{ overflowX: 'auto' }}>
            <table className="com-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={todosFiltradosMarcados}
                      onChange={toggleTodosFiltrados}
                      title="Selecionar todas (filtro atual)"
                      style={{ width: 16, height: 16, cursor: 'pointer' }}
                    />
                  </th>
                  {['Data', 'Produtor', 'NF-e', 'CFOP', 'Kg', 'Valor', 'Status', 'Docs'].map(h => (
                    <th key={h} style={{ textAlign: h === 'Docs' ? 'right' : 'left' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtradas.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ padding: '2rem', textAlign: 'center', color: COM_C.txtSub }}>
                      Nenhuma NF-e neste filtro
                    </td>
                  </tr>
                )}
                {filtradas.map(n => {
                  const stKey = n.status === 'emitida' ? 'autorizada' : n.status
                  const st = STATUS_ENT[stKey] ?? {
                    label: n.status,
                    bg: '#F1F0EB',
                    cor: COM_C.txtSub,
                  }
                  return (
                    <tr key={n.id}>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={selecionados.has(n.id)}
                          onChange={() => toggleUm(n.id)}
                          style={{ width: 16, height: 16, cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ color: COM_C.txtSub }}>{fmt.data(n.created_at)}</td>
                      <td style={{ fontWeight: 600 }}>{n.produtores?.nome ?? '—'}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 11 }}>
                        {n.numero_nfe ? `${n.serie ?? '2'}-${n.numero_nfe}` : '—'}
                      </td>
                      <td style={{ color: COM_C.txtSub }}>{n.cfop ?? '—'}</td>
                      <td>{n.quantidade_kg != null ? fmt.peso(n.quantidade_kg) : '—'}</td>
                      <td style={{ fontWeight: 600 }}>
                        {n.valor_total != null ? fmt.moeda(n.valor_total) : '—'}
                      </td>
                      <td>
                        <Badge label={st.label} bg={st.bg} cor={st.cor} dot />
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {n.xml_url && (
                          <Btn variante="verde" tamanho="sm" onClick={() => window.open(n.xml_url!, '_blank')}>
                            XML
                          </Btn>
                        )}
                        {n.danfe_url && (
                          <Btn
                            variante="azul"
                            tamanho="sm"
                            onClick={() => window.open(n.danfe_url!, '_blank')}
                            style={{ marginLeft: 6 }}
                          >
                            DANFE
                          </Btn>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {selecionados.size > 0 && (
            <div
              style={{
                padding: '10px 16px',
                borderTop: `1px solid ${COM_C.borda}`,
                fontSize: 12,
                color: COM_C.txtSub,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <span>
                {selecionados.size} selecionada(s)
                {todosFiltradosMarcados && filtradas.length > 0
                  ? ' · todas do filtro atual'
                  : ''}
              </span>
              <button
                type="button"
                onClick={() => setSelecionados(new Set())}
                style={{
                  border: 'none',
                  background: 'none',
                  color: COM_C.marrom,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: 12,
                }}
              >
                Limpar seleção
              </button>
            </div>
          )}
        </ContentCard>
      )}
    </>
  )
}
