'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Cooperado, StatusCooperado } from '@/types/database'
import BotaoAjuda from '@/components/BotaoAjuda'

const STATUS_CONFIG: Record<
  StatusCooperado,
  { label: string; cor: string; bg: string }
> = {
  proposta:    { label: 'Proposta',     cor: '#6366f1', bg: '#ede9fe' },
  probatorio:  { label: 'Probatório',   cor: '#185FA5', bg: '#E6F1FB' },
  ativo:       { label: 'Ativo',        cor: '#4840CC', bg: '#EEF0FF' },
  inadimplente:{ label: 'Inadimplente', cor: '#854F0B', bg: '#FAEEDA' },
  suspenso:    { label: 'Suspenso',     cor: '#993C1D', bg: '#FAECE7' },
  demitido:    { label: 'Demitido',     cor: '#7f1d1d', bg: '#fee2e2' },
  excluido:    { label: 'Excluído',     cor: '#374151', bg: '#f3f4f6' },
}

const TODOS_STATUS: StatusCooperado[] = [
  'proposta', 'probatorio', 'ativo', 'inadimplente', 'suspenso', 'demitido', 'excluido',
]

function formatarCPF(cpf: string | null) {
  if (!cpf) return '—'
  const s = cpf.replace(/\D/g, '')
  if (s.length !== 11) return cpf
  return `${s.slice(0,3)}.${s.slice(3,6)}.${s.slice(6,9)}-${s.slice(9)}`
}

function formatarData(data: string | null) {
  if (!data) return '—'
  return new Date(data + 'T00:00:00').toLocaleDateString('pt-BR')
}

function getNomenclatura(tipoOrg: string) {
  if (tipoOrg === 'cooperativa') {
    return {
      singular: 'Cooperado',
      plural:   'Cooperados',
      novo:     'Novo cooperado',
      busca:    'Buscar por nome, CPF ou e-mail…',
    }
  }
  return {
    singular: 'Filiado',
    plural:   'Filiados',
    novo:     'Novo filiado',
    busca:    'Buscar por nome, CPF ou e-mail…',
  }
}

interface Props {
  cooperados: Cooperado[]
  tipoOrg:   string
}

export default function CooperadosLista({ cooperados, tipoOrg }: Props) {
  const n = getNomenclatura(tipoOrg)
  const router = useRouter()
  const [lista] = useState(cooperados)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<StatusCooperado | 'todos'>('todos')
  const [hovered, setHovered] = useState<string | null>(null)

  // Resumo por status
  const resumo = useMemo(() => {
    const total = lista.length
    const ativos = lista.filter(c => c.status === 'ativo').length
    const probatorios = lista.filter(c => c.status === 'probatorio').length
    const inadimplentes = lista.filter(c => c.status === 'inadimplente').length
    return { total, ativos, probatorios, inadimplentes }
  }, [lista])

  // Filtro combinado
  const filtrados = useMemo(() => {
    const q = busca.toLowerCase().trim()
    const qDigitos = q.replace(/\D/g, '')
    const normalize = (s: string) =>
      s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    return lista.filter(c => {
      const passaBusca =
        !q ||
        normalize(c.nome_completo).includes(normalize(q)) ||
        (qDigitos.length > 0 && (c.cpf ?? '').replace(/\D/g, '').includes(qDigitos)) ||
        (c.email ?? '').toLowerCase().includes(q)
      const passaStatus =
        filtroStatus === 'todos' || c.status === filtroStatus
      return passaBusca && passaStatus
    })
  }, [lista, busca, filtroStatus])

  return (
    <>
      <style>{`
        .coop-header  { padding: 0 32px; min-height: 88px; display: flex; align-items: center; }
        .coop-content { padding: 28px 32px; }
        @media (max-width: 640px) {
          .coop-header  { padding: 0 16px 0 56px; min-height: 60px; }
          .coop-content { padding: 16px; }
          .coop-kpi-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>

      <header className="coop-header" style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: '#fff', borderBottom: '1px solid #E5E3DC',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, margin: '0 -2rem 0 -2rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: '#EEF0FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="ti ti-users" style={{ fontSize: 20, color: '#635BFF' }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{ fontSize: 19, fontWeight: 800, color: '#1C1917', margin: 0, lineHeight: 1.2 }}>{n.plural}</h1>
              <BotaoAjuda chave="manual_cooperados_url" />
            </div>
            <div style={{ fontSize: 12, color: '#78716C', marginTop: 2 }}>
              {lista.length} {n.plural.toLowerCase()} cadastrados
            </div>
          </div>
        </div>
        <button
          onClick={() => router.push('/cooperados/novo')}
          style={{ padding: '8px 16px', background: '#635BFF', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
        >
          + {n.novo}
        </button>
      </header>

      <div className="coop-content" style={{ background: '#F8F7F4', margin: '0 -2rem -2rem -2rem', minHeight: 'calc(100vh - 88px)' }}>
        <div style={{ maxWidth: '1100px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

          {/* Cards de resumo */}
          <div className="coop-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '1.5rem' }}>
            {[
              { label: `Total de ${n.plural}`, valor: resumo.total, cor: '#444', bg: '#f5f5f2', border: '#e5e3dc' },
              { label: 'Ativos', valor: resumo.ativos, cor: '#4840CC', bg: '#EEF0FF', border: '#635BFF33' },
              { label: 'Probatórios', valor: resumo.probatorios, cor: '#185FA5', bg: '#E6F1FB', border: '#185FA533' },
              { label: 'Inadimplentes', valor: resumo.inadimplentes, cor: '#854F0B', bg: '#FAEEDA', border: '#854F0B33' },
            ].map(card => (
              <div key={card.label} style={{
                background: card.bg, border: `1px solid ${card.border}`,
                borderRadius: '12px', padding: '1rem 1.25rem',
              }}>
                <div style={{ fontSize: '12px', fontWeight: '500', color: card.cor, marginBottom: '4px' }}>
                  {card.label}
                </div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: card.cor }}>
                  {card.valor}
                </div>
              </div>
            ))}
          </div>

          {/* Barra de busca e filtros */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Buscar por nome, CPF ou e-mail…"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              style={{
                flex: 1, minWidth: '220px', padding: '9px 12px',
                border: '1px solid #d5d3cc', borderRadius: '8px',
                fontSize: '13px', background: '#fff', color: '#1a1a1a',
                outline: 'none', boxSizing: 'border-box',
              }}
              onFocus={e => (e.target.style.borderColor = '#635BFF')}
              onBlur={e => (e.target.style.borderColor = '#d5d3cc')}
            />

            <select
              value={filtroStatus}
              onChange={e => setFiltroStatus(e.target.value as StatusCooperado | 'todos')}
              style={{
                padding: '9px 12px', border: '1px solid #d5d3cc', borderRadius: '8px',
                fontSize: '13px', background: '#fff', color: '#1a1a1a',
                outline: 'none', cursor: 'pointer',
              }}
            >
              <option value="todos">Todos os status</option>
              {TODOS_STATUS.map(s => (
                <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
              ))}
            </select>
          </div>

          {/* Tabela */}
          <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', overflow: 'hidden' }}>
            {filtrados.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#aaa', fontSize: '14px' }}>
                {busca || filtroStatus !== 'todos'
                  ? `Nenhum ${n.singular.toLowerCase()} encontrado com esses filtros.`
                  : `Nenhum ${n.singular.toLowerCase()} cadastrado ainda.`}
                {(busca || filtroStatus !== 'todos') && (
                  <div style={{ marginTop: '8px' }}>
                    <button
                      onClick={() => { setBusca(''); setFiltroStatus('todos') }}
                      style={{ fontSize: '12px', color: '#635BFF', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      Limpar filtros
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e5e3dc', background: '#fafaf8' }}>
                      {['Nome', 'CPF', 'E-mail', 'Cidade / UF', 'Admissão', 'Status'].map(col => (
                        <th key={col} style={{
                          padding: '10px 16px', textAlign: 'left',
                          fontSize: '11px', fontWeight: '600', color: '#888',
                          textTransform: 'uppercase', letterSpacing: '0.5px',
                        }}>
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtrados.map((c, i) => {
                      const st = STATUS_CONFIG[c.status]
                      const isHov = hovered === c.id
                      return (
                        <tr
                          key={c.id}
                          onClick={() => router.push(`/cooperados/${c.id}`)}
                          onMouseEnter={() => setHovered(c.id)}
                          onMouseLeave={() => setHovered(null)}
                          style={{
                            borderTop: i > 0 ? '1px solid #f0eeea' : 'none',
                            cursor: 'pointer',
                            background: isHov ? '#fafaf8' : 'transparent',
                            transition: 'background 0.1s',
                          }}
                        >
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{
                                width: '32px', height: '32px', borderRadius: '50%',
                                background: '#EEEDFE', display: 'flex', alignItems: 'center',
                                justifyContent: 'center', fontSize: '13px', fontWeight: '600',
                                color: '#4840CC', flexShrink: 0,
                              }}>
                                {c.nome_completo.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontSize: '13px', fontWeight: '500', color: '#1a1a1a' }}>
                                  {c.nome_completo}
                                </div>
                                {c.numero_matricula && (
                                  <div style={{ fontSize: '11px', color: '#aaa' }}>
                                    Matríc. {c.numero_matricula}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '13px', color: '#555' }}>
                            {formatarCPF(c.cpf)}
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '13px', color: '#555' }}>
                            {c.email || '—'}
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '13px', color: '#555' }}>
                            {c.cidade && c.estado ? `${c.cidade} / ${c.estado}` : c.cidade || c.estado || '—'}
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '13px', color: '#555' }}>
                            {formatarData(c.data_admissao)}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{
                              display: 'inline-block', padding: '3px 10px',
                              borderRadius: '20px', fontSize: '11px', fontWeight: '600',
                              color: st.cor, background: st.bg,
                            }}>
                              {st.label}
                            </span>
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
      </div>
    </>
  )
}
