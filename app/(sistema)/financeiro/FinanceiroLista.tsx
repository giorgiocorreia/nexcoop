'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Lancamento, TipoLancamento, StatusLancamento } from '@/types/database'
import BotaoAjuda from '@/components/BotaoAjuda'

// ─── Configurações de cores ───────────────────────────────────────────────────

const TIPO_CONFIG: Record<TipoLancamento, { label: string; cor: string; bg: string; icone: string; sinal: string }> = {
  receita:      { label: 'Receita',      cor: '#4840CC', bg: '#EEF0FF', icone: '↑', sinal: '+' },
  despesa:      { label: 'Despesa',      cor: '#993C1D', bg: '#FAECE7', icone: '↓', sinal: '-' },
  transferencia:{ label: 'Transferência',cor: '#185FA5', bg: '#E6F1FB', icone: '↔', sinal: '' },
}

const STATUS_CONFIG: Record<StatusLancamento, { label: string; cor: string; bg: string }> = {
  pendente: { label: 'Pendente', cor: '#854F0B', bg: '#FAEEDA' },
  pago:     { label: 'Pago',     cor: '#4840CC', bg: '#EEF0FF' },
  cancelado:{ label: 'Cancelado',cor: '#374151', bg: '#f3f4f6' },
  agendado: { label: 'Agendado', cor: '#6366f1', bg: '#ede9fe' },
}

const TODOS_TIPOS: TipoLancamento[]   = ['receita', 'despesa', 'transferencia']
const TODOS_STATUS: StatusLancamento[] = ['pendente', 'pago', 'cancelado', 'agendado']

// ─── Helpers ─────────────────────────────────────────────────────────────────

const BRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function formatarData(d: string | null) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
}

function mesAnoLabel(d: Date) {
  return d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
}

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface Props {
  lancamentos: Lancamento[]
  nomeCooperado: Record<string, string>
}

// ─── Componente ──────────────────────────────────────────────────────────────

export default function FinanceiroLista({ lancamentos, nomeCooperado }: Props) {
  const router = useRouter()

  // Filtros
  const [busca, setBusca]           = useState('')
  const [filtroTipo, setFiltroTipo] = useState<TipoLancamento | 'todos'>('todos')
  const [filtroStatus, setFiltroStatus] = useState<StatusLancamento | 'todos'>('todos')
  const [filtroMes, setFiltroMes]   = useState<string>('todos') // 'YYYY-MM' ou 'todos'
  const [hovered, setHovered]       = useState<string | null>(null)

  // Meses disponíveis nos lançamentos (para o filtro)
  const mesesDisponiveis = useMemo(() => {
    const set = new Set<string>()
    for (const l of lancamentos) {
      const mes = l.data_competencia.slice(0, 7) // 'YYYY-MM'
      set.add(mes)
    }
    return Array.from(set).sort((a, b) => b.localeCompare(a)) // mais recente primeiro
  }, [lancamentos])

  // Lançamentos filtrados
  const filtrados = useMemo(() => {
    const q = busca.toLowerCase().trim()
    return lancamentos.filter(l => {
      if (q && !l.descricao.toLowerCase().includes(q)) return false
      if (filtroTipo !== 'todos' && l.tipo !== filtroTipo) return false
      if (filtroStatus !== 'todos' && l.status !== filtroStatus) return false
      if (filtroMes !== 'todos' && !l.data_competencia.startsWith(filtroMes)) return false
      return true
    })
  }, [lancamentos, busca, filtroTipo, filtroStatus, filtroMes])

  // Totais sobre os lançamentos FILTRADOS
  const totais = useMemo(() => {
    let receitas = 0, despesas = 0, pendentes = 0
    for (const l of filtrados) {
      if (l.tipo === 'receita')  receitas  += Number(l.valor)
      if (l.tipo === 'despesa')  despesas  += Number(l.valor)
      if (l.status === 'pendente') pendentes += Number(l.valor)
    }
    return { receitas, despesas, saldo: receitas - despesas, pendentes }
  }, [filtrados])

  return (
    <div style={{ maxWidth: '1100px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* ── Cabeçalho ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: '22px', fontWeight: '600', color: '#1a1a1a', margin: 0 }}>
              Financeiro
            </h1>
            <BotaoAjuda chave="manual_financeiro_url" />
          </div>
          <p style={{ fontSize: '14px', color: '#888', marginTop: '4px' }}>
            {lancamentos.length} lançamento{lancamentos.length !== 1 ? 's' : ''} no total
          </p>
        </div>
        <button
          onClick={() => router.push('/financeiro/novo')}
          style={{
            padding: '9px 18px', background: '#635BFF', color: '#fff',
            border: 'none', borderRadius: '8px', fontSize: '13px',
            fontWeight: '600', cursor: 'pointer', display: 'flex',
            alignItems: 'center', gap: '6px',
          }}
          onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = '#178a64')}
          onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = '#635BFF')}
        >
          <span style={{ fontSize: '16px' }}>+</span> Novo lançamento
        </button>
      </div>

      {/* ── Cards de resumo (calculados sobre dados filtrados) ─────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '1.5rem' }}>
        {[
          { label: 'Receitas',  valor: totais.receitas,  cor: '#4840CC', bg: '#EEF0FF', border: '#635BFF33' },
          { label: 'Despesas',  valor: totais.despesas,  cor: '#993C1D', bg: '#FAECE7', border: '#993C1D33' },
          { label: 'Saldo',     valor: totais.saldo,     cor: totais.saldo >= 0 ? '#4840CC' : '#993C1D', bg: totais.saldo >= 0 ? '#EEF0FF' : '#FAECE7', border: totais.saldo >= 0 ? '#635BFF33' : '#993C1D33' },
          { label: 'Pendentes', valor: totais.pendentes, cor: '#854F0B', bg: '#FAEEDA', border: '#854F0B33' },
        ].map(card => (
          <div key={card.label} style={{
            background: card.bg, border: `1px solid ${card.border}`,
            borderRadius: '12px', padding: '1rem 1.25rem',
          }}>
            <div style={{ fontSize: '12px', fontWeight: '500', color: card.cor, marginBottom: '4px' }}>
              {card.label}
            </div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: card.cor, letterSpacing: '-0.5px' }}>
              {BRL(card.valor)}
            </div>
            <div style={{ fontSize: '11px', color: `${card.cor}99`, marginTop: '2px' }}>
              {filtrados.filter(l =>
                card.label === 'Receitas' ? l.tipo === 'receita' :
                card.label === 'Despesas' ? l.tipo === 'despesa' :
                card.label === 'Pendentes' ? l.status === 'pendente' :
                true
              ).length} lançamentos
            </div>
          </div>
        ))}
      </div>

      {/* ── Filtros ──────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {/* Busca */}
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', color: '#aaa' }}>🔍</span>
          <input
            type="text"
            placeholder="Buscar por descrição…"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            style={{
              width: '100%', padding: '9px 12px 9px 32px',
              border: '1px solid #d5d3cc', borderRadius: '8px',
              fontSize: '13px', background: '#fff', color: '#1a1a1a',
              outline: 'none', boxSizing: 'border-box',
            }}
            onFocus={e => (e.target.style.borderColor = '#635BFF')}
            onBlur={e => (e.target.style.borderColor = '#d5d3cc')}
          />
        </div>

        {/* Mês */}
        <select
          value={filtroMes}
          onChange={e => setFiltroMes(e.target.value)}
          style={{ padding: '9px 12px', border: '1px solid #d5d3cc', borderRadius: '8px', fontSize: '13px', background: '#fff', color: '#1a1a1a', outline: 'none', cursor: 'pointer' }}
        >
          <option value="todos">Todos os meses</option>
          {mesesDisponiveis.map(mes => {
            const [ano, m] = mes.split('-')
            const d = new Date(Number(ano), Number(m) - 1, 1)
            return (
              <option key={mes} value={mes}>
                {mesAnoLabel(d)}
              </option>
            )
          })}
        </select>

        {/* Tipo */}
        <select
          value={filtroTipo}
          onChange={e => setFiltroTipo(e.target.value as TipoLancamento | 'todos')}
          style={{ padding: '9px 12px', border: '1px solid #d5d3cc', borderRadius: '8px', fontSize: '13px', background: '#fff', color: '#1a1a1a', outline: 'none', cursor: 'pointer' }}
        >
          <option value="todos">Todos os tipos</option>
          {TODOS_TIPOS.map(t => (
            <option key={t} value={t}>{TIPO_CONFIG[t].label}</option>
          ))}
        </select>

        {/* Status */}
        <select
          value={filtroStatus}
          onChange={e => setFiltroStatus(e.target.value as StatusLancamento | 'todos')}
          style={{ padding: '9px 12px', border: '1px solid #d5d3cc', borderRadius: '8px', fontSize: '13px', background: '#fff', color: '#1a1a1a', outline: 'none', cursor: 'pointer' }}
        >
          <option value="todos">Todos os status</option>
          {TODOS_STATUS.map(s => (
            <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
          ))}
        </select>

        {/* Limpar filtros */}
        {(busca || filtroTipo !== 'todos' || filtroStatus !== 'todos' || filtroMes !== 'todos') && (
          <button
            onClick={() => { setBusca(''); setFiltroTipo('todos'); setFiltroStatus('todos'); setFiltroMes('todos') }}
            style={{ padding: '9px 14px', border: '1px solid #d5d3cc', borderRadius: '8px', fontSize: '12px', background: '#fff', color: '#666', cursor: 'pointer' }}
          >
            ✕ Limpar
          </button>
        )}
      </div>

      {/* ── Tabela ───────────────────────────────────────────────────────────── */}
      <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', overflow: 'hidden' }}>
        {filtrados.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#aaa', fontSize: '14px' }}>
            Nenhum lançamento encontrado com os filtros selecionados.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e3dc', background: '#fafaf8' }}>
                {['Tipo', 'Descrição', 'Cooperado', 'Competência', 'Vencimento', 'Valor', 'Status'].map(col => (
                  <th key={col} style={{
                    padding: '10px 16px', textAlign: col === 'Valor' ? 'right' : 'left',
                    fontSize: '11px', fontWeight: '600', color: '#888',
                    textTransform: 'uppercase', letterSpacing: '0.5px',
                  }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map((l, i) => {
                const tipo = TIPO_CONFIG[l.tipo]
                const st   = STATUS_CONFIG[l.status]
                const isHov = hovered === l.id
                const vencido =
                  l.status === 'pendente' &&
                  l.data_vencimento &&
                  new Date(l.data_vencimento + 'T00:00:00') < new Date()

                return (
                  <tr
                    key={l.id}
                    onClick={() => router.push(`/financeiro/${l.id}`)}
                    onMouseEnter={() => setHovered(l.id)}
                    onMouseLeave={() => setHovered(null)}
                    style={{
                      borderTop: i > 0 ? '1px solid #f0eeea' : 'none',
                      cursor: 'pointer',
                      background: isHov ? '#fafaf8' : 'transparent',
                    }}
                  >
                    {/* Tipo */}
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: '28px', height: '28px', borderRadius: '8px',
                        background: tipo.bg, color: tipo.cor,
                        fontSize: '14px', fontWeight: '700',
                      }}>
                        {tipo.icone}
                      </span>
                    </td>

                    {/* Descrição */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: '#1a1a1a' }}>
                        {l.descricao}
                      </div>
                      {l.numero_documento && (
                        <div style={{ fontSize: '11px', color: '#aaa', marginTop: '1px' }}>
                          Doc. {l.numero_documento}
                        </div>
                      )}
                    </td>

                    {/* Cooperado */}
                    <td style={{ padding: '12px 16px', fontSize: '12px', color: '#666', maxWidth: '160px' }}>
                      {l.cooperado_id ? nomeCooperado[l.cooperado_id] ?? '—' : '—'}
                    </td>

                    {/* Competência */}
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#555' }}>
                      {formatarData(l.data_competencia)}
                    </td>

                    {/* Vencimento */}
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: vencido ? '#993C1D' : '#555', fontWeight: vencido ? '600' : '400' }}>
                      {formatarData(l.data_vencimento)}
                      {vencido && <span style={{ fontSize: '10px', marginLeft: '4px' }}>⚠</span>}
                    </td>

                    {/* Valor */}
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '13px', fontWeight: '600', color: tipo.cor }}>
                      {tipo.sinal}{BRL(Number(l.valor))}
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

      {filtrados.length > 0 && (
        <p style={{ fontSize: '12px', color: '#aaa', marginTop: '8px', textAlign: 'right' }}>
          {filtrados.length} de {lancamentos.length} lançamento{lancamentos.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}
