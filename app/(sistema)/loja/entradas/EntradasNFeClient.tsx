'use client'

import { useEffect, useState, useTransition } from 'react'
import {
  listarEntradasNFe,
  consultarNFeNaSEFAZ,
  vincularNFe,
  kpisEntradasNFe,
} from './actions'

type Compra = Awaited<ReturnType<typeof listarEntradasNFe>>[0]

type DadosNFe = {
  numero: string
  serie: string
  dataEmissao: string
  emitente: string
  cnpjEmitente: string
  valorTotal: number
  status: string
}

const hoje = new Date().toISOString().slice(0, 10)
const primeiroDiaMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)

const fmtMoeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtData  = (d: string | null) => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—'
const compraNum = (id: string) => `#${id.slice(-4).toUpperCase()}`

function badgeStatus(s: string | null) {
  if (s === 'com_chave') return { bg: '#EAF3DE', color: '#3B6D11', label: 'Com chave' }
  if (s === 'sem_nota')  return { bg: '#F1EFE8', color: '#5F5E5A', label: 'Sem nota' }
  return { bg: '#FAEEDA', color: '#854F0B', label: 'Sem chave' }
}

const inp: React.CSSProperties = {
  fontSize: 12, padding: '5px 8px', border: '0.5px solid #d1d5db', borderRadius: 8,
}

export default function EntradasNFeClient({ orgId }: { orgId: string }) {
  const [compras, setCompras]       = useState<Compra[]>([])
  const [kpis, setKpis]             = useState({ total: 0, comChave: 0, semChave: 0, valorTotal: 0 })
  const [carregando, setCarregando] = useState(true)
  const [mensagem, setMensagem]     = useState('')

  const [filtros, setFiltros] = useState({
    dataInicio: primeiroDiaMes,
    dataFim: hoje,
    fornecedor: '',
    status: 'todos',
  })

  const [modalAberto, setModalAberto]   = useState(false)
  const [compraAlvo, setCompraAlvo]     = useState<Compra | null>(null)
  const [chaveInput, setChaveInput]     = useState('')
  const [dadosNFe, setDadosNFe]         = useState<DadosNFe | null>(null)
  const [erroConsulta, setErroConsulta] = useState('')
  const [consultando, startConsulta]    = useTransition()
  const [vinculando, startVinculo]      = useTransition()

  async function carregar() {
    setCarregando(true)
    try {
      const [lista, k] = await Promise.all([
        listarEntradasNFe(orgId, filtros),
        kpisEntradasNFe(orgId, filtros.dataInicio, filtros.dataFim),
      ])
      setCompras(lista)
      setKpis(k)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [filtros])

  function handleConsultar() {
    const chave = chaveInput.replace(/\D/g, '')
    if (chave.length !== 44) { setErroConsulta('A chave deve ter 44 dígitos numéricos.'); return }
    setErroConsulta('')
    setDadosNFe(null)
    startConsulta(async () => {
      const res = await consultarNFeNaSEFAZ(chave)
      if (res.ok && res.dados) setDadosNFe(res.dados)
      else setErroConsulta(res.erro ?? 'Erro ao consultar SEFAZ')
    })
  }

  function handleVincular() {
    if (!compraAlvo || !dadosNFe) return
    startVinculo(async () => {
      const res = await vincularNFe(compraAlvo.id, orgId, {
        chaveAcesso:  chaveInput.replace(/\D/g, ''),
        serie:        dadosNFe.serie,
        dataEmissao:  dadosNFe.dataEmissao,
        emitente:     dadosNFe.emitente,
        cnpjEmitente: dadosNFe.cnpjEmitente,
        valorNfe:     dadosNFe.valorTotal,
        numeroNf:     dadosNFe.numero,
      })
      if (res.ok) {
        setMensagem('NF-e vinculada com sucesso!')
        setModalAberto(false)
        setDadosNFe(null)
        setChaveInput('')
        setTimeout(() => setMensagem(''), 4000)
        carregar()
      } else {
        setErroConsulta(res.erro ?? 'Erro ao vincular')
      }
    })
  }

  function abrirModal(compra: Compra) {
    setCompraAlvo(compra)
    setChaveInput('')
    setDadosNFe(null)
    setErroConsulta('')
    setModalAberto(true)
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1100, fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20 }}>
        <a href="/loja" style={{ fontSize: 13, color: '#78716c', textDecoration: 'none' }}>Loja</a>
        <span style={{ fontSize: 13, color: '#e5e3dc' }}>/</span>
        <span style={{ fontSize: 13, color: '#78716c', fontWeight: 600 }}>Entradas NF-e</span>
      </div>

      {mensagem && (
        <div style={{ background: '#EAF3DE', border: '0.5px solid #C0DD97', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#3B6D11' }}>
          {mensagem}
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Total no período', value: String(kpis.total),             cor: '#E07B30' },
          { label: 'Com chave SEFAZ',  value: String(kpis.comChave),          cor: '#3B6D11' },
          { label: 'Sem chave',        value: String(kpis.semChave),          cor: '#854F0B' },
          { label: 'Valor total',      value: fmtMoeda(kpis.valorTotal),      cor: '#111827' },
        ].map(k => (
          <div key={k.label} style={{ background: '#f9fafb', border: '1px solid #e5e3dc', borderRadius: 10, padding: '14px 16px' }}>
            <p style={{ fontSize: 11, fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 4px' }}>{k.label}</p>
            <p style={{ fontSize: 22, fontWeight: 500, color: k.cor, margin: 0 }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: '#6b7280' }}>De</span>
        <input type="date" value={filtros.dataInicio} onChange={e => setFiltros(p => ({ ...p, dataInicio: e.target.value }))} style={inp} />
        <span style={{ fontSize: 12, color: '#6b7280' }}>Até</span>
        <input type="date" value={filtros.dataFim}    onChange={e => setFiltros(p => ({ ...p, dataFim: e.target.value }))}    style={inp} />
        <input type="text" placeholder="Buscar fornecedor..." value={filtros.fornecedor}
          onChange={e => setFiltros(p => ({ ...p, fornecedor: e.target.value }))}
          style={{ ...inp, width: 180 }} />
        <select value={filtros.status} onChange={e => setFiltros(p => ({ ...p, status: e.target.value }))} style={inp}>
          <option value="todos">Todos os status</option>
          <option value="com_chave">Com chave</option>
          <option value="sem_chave">Sem chave</option>
          <option value="sem_nota">Sem nota</option>
        </select>
      </div>

      {/* Tabela */}
      <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: 12, overflow: 'hidden' }}>
        {carregando ? (
          <p style={{ padding: 24, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>Carregando...</p>
        ) : compras.length === 0 ? (
          <p style={{ padding: 24, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>Nenhuma compra encontrada no período.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#fafaf9', borderBottom: '1px solid #e5e3dc' }}>
                {['Compra', 'Data', 'Fornecedor', 'Nº NF', 'Chave de acesso', 'Valor', 'Status', 'Ações'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {compras.map((c, i) => {
                const badge = badgeStatus(c.status_nfe)
                const forn  = (c.loja_fornecedores as any)
                return (
                  <tr key={c.id} style={{ borderBottom: i < compras.length - 1 ? '1px solid #f5f5f4' : 'none' }}>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: '#6b7280' }}>{compraNum(c.id)}</td>
                    <td style={{ padding: '10px 12px', fontSize: 12 }}>{fmtData(c.data_compra)}</td>
                    <td style={{ padding: '10px 12px', fontSize: 12 }}>{forn?.nome ?? '—'}</td>
                    <td style={{ padding: '10px 12px', fontSize: 12 }}>{c.numero_nf ?? '—'}</td>
                    <td style={{ padding: '10px 12px', fontSize: 11, fontFamily: 'monospace', color: '#6b7280' }}>
                      {c.chave_acesso_nfe ? `${c.chave_acesso_nfe.slice(0, 10)}…${c.chave_acesso_nfe.slice(-4)}` : '—'}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 12 }}>{fmtMoeda(Number(c.total) ?? 0)}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ background: badge.bg, color: badge.color, fontSize: 11, fontWeight: 500, padding: '3px 8px', borderRadius: 99 }}>
                        {badge.label}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {c.status_nfe === 'sem_chave' && (
                        <button onClick={() => abrirModal(c)}
                          style={{ fontSize: 11, padding: '4px 10px', border: '1px solid #E07B30', borderRadius: 6, background: 'transparent', cursor: 'pointer', color: '#E07B30', fontWeight: 500 }}>
                          Vincular
                        </button>
                      )}
                      {c.status_nfe === 'com_chave' && (
                        <a href={`/loja/compras/${c.id}`}
                          style={{ fontSize: 11, padding: '4px 10px', border: '1px solid #d1d5db', borderRadius: 6, textDecoration: 'none', color: '#374151', display: 'inline-block' }}>
                          Ver compra
                        </a>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal vincular */}
      {modalAberto && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e3dc', padding: '1.5rem', width: 560, maxHeight: '90vh', overflowY: 'auto' }}>

            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#1a1a1a' }}>Vincular NF-e à compra</h2>

            {compraAlvo && (
              <div style={{ background: '#f9fafb', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#6b7280', marginBottom: 16 }}>
                Compra {compraNum(compraAlvo.id)} · {fmtData(compraAlvo.data_compra)} · {fmtMoeda(Number(compraAlvo.total) ?? 0)}
              </div>
            )}

            <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>
              Chave de acesso (44 dígitos)
            </label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input
                type="text"
                value={chaveInput}
                onChange={e => setChaveInput(e.target.value)}
                placeholder="35250654305114000179550010000034210000012345"
                maxLength={44}
                style={{ flex: 1, fontSize: 11, fontFamily: 'monospace', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 8, outline: 'none' }}
              />
              <button onClick={handleConsultar} disabled={consultando}
                style={{ background: '#E07B30', color: '#fff', border: 'none', borderRadius: 8, padding: '0 16px', fontSize: 13, fontWeight: 500, cursor: consultando ? 'not-allowed' : 'pointer', opacity: consultando ? 0.7 : 1 }}>
                {consultando ? 'Consultando...' : 'Consultar'}
              </button>
            </div>

            {erroConsulta && (
              <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#dc2626', marginBottom: 12 }}>
                {erroConsulta}
              </div>
            )}

            {dadosNFe && (
              <div style={{ background: '#EAF3DE', border: '1px solid #C0DD97', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#3B6D11', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 8px' }}>
                  NF-e localizada na SEFAZ
                </p>
                {[
                  ['Emitente',      `${dadosNFe.emitente} — ${dadosNFe.cnpjEmitente}`],
                  ['Número / Série', `${dadosNFe.numero} / ${dadosNFe.serie}`],
                  ['Data emissão',  fmtData(dadosNFe.dataEmissao)],
                  ['Valor total',   fmtMoeda(dadosNFe.valorTotal)],
                  ['Status SEFAZ',  dadosNFe.status],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                    <span style={{ color: '#6b7280' }}>{k}</span>
                    <span style={{ fontWeight: 500, color: '#27500A' }}>{v}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 12, borderTop: '1px solid #e5e3dc' }}>
              <button onClick={() => setModalAberto(false)}
                style={{ background: 'transparent', border: '1px solid #d1d5db', borderRadius: 8, padding: '7px 14px', fontSize: 13, cursor: 'pointer', color: '#6b7280' }}>
                Cancelar
              </button>
              {dadosNFe && (
                <button onClick={handleVincular} disabled={vinculando}
                  style={{ background: '#E07B30', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 13, fontWeight: 500, cursor: vinculando ? 'not-allowed' : 'pointer', opacity: vinculando ? 0.7 : 1 }}>
                  {vinculando ? 'Salvando...' : 'Vincular NF-e'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
