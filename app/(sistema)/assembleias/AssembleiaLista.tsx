'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Assembleia, TipoAssembleia, StatusAssembleia } from '@/types/database'
import BotaoAjuda from '@/components/BotaoAjuda'

// ─── Configurações ───────────────────────────────────────────────────────────

const TIPO_CONFIG: Record<TipoAssembleia, { sigla: string; label: string; cor: string; bg: string }> = {
  AGO:        { sigla: 'AGO', label: 'Assembleia Geral Ordinária',              cor: '#185FA5', bg: '#E6F1FB' },
  AGE:        { sigla: 'AGE', label: 'Assembleia Geral Extraordinária',         cor: '#6366f1', bg: '#ede9fe' },
  reuniao_CA: { sigla: 'CA',  label: 'Reunião do Conselho de Administração',    cor: '#4840CC', bg: '#EEF0FF' },
  reuniao_CF: { sigla: 'CF',  label: 'Reunião do Conselho Fiscal',              cor: '#854F0B', bg: '#FAEEDA' },
}

const STATUS_CONFIG: Record<StatusAssembleia, { label: string; cor: string; bg: string }> = {
  agendada:  { label: 'Agendada',  cor: '#185FA5', bg: '#E6F1FB' },
  realizada: { label: 'Realizada', cor: '#4840CC', bg: '#EEF0FF' },
  cancelada: { label: 'Cancelada', cor: '#374151', bg: '#f3f4f6' },
}

const MODALIDADE_LABEL: Record<string, string> = {
  presencial: 'Presencial',
  remota:     'Remota',
  hibrida:    'Híbrida',
}

const TODOS_TIPOS:  TipoAssembleia[]   = ['AGO', 'AGE', 'reuniao_CA', 'reuniao_CF']
const TODOS_STATUS: StatusAssembleia[] = ['agendada', 'realizada', 'cancelada']

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatarData(d: string | null) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
}

function diasAte(data: string) {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  const alvo = new Date(data + 'T00:00:00')
  return Math.round((alvo.getTime() - hoje.getTime()) / 86_400_000)
}

// ─── Componente ──────────────────────────────────────────────────────────────

interface Props { assembleias: Assembleia[] }

export default function AssembleiaLista({ assembleias }: Props) {
  const router = useRouter()
  const [busca, setBusca]               = useState('')
  const [filtroTipo, setFiltroTipo]     = useState<TipoAssembleia | 'todos'>('todos')
  const [filtroStatus, setFiltroStatus] = useState<StatusAssembleia | 'todos'>('todos')
  const [filtroAno, setFiltroAno]       = useState<string>('todos')
  const [hovered, setHovered]           = useState<string | null>(null)

  // Anos disponíveis
  const anosDisponiveis = useMemo(() => {
    const set = new Set<string>()
    for (const a of assembleias) set.add(a.data_realizacao.slice(0, 4))
    return Array.from(set).sort((a, b) => b.localeCompare(a))
  }, [assembleias])

  // Cards de resumo
  const resumo = useMemo(() => ({
    total:     assembleias.length,
    agendadas: assembleias.filter(a => a.status === 'agendada').length,
    realizadas:assembleias.filter(a => a.status === 'realizada').length,
    canceladas:assembleias.filter(a => a.status === 'cancelada').length,
  }), [assembleias])

  // Filtro
  const filtradas = useMemo(() => {
    const q = busca.toLowerCase().trim()
    return assembleias.filter(a => {
      if (q && !a.titulo.toLowerCase().includes(q) && !TIPO_CONFIG[a.tipo].label.toLowerCase().includes(q)) return false
      if (filtroTipo   !== 'todos' && a.tipo   !== filtroTipo)   return false
      if (filtroStatus !== 'todos' && a.status !== filtroStatus) return false
      if (filtroAno    !== 'todos' && !a.data_realizacao.startsWith(filtroAno)) return false
      return true
    })
  }, [assembleias, busca, filtroTipo, filtroStatus, filtroAno])

  return (
    <div style={{ maxWidth: '1100px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* ── Cabeçalho ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: '22px', fontWeight: '600', color: '#1a1a1a', margin: 0 }}>Assembleias</h1>
            <BotaoAjuda chave="manual_assembleia_url" />
          </div>
          <p style={{ fontSize: '14px', color: '#888', marginTop: '4px' }}>
            {assembleias.length} registro{assembleias.length !== 1 ? 's' : ''} no total
          </p>
        </div>
        <button
          onClick={() => router.push('/assembleias/nova')}
          style={{
            padding: '9px 18px', background: '#635BFF', color: '#fff',
            border: 'none', borderRadius: '8px', fontSize: '13px',
            fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
          }}
          onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = '#178a64')}
          onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = '#635BFF')}
        >
          <span style={{ fontSize: '16px' }}>+</span> Nova assembleia
        </button>
      </div>

      {/* ── Cards de resumo ────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total',      valor: resumo.total,      cor: '#444',    bg: '#f5f5f2', border: '#e5e3dc' },
          { label: 'Agendadas',  valor: resumo.agendadas,  cor: '#185FA5', bg: '#E6F1FB', border: '#185FA533' },
          { label: 'Realizadas', valor: resumo.realizadas, cor: '#4840CC', bg: '#EEF0FF', border: '#635BFF33' },
          { label: 'Canceladas', valor: resumo.canceladas, cor: '#374151', bg: '#f3f4f6', border: '#d1d5db' },
        ].map(c => (
          <div key={c.label} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: '12px', padding: '1rem 1.25rem' }}>
            <div style={{ fontSize: '12px', fontWeight: '500', color: c.cor, marginBottom: '4px' }}>{c.label}</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: c.cor }}>{c.valor}</div>
          </div>
        ))}
      </div>

      {/* ── Filtros ──────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', color: '#aaa' }}>🔍</span>
          <input
            type="text" placeholder="Buscar por título ou tipo…" value={busca}
            onChange={e => setBusca(e.target.value)}
            style={{
              width: '100%', padding: '9px 12px 9px 32px', border: '1px solid #d5d3cc',
              borderRadius: '8px', fontSize: '13px', background: '#fff', color: '#1a1a1a',
              outline: 'none', boxSizing: 'border-box',
            }}
            onFocus={e => (e.target.style.borderColor = '#635BFF')}
            onBlur={e => (e.target.style.borderColor = '#d5d3cc')}
          />
        </div>

        {[
          {
            val: filtroAno, set: setFiltroAno,
            opts: [{ value: 'todos', label: 'Todos os anos' }, ...anosDisponiveis.map(a => ({ value: a, label: a }))],
          },
          {
            val: filtroTipo, set: setFiltroTipo as (v: string) => void,
            opts: [
              { value: 'todos', label: 'Todos os tipos' },
              ...TODOS_TIPOS.map(t => ({ value: t, label: TIPO_CONFIG[t].sigla + ' — ' + TIPO_CONFIG[t].label.split(' ').slice(0, 3).join(' ') + '…' })),
            ],
          },
          {
            val: filtroStatus, set: setFiltroStatus as (v: string) => void,
            opts: [{ value: 'todos', label: 'Todos os status' }, ...TODOS_STATUS.map(s => ({ value: s, label: STATUS_CONFIG[s].label }))],
          },
        ].map((sel, i) => (
          <select
            key={i}
            value={sel.val}
            onChange={e => sel.set(e.target.value)}
            style={{ padding: '9px 12px', border: '1px solid #d5d3cc', borderRadius: '8px', fontSize: '13px', background: '#fff', color: '#1a1a1a', outline: 'none', cursor: 'pointer' }}
          >
            {sel.opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ))}

        {(busca || filtroTipo !== 'todos' || filtroStatus !== 'todos' || filtroAno !== 'todos') && (
          <button
            onClick={() => { setBusca(''); setFiltroTipo('todos'); setFiltroStatus('todos'); setFiltroAno('todos') }}
            style={{ padding: '9px 14px', border: '1px solid #d5d3cc', borderRadius: '8px', fontSize: '12px', background: '#fff', color: '#666', cursor: 'pointer' }}
          >
            ✕ Limpar
          </button>
        )}
      </div>

      {/* ── Tabela ───────────────────────────────────────────────────────────── */}
      <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', overflow: 'hidden' }}>
        {filtradas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#aaa', fontSize: '14px' }}>
            Nenhuma assembleia encontrada com os filtros selecionados.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e3dc', background: '#fafaf8' }}>
                {['Tipo', 'Título', 'Data', 'Modalidade', 'Quórum', 'Status'].map(col => (
                  <th key={col} style={{
                    padding: '10px 16px', textAlign: 'left',
                    fontSize: '11px', fontWeight: '600', color: '#888',
                    textTransform: 'uppercase', letterSpacing: '0.5px',
                  }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.map((a, i) => {
                const tipo     = TIPO_CONFIG[a.tipo]
                const st       = STATUS_CONFIG[a.status]
                const dias     = diasAte(a.data_realizacao)
                const proxima  = a.status === 'agendada' && dias >= 0 && dias <= 7
                const hoje     = a.status === 'agendada' && dias === 0
                const isHov    = hovered === a.id

                return (
                  <tr
                    key={a.id}
                    onClick={() => router.push(`/assembleias/${a.id}`)}
                    onMouseEnter={() => setHovered(a.id)}
                    onMouseLeave={() => setHovered(null)}
                    style={{
                      borderTop: i > 0 ? '1px solid #f0eeea' : 'none',
                      cursor: 'pointer',
                      background: proxima && !isHov ? '#fffdf5' : isHov ? '#fafaf8' : 'transparent',
                    }}
                  >
                    {/* Tipo */}
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        display: 'inline-block', padding: '3px 9px',
                        borderRadius: '6px', fontSize: '11px', fontWeight: '700',
                        color: tipo.cor, background: tipo.bg, letterSpacing: '0.5px',
                      }}>
                        {tipo.sigla}
                      </span>
                    </td>

                    {/* Título */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '500', color: '#1a1a1a' }}>
                          {a.titulo}
                        </span>
                        {hoje && (
                          <span style={{ padding: '2px 7px', background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: '4px', fontSize: '10px', fontWeight: '700', color: '#92400e' }}>
                            HOJE
                          </span>
                        )}
                        {proxima && !hoje && (
                          <span style={{ padding: '2px 7px', background: '#E6F1FB', border: '1px solid #93c5fd', borderRadius: '4px', fontSize: '10px', fontWeight: '600', color: '#185FA5' }}>
                            em {dias}d
                          </span>
                        )}
                      </div>
                      {a.local && (
                        <div style={{ fontSize: '11px', color: '#aaa', marginTop: '2px' }}>📍 {a.local}</div>
                      )}
                    </td>

                    {/* Data */}
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#555', whiteSpace: 'nowrap' }}>
                      {formatarData(a.data_realizacao)}
                    </td>

                    {/* Modalidade */}
                    <td style={{ padding: '12px 16px', fontSize: '12px', color: '#666' }}>
                      {MODALIDADE_LABEL[a.modalidade] ?? a.modalidade}
                    </td>

                    {/* Quórum */}
                    <td style={{ padding: '12px 16px' }}>
                      {a.status === 'realizada' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '13px', fontWeight: '600', color: a.quorum_atingido ? '#4840CC' : '#993C1D' }}>
                            {a.total_presentes}
                          </span>
                          {a.quorum_minimo ? (
                            <span style={{ fontSize: '11px', color: '#aaa' }}>/ {a.quorum_minimo}</span>
                          ) : null}
                          <span style={{ fontSize: '11px' }}>{a.quorum_atingido ? '✓' : '✗'}</span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#aaa' }}>
                          {a.quorum_minimo ? `Mín. ${a.quorum_minimo}` : '—'}
                        </span>
                      )}
                    </td>

                    {/* Status */}
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

      {filtradas.length > 0 && (
        <p style={{ fontSize: '12px', color: '#aaa', marginTop: '8px', textAlign: 'right' }}>
          {filtradas.length} de {assembleias.length} assembleia{assembleias.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}
