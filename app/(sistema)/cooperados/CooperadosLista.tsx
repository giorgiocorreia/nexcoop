'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Cooperado, StatusCooperado } from '@/types/database'

const STATUS_CONFIG: Record<
  StatusCooperado,
  { label: string; cor: string; bg: string }
> = {
  proposta:    { label: 'Proposta',     cor: '#6366f1', bg: '#ede9fe' },
  probatorio:  { label: 'Probatório',   cor: '#185FA5', bg: '#E6F1FB' },
  ativo:       { label: 'Ativo',        cor: '#0F6E56', bg: '#E1F5EE' },
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

interface Props {
  cooperados: Cooperado[]
}

export default function CooperadosLista({ cooperados }: Props) {
  const router = useRouter()
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<StatusCooperado | 'todos'>('todos')
  const [hovered, setHovered] = useState<string | null>(null)

  // Resumo por status
  const resumo = useMemo(() => {
    const total = cooperados.length
    const ativos = cooperados.filter(c => c.status === 'ativo').length
    const probatorios = cooperados.filter(c => c.status === 'probatorio').length
    const inadimplentes = cooperados.filter(c => c.status === 'inadimplente').length
    return { total, ativos, probatorios, inadimplentes }
  }, [cooperados])

  // Filtro combinado
  const filtrados = useMemo(() => {
    const q = busca.toLowerCase().trim()
    return cooperados.filter(c => {
      const passaBusca =
        !q ||
        c.nome_completo.toLowerCase().includes(q) ||
        (c.cpf ?? '').replace(/\D/g, '').includes(q.replace(/\D/g, '')) ||
        (c.email ?? '').toLowerCase().includes(q)
      const passaStatus =
        filtroStatus === 'todos' || c.status === filtroStatus
      return passaBusca && passaStatus
    })
  }, [cooperados, busca, filtroStatus])

  return (
    <div style={{ maxWidth: '1100px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '600', color: '#1a1a1a', margin: 0 }}>
            Filiados
          </h1>
          <p style={{ fontSize: '14px', color: '#888', marginTop: '4px' }}>
            {cooperados.length} filiado{cooperados.length !== 1 ? 's' : ''} cadastrado{cooperados.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => router.push('/cooperados/novo')}
          style={{
            padding: '9px 18px', background: '#1D9E75', color: '#fff',
            border: 'none', borderRadius: '8px', fontSize: '13px',
            fontWeight: '600', cursor: 'pointer', display: 'flex',
            alignItems: 'center', gap: '6px',
          }}
          onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = '#178a64')}
          onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = '#1D9E75')}
        >
          <span style={{ fontSize: '16px' }}>+</span> Novo filiado
        </button>
      </div>

      {/* Cards de resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total', valor: resumo.total, cor: '#444', bg: '#f5f5f2', border: '#e5e3dc' },
          { label: 'Ativos', valor: resumo.ativos, cor: '#0F6E56', bg: '#E1F5EE', border: '#1D9E7533' },
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
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', color: '#aaa' }}>🔍</span>
          <input
            type="text"
            placeholder="Buscar por nome, CPF ou e-mail…"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            style={{
              width: '100%', padding: '9px 12px 9px 32px',
              border: '1px solid #d5d3cc', borderRadius: '8px',
              fontSize: '13px', background: '#fff', color: '#1a1a1a',
              outline: 'none', boxSizing: 'border-box',
            }}
            onFocus={e => (e.target.style.borderColor = '#1D9E75')}
            onBlur={e => (e.target.style.borderColor = '#d5d3cc')}
          />
        </div>

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
              ? 'Nenhum filiado encontrado com esses filtros.'
              : 'Nenhum filiado cadastrado ainda.'}
            {(busca || filtroStatus !== 'todos') && (
              <div style={{ marginTop: '8px' }}>
                <button
                  onClick={() => { setBusca(''); setFiltroStatus('todos') }}
                  style={{ fontSize: '12px', color: '#1D9E75', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Limpar filtros
                </button>
              </div>
            )}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
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
                          background: '#e8f7f2', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', fontSize: '13px', fontWeight: '600',
                          color: '#0F6E56', flexShrink: 0,
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
        )}
      </div>

      {filtrados.length > 0 && (
        <p style={{ fontSize: '12px', color: '#aaa', marginTop: '8px', textAlign: 'right' }}>
          {filtrados.length} de {cooperados.length} cooperado{cooperados.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}
