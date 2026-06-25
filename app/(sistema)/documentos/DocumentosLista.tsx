'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Documento, CategoriaDocumento } from '@/types/database'
import BotaoAjuda from '@/components/BotaoAjuda'

// ─── Configurações ────────────────────────────────────────────────────────────

const CATEGORIA_CONFIG: Record<CategoriaDocumento, { label: string; cor: string; bg: string; icone: string }> = {
  estatuto:   { label: 'Estatuto',    cor: '#185FA5', bg: '#E6F1FB', icone: '📋' },
  ata:        { label: 'Ata',         cor: '#4840CC', bg: '#EEF0FF', icone: '📝' },
  contrato:   { label: 'Contrato',    cor: '#6366f1', bg: '#ede9fe', icone: '🤝' },
  convenio:   { label: 'Convênio',    cor: '#7c3aed', bg: '#f5f3ff', icone: '🔗' },
  edital:     { label: 'Edital',      cor: '#0e7490', bg: '#ecfeff', icone: '📢' },
  certidao:   { label: 'Certidão',    cor: '#854F0B', bg: '#FAEEDA', icone: '📜' },
  licenca:    { label: 'Licença',     cor: '#993C1D', bg: '#FAECE7', icone: '🔑' },
  relatorio:  { label: 'Relatório',   cor: '#374151', bg: '#f3f4f6', icone: '📊' },
  financeiro: { label: 'Financeiro',  cor: '#4840CC', bg: '#EEF0FF', icone: '💰' },
  projeto:    { label: 'Projeto',     cor: '#6366f1', bg: '#ede9fe', icone: '🎯' },
  aditivo:    { label: 'Aditivo',     cor: '#854F0B', bg: '#FAEEDA', icone: '📎' },
  outro:      { label: 'Outro',       cor: '#374151', bg: '#f3f4f6', icone: '📄' },
}

const TODAS_CATEGORIAS = Object.keys(CATEGORIA_CONFIG) as CategoriaDocumento[]

// ─── Helpers ─────────────────────────────────────────────────────────────────

type StatusValidade = 'vencido' | 'alerta' | 'ok' | 'sem_validade'

function calcStatus(doc: Documento): StatusValidade {
  if (!doc.data_validade) return 'sem_validade'
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  const val  = new Date(doc.data_validade + 'T00:00:00')
  if (val < hoje) return 'vencido'
  const alerta = new Date(hoje); alerta.setDate(alerta.getDate() + doc.alerta_dias)
  if (val <= alerta) return 'alerta'
  return 'ok'
}

const STATUS_VALIDADE: Record<StatusValidade, { label: string; cor: string; bg: string }> = {
  vencido:      { label: 'Vencido',      cor: '#993C1D', bg: '#FAECE7' },
  alerta:       { label: 'Vencendo',     cor: '#854F0B', bg: '#FAEEDA' },
  ok:           { label: 'Em dia',       cor: '#4840CC', bg: '#EEF0FF' },
  sem_validade: { label: 'Sem validade', cor: '#6b7280', bg: '#f3f4f6' },
}

function diasAteVencimento(dataValidade: string | null): number | null {
  if (!dataValidade) return null
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  const val  = new Date(dataValidade + 'T00:00:00')
  return Math.round((val.getTime() - hoje.getTime()) / 86_400_000)
}

function formatarData(d: string | null) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
}

// ─── Componente ──────────────────────────────────────────────────────────────

interface Props { documentos: Documento[] }

export default function DocumentosLista({ documentos }: Props) {
  const router = useRouter()
  const [busca, setBusca]                         = useState('')
  const [filtroCategoria, setFiltroCategoria]     = useState<CategoriaDocumento | 'todas'>('todas')
  const [filtroStatus, setFiltroStatus]           = useState<StatusValidade | 'todos'>('todos')
  const [hovered, setHovered]                     = useState<string | null>(null)

  // Cards de resumo
  const resumo = useMemo(() => {
    const total      = documentos.length
    const vencidos   = documentos.filter(d => calcStatus(d) === 'vencido').length
    const alertas    = documentos.filter(d => calcStatus(d) === 'alerta').length
    const semVal     = documentos.filter(d => calcStatus(d) === 'sem_validade').length
    return { total, vencidos, alertas, semVal }
  }, [documentos])

  // Lista filtrada
  const filtrados = useMemo(() => {
    const q = busca.toLowerCase().trim()
    return documentos.filter(d => {
      const matchBusca = !q ||
        d.nome.toLowerCase().includes(q) ||
        (d.numero_documento ?? '').toLowerCase().includes(q) ||
        (d.orgao_emissor ?? '').toLowerCase().includes(q)
      const matchCat = filtroCategoria === 'todas' || d.categoria === filtroCategoria
      const matchStatus = filtroStatus === 'todos' || calcStatus(d) === filtroStatus
      return matchBusca && matchCat && matchStatus
    })
  }, [documentos, busca, filtroCategoria, filtroStatus])

  const sel: React.CSSProperties = {
    padding: '8px 12px', border: '1px solid #d5d3cc', borderRadius: '8px',
    fontSize: '13px', background: '#fafaf8', color: '#1a1a1a', cursor: 'pointer', outline: 'none',
  }

  return (
    <>
      <style>{`
        .doc-kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 1.5rem; }
        @media (max-width: 640px) { .doc-kpi-grid { grid-template-columns: 1fr 1fr !important; } }
      `}</style>

      {/* ── Header sticky ──────────────────────────────────────────────────── */}
      <header style={{
        margin: '0 -2rem 0 -2rem',
        background: '#fff',
        borderBottom: '1px solid #e5e3dc',
        padding: '0 2rem',
        position: 'sticky', top: 0, zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        minHeight: '64px', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 9,
            background: '#E6F1FB', display: 'flex', alignItems: 'center',
            justifyContent: 'center', flexShrink: 0,
          }}>
            <i className="ti ti-files" style={{ color: '#185FA5', fontSize: 18 }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1a1a1a' }}>Documentos</h1>
              <BotaoAjuda chave="manual_documentos_url" />
            </div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
              Gestão documental da cooperativa
            </div>
          </div>
        </div>
        <button
          onClick={() => router.push('/documentos/novo')}
          style={{
            padding: '9px 18px', background: '#635BFF', color: '#fff',
            border: 'none', borderRadius: '8px', fontSize: '13px',
            fontWeight: '600', cursor: 'pointer', flexShrink: 0,
          }}
        >
          + Novo documento
        </button>
      </header>

      {/* ── Conteúdo ───────────────────────────────────────────────────────── */}
      <div className="doc-content" style={{
        background: '#F8F7F4',
        margin: '0 -2rem -2rem -2rem',
        minHeight: 'calc(100vh - 88px)',
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '1.75rem 2rem' }}>

          {/* Cards de resumo */}
          <div className="doc-kpi-grid">
            {[
              { label: 'Total',        valor: resumo.total,    sub: 'documentos cadastrados', cor: '#185FA5', bg: '#E6F1FB' },
              { label: 'Vencidos',     valor: resumo.vencidos, sub: 'com prazo expirado',     cor: '#993C1D', bg: '#FAECE7' },
              { label: 'Vencendo',     valor: resumo.alertas,  sub: 'dentro do prazo de alerta', cor: '#854F0B', bg: '#FAEEDA' },
              { label: 'Sem validade', valor: resumo.semVal,   sub: 'não têm prazo definido',  cor: '#6b7280', bg: '#f3f4f6' },
            ].map(c => (
              <div key={c.label} style={{ background: c.bg, border: `1px solid ${c.cor}33`, borderRadius: '12px', padding: '1rem 1.25rem' }}>
                <div style={{ fontSize: '12px', fontWeight: '500', color: c.cor, marginBottom: '6px' }}>{c.label}</div>
                <div style={{ fontSize: '26px', fontWeight: '700', color: c.cor }}>{c.valor}</div>
                <div style={{ fontSize: '11px', color: `${c.cor}99`, marginTop: '2px' }}>{c.sub}</div>
              </div>
            ))}
          </div>

          {/* Filtros */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <input
              type="text" value={busca} onChange={e => setBusca(e.target.value)}
              placeholder="Buscar por nome, número, órgão…"
              style={{ flex: '1 1 220px', minWidth: '220px', padding: '8px 12px', border: '1px solid #d5d3cc', borderRadius: '8px', fontSize: '13px', background: '#fafaf8', color: '#1a1a1a', outline: 'none' }}
              onFocus={e => e.target.style.borderColor = '#635BFF'}
              onBlur={e => e.target.style.borderColor = '#d5d3cc'}
            />
            <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value as CategoriaDocumento | 'todas')} style={sel}>
              <option value="todas">Todas as categorias</option>
              {TODAS_CATEGORIAS.map(c => <option key={c} value={c}>{CATEGORIA_CONFIG[c].label}</option>)}
            </select>
            <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value as StatusValidade | 'todos')} style={sel}>
              <option value="todos">Todos os status</option>
              <option value="vencido">Vencido</option>
              <option value="alerta">Vencendo</option>
              <option value="ok">Em dia</option>
              <option value="sem_validade">Sem validade</option>
            </select>
          </div>

          {/* Lista */}
          <div style={{ overflowX: 'auto' }}>
            <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', overflow: 'hidden', minWidth: 700 }}>
              {/* Cabeçalho da lista */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 80px', gap: '0', padding: '10px 16px', background: '#f8f7f4', borderBottom: '1px solid #e5e3dc' }}>
                {['Documento', 'Categoria', 'Órgão emissor', 'Validade', 'Status'].map(h => (
                  <div key={h} style={{ fontSize: '11px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</div>
                ))}
              </div>

              {filtrados.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#aaa', fontSize: '14px' }}>
                  {documentos.length === 0
                    ? 'Nenhum documento cadastrado. Clique em "+ Novo documento" para começar.'
                    : 'Nenhum documento encontrado para os filtros aplicados.'}
                </div>
              ) : (
                filtrados.map((doc, i) => {
                  const cat    = CATEGORIA_CONFIG[doc.categoria]
                  const sv     = calcStatus(doc)
                  const svConf = STATUS_VALIDADE[sv]
                  const dias   = diasAteVencimento(doc.data_validade)
                  const isHov  = hovered === doc.id

                  return (
                    <div key={doc.id}
                      onClick={() => router.push(`/documentos/${doc.id}`)}
                      onMouseEnter={() => setHovered(doc.id)}
                      onMouseLeave={() => setHovered(null)}
                      style={{
                        display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 80px',
                        padding: '12px 16px', cursor: 'pointer',
                        borderTop: i > 0 ? '1px solid #f0eeea' : 'none',
                        background: isHov ? '#fafaf8' : '#fff',
                        transition: 'background 0.1s',
                        alignItems: 'center',
                      }}
                    >
                      {/* Nome */}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '16px', flexShrink: 0 }}>{cat.icone}</span>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '13px', fontWeight: '500', color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {doc.nome}
                              {doc.restrito && (
                                <span style={{ marginLeft: '6px', fontSize: '10px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '4px', padding: '1px 5px', fontWeight: '600' }}>
                                  RESTRITO
                                </span>
                              )}
                            </div>
                            {doc.numero_documento && (
                              <div style={{ fontSize: '11px', color: '#888', marginTop: '1px' }}>nº {doc.numero_documento}</div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Categoria */}
                      <div>
                        <span style={{ fontSize: '11px', fontWeight: '600', color: cat.cor, background: cat.bg, padding: '3px 8px', borderRadius: '6px', whiteSpace: 'nowrap' }}>
                          {cat.label}
                        </span>
                      </div>

                      {/* Órgão */}
                      <div style={{ fontSize: '12px', color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {doc.orgao_emissor || '—'}
                      </div>

                      {/* Validade */}
                      <div>
                        {doc.data_validade ? (
                          <>
                            <div style={{ fontSize: '12px', fontWeight: '500', color: sv === 'vencido' ? '#993C1D' : sv === 'alerta' ? '#854F0B' : '#1a1a1a' }}>
                              {formatarData(doc.data_validade)}
                            </div>
                            {dias !== null && (
                              <div style={{ fontSize: '11px', color: sv === 'vencido' ? '#dc2626' : sv === 'alerta' ? '#854F0B' : '#888', marginTop: '1px' }}>
                                {dias < 0 ? `${Math.abs(dias)}d vencido` : dias === 0 ? 'Vence hoje' : `em ${dias}d`}
                              </div>
                            )}
                          </>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#aaa' }}>—</span>
                        )}
                      </div>

                      {/* Status */}
                      <div>
                        <span style={{ fontSize: '11px', fontWeight: '600', color: svConf.cor, background: svConf.bg, padding: '3px 8px', borderRadius: '6px', whiteSpace: 'nowrap' }}>
                          {svConf.label}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
