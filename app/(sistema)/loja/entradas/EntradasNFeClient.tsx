'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
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

const C = {
  laranja: '#E07B30', laranjaLt: '#FFF7ED',
  borda: '#E5E3DC', bg: '#F8F7F4',
  txt: '#1C1917', txtSub: '#78716C',
}

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
    <>
      <style>{`
        .ent-header  { padding: 0 32px; min-height: 88px; display: flex; align-items: center; }
        .ent-content { padding: 28px 32px; }
        @media (max-width: 640px) {
          .ent-header  { padding: 0 16px 0 56px; min-height: 60px; }
          .ent-content { padding: 16px; }
        }
      `}</style>

      <header className="ent-header" style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: '#fff', borderBottom: `1px solid ${C.borda}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, margin: '0 -2rem 0 -2rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10, flexShrink: 0,
            background: C.laranjaLt, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <i className="ti ti-file-invoice" style={{ fontSize: 20, color: C.laranja }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{ fontSize: 19, fontWeight: 800, color: C.txt, margin: 0, lineHeight: 1.2 }}>
                Entradas NF-e
              </h1>
              {!carregando && kpis.semChave > 0 && (
                <span style={{ background: '#FAEEDA', color: '#854F0B', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6 }}>
                  {kpis.semChave} sem chave
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: C.txtSub, marginTop: 2 }}>
              <Link href="/loja" style={{ color: C.txtSub, textDecoration: 'none' }}>Loja Agropecuária</Link>
              {' / '}Entradas NF-e
            </div>
          </div>
        </div>
      </header>

      <div className="ent-content" style={{ background: C.bg, margin: '0 -2rem -2rem -2rem', minHeight: 'calc(100vh - 88px)' }}>

        {mensagem && (
          <div style={{ background: '#EAF3DE', border: '0.5px solid #C0DD97', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#3B6D11' }}>
            {mensagem}
          </div>
        )}

        {/* Filtros */}
        <div style={{
          background: '#fff', border: `1px solid ${C.borda}`,
          borderRadius: 12, padding: '14px 20px', marginBottom: 16,
          display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center',
        }}>
          <span style={{ fontSize: 12, color: C.txtSub }}>De</span>
          <input type="date" value={filtros.dataInicio} onChange={e => setFiltros(p => ({ ...p, dataInicio: e.target.value }))} style={inp} />
          <span style={{ fontSize: 12, color: C.txtSub }}>Até</span>
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
          {!carregando && (
            <span style={{ fontSize: 12, color: C.txtSub, marginLeft: 'auto', whiteSpace: 'nowrap' }}>
              {kpis.total} entradas · {fmtMoeda(kpis.valorTotal)}
            </span>
          )}
        </div>

        {/* Tabela */}
        <div style={{ background: '#fff', border: `1px solid ${C.borda}`, borderRadius: 12, overflow: 'hidden' }}>
          {carregando ? (
            <p style={{ padding: 24, textAlign: 'center', color: C.txtSub, fontSize: 13 }}>Carregando...</p>
          ) : compras.length === 0 ? (
            <p style={{ padding: 24, textAlign: 'center', color: C.txtSub, fontSize: 13 }}>Nenhuma compra encontrada no período.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                <thead>
                  <tr style={{ background: '#fafaf9', borderBottom: `1px solid ${C.borda}` }}>
                    {['Compra', 'Data', 'Fornecedor', 'Nº NF', 'Chave de acesso', 'Valor', 'Status', 'Ações'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: C.txtSub, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {compras.map((c, i) => {
                    const badge = badgeStatus(c.status_nfe)
                    const forn  = (c.loja_fornecedores as any)
                    return (
                      <tr key={c.id} style={{ borderBottom: i < compras.length - 1 ? `1px solid #f5f5f4` : 'none' }}>
                        <td style={{ padding: '10px 12px', fontSize: 12, color: C.txtSub }}>{compraNum(c.id)}</td>
                        <td style={{ padding: '10px 12px', fontSize: 12 }}>{fmtData(c.data_compra)}</td>
                        <td style={{ padding: '10px 12px', fontSize: 12 }}>{forn?.nome ?? '—'}</td>
                        <td style={{ padding: '10px 12px', fontSize: 12 }}>{c.numero_nf ?? '—'}</td>
                        <td style={{ padding: '10px 12px', fontSize: 11, fontFamily: 'monospace', color: C.txtSub }}>
                          {c.chave_acesso_nfe ? `${c.chave_acesso_nfe.slice(0, 10)}…${c.chave_acesso_nfe.slice(-4)}` : '—'}
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: 12 }}>{fmtMoeda(Number(c.total) ?? 0)}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ background: badge.bg, color: badge.color, fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 99 }}>
                            {badge.label}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          {c.status_nfe === 'sem_chave' && (
                            <button onClick={() => abrirModal(c)}
                              style={{ fontSize: 11, padding: '4px 10px', border: `1px solid ${C.laranja}`, borderRadius: 6, background: 'transparent', cursor: 'pointer', color: C.laranja, fontWeight: 600 }}>
                              Vincular
                            </button>
                          )}
                          {c.status_nfe === 'com_chave' && (
                            <a href={`/loja/compras/${c.id}`}
                              style={{ fontSize: 11, padding: '4px 10px', border: `1px solid ${C.borda}`, borderRadius: 6, textDecoration: 'none', color: C.txt, display: 'inline-block' }}>
                              Ver compra
                            </a>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal vincular */}
      {modalAberto && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${C.borda}`, padding: '1.5rem', width: 560, maxHeight: '90vh', overflowY: 'auto' }}>

            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: C.txt }}>Vincular NF-e à compra</h2>

            {compraAlvo && (
              <div style={{ background: '#f9fafb', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: C.txtSub, marginBottom: 16 }}>
                Compra {compraNum(compraAlvo.id)} · {fmtData(compraAlvo.data_compra)} · {fmtMoeda(Number(compraAlvo.total) ?? 0)}
              </div>
            )}

            <label style={{ fontSize: 11, fontWeight: 700, color: C.txtSub, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>
              Chave de acesso (44 dígitos)
            </label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input
                type="text"
                value={chaveInput}
                onChange={e => setChaveInput(e.target.value)}
                placeholder="35250654305114000179550010000034210000012345"
                maxLength={44}
                style={{ flex: 1, fontSize: 11, fontFamily: 'monospace', padding: '8px 10px', border: `1px solid ${C.borda}`, borderRadius: 8, outline: 'none' }}
              />
              <button onClick={handleConsultar} disabled={consultando}
                style={{ background: C.laranja, color: '#fff', border: 'none', borderRadius: 8, padding: '0 16px', fontSize: 13, fontWeight: 600, cursor: consultando ? 'not-allowed' : 'pointer', opacity: consultando ? 0.7 : 1 }}>
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
                <p style={{ fontSize: 11, fontWeight: 700, color: '#3B6D11', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 8px' }}>
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
                    <span style={{ color: C.txtSub }}>{k}</span>
                    <span style={{ fontWeight: 600, color: '#27500A' }}>{v}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 12, borderTop: `1px solid ${C.borda}` }}>
              <button onClick={() => setModalAberto(false)}
                style={{ background: 'transparent', border: `1px solid ${C.borda}`, borderRadius: 8, padding: '7px 14px', fontSize: 13, cursor: 'pointer', color: C.txtSub }}>
                Cancelar
              </button>
              {dadosNFe && (
                <button onClick={handleVincular} disabled={vinculando}
                  style={{ background: C.laranja, color: '#fff', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: vinculando ? 'not-allowed' : 'pointer', opacity: vinculando ? 0.7 : 1 }}>
                  {vinculando ? 'Salvando...' : 'Vincular NF-e'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
