'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Mensalidade, StatusMensalidade } from '@/types/database'
import type { CooperadoResumo } from './page'

const STATUS_CONFIG: Record<StatusMensalidade, { label: string; cor: string; bg: string }> = {
  pendente: { label: 'Pendente', cor: '#854F0B', bg: '#FAEEDA' },
  pago:     { label: 'Pago',     cor: '#4840CC', bg: '#EEF0FF' },
  vencido:  { label: 'Vencido',  cor: '#993C1D', bg: '#FAECE7' },
}

const BRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function formatarMes(data: string) {
  return new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

function formatarMesCurto(data: string) {
  const d = new Date(data + 'T12:00:00')
  return d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
}

function formatarData(d: string | null) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
}

function formatarCPF(cpf: string | null) {
  if (!cpf) return null
  const s = cpf.replace(/\D/g, '')
  if (s.length !== 11) return cpf
  return `${s.slice(0,3)}.${s.slice(3,6)}.${s.slice(6,9)}-${s.slice(9)}`
}

function calcStatusEfetivo(m: Mensalidade): StatusMensalidade {
  if (m.status === 'pago') return 'pago'
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  if (new Date(m.data_vencimento + 'T00:00:00') < hoje) return 'vencido'
  return 'pendente'
}

interface Props {
  mensalidades: Mensalidade[]
  cooperadoMap: Record<string, CooperadoResumo>
}

export default function MensalidadesLista({ mensalidades, cooperadoMap }: Props) {
  const router = useRouter()

  const [busca, setBusca]               = useState('')
  const [filtroMes, setFiltroMes]       = useState<string>('todos')
  const [filtroStatus, setFiltroStatus] = useState<StatusMensalidade | 'todos'>('todos')
  const [hovered, setHovered]           = useState<string | null>(null)

  const mesesDisponiveis = useMemo(() => {
    const set = new Set<string>()
    for (const m of mensalidades) set.add(m.mes_referencia.slice(0, 7))
    return Array.from(set).sort((a, b) => b.localeCompare(a))
  }, [mensalidades])

  const comStatus = useMemo(() =>
    mensalidades.map(m => ({ ...m, _status: calcStatusEfetivo(m) })),
  [mensalidades])

  const filtrados = useMemo(() => {
    const q = busca.toLowerCase().trim()
    return comStatus.filter(m => {
      const coop = cooperadoMap[m.cooperado_id]
      if (q && !coop?.nome_completo.toLowerCase().includes(q)) return false
      if (filtroMes !== 'todos' && !m.mes_referencia.startsWith(filtroMes)) return false
      if (filtroStatus !== 'todos' && m._status !== filtroStatus) return false
      return true
    })
  }, [comStatus, cooperadoMap, busca, filtroMes, filtroStatus])

  const resumo = useMemo(() => {
    let pagas = 0, pendentes = 0, vencidas = 0, arrecadado = 0
    for (const m of comStatus) {
      if (m._status === 'pago')     { pagas++;     arrecadado += Number(m.valor) }
      if (m._status === 'pendente')   pendentes++
      if (m._status === 'vencido')    vencidas++
    }
    return { total: mensalidades.length, pagas, pendentes, vencidas, arrecadado }
  }, [comStatus, mensalidades.length])

  const temFiltro = busca || filtroMes !== 'todos' || filtroStatus !== 'todos'

  return (
    <>
      <style>{`
        .mens-header  { padding: 0 32px; min-height: 88px; display: flex; align-items: center; }
        .mens-content { padding: 28px 32px; }
        @media (max-width: 640px) {
          .mens-header  { padding: 0 16px 0 56px; min-height: 60px; }
          .mens-content { padding: 16px; }
          .mens-kpi-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>

      <header className="mens-header" style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: '#fff', borderBottom: '1px solid #E5E3DC',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, margin: '0 -2rem 0 -2rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: '#EEF0FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="ti ti-calendar-due" style={{ fontSize: 20, color: '#635BFF' }} />
          </div>
          <div>
            <h1 style={{ fontSize: 19, fontWeight: 800, color: '#1C1917', margin: 0, lineHeight: 1.2 }}>Mensalidades</h1>
            <div style={{ fontSize: 12, color: '#78716C', marginTop: 2 }}>
              Cobranças mensais
            </div>
          </div>
        </div>
        <button
          onClick={() => router.push('/mensalidades/gerar')}
          style={{ padding: '9px 18px', background: '#635BFF', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}
        >
          ⚡ Gerar mensalidades
        </button>
      </header>

      <div className="mens-content" style={{ background: '#F8F7F4', margin: '0 -2rem -2rem -2rem', minHeight: 'calc(100vh - 88px)' }}>
        <div style={{ maxWidth: '1100px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

          {/* Cards de resumo */}
          <div className="mens-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '1.5rem' }}>
            {[
              { label: 'Total',      valor: String(resumo.total),     sub: 'nos últimos 12 meses', cor: '#444',    bg: '#f5f5f2',  border: '#e5e3dc' },
              { label: 'Arrecadado', valor: BRL(resumo.arrecadado),   sub: `${resumo.pagas} cobranças pagas`,       cor: '#4840CC', bg: '#EEF0FF',  border: '#635BFF33' },
              { label: 'Pendentes',  valor: String(resumo.pendentes), sub: 'aguardando pagamento', cor: '#854F0B', bg: '#FAEEDA',  border: '#854F0B33' },
              { label: 'Vencidas',   valor: String(resumo.vencidas),  sub: 'prazo expirado',       cor: '#993C1D', bg: '#FAECE7',  border: '#993C1D33' },
            ].map(c => (
              <div key={c.label} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: '12px', padding: '1rem 1.25rem' }}>
                <div style={{ fontSize: '12px', fontWeight: '500', color: c.cor, marginBottom: '4px' }}>{c.label}</div>
                <div style={{ fontSize: c.label === 'Arrecadado' ? '18px' : '28px', fontWeight: '700', color: c.cor, letterSpacing: c.label === 'Arrecadado' ? '-0.5px' : undefined }}>
                  {c.valor}
                </div>
                <div style={{ fontSize: '11px', color: `${c.cor}99`, marginTop: '2px' }}>{c.sub}</div>
              </div>
            ))}
          </div>

          {/* Barra de busca e filtros */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
              <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', color: '#aaa' }}>🔍</span>
              <input
                type="text" value={busca} onChange={e => setBusca(e.target.value)}
                placeholder="Buscar membro..."
                style={{ width: '100%', padding: '9px 12px 9px 32px', border: '1px solid #d5d3cc', borderRadius: '8px', fontSize: '13px', background: '#fff', color: '#1a1a1a', outline: 'none', boxSizing: 'border-box' }}
                onFocus={e => (e.target.style.borderColor = '#635BFF')}
                onBlur={e => (e.target.style.borderColor = '#d5d3cc')}
              />
            </div>
            <select value={filtroMes} onChange={e => setFiltroMes(e.target.value)}
              style={{ padding: '9px 12px', border: '1px solid #d5d3cc', borderRadius: '8px', fontSize: '13px', background: '#fff', color: '#1a1a1a', outline: 'none', cursor: 'pointer' }}>
              <option value="todos">Todos os meses</option>
              {mesesDisponiveis.map(mes => (
                <option key={mes} value={mes}>{formatarMesCurto(mes + '-01')}</option>
              ))}
            </select>
            <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value as StatusMensalidade | 'todos')}
              style={{ padding: '9px 12px', border: '1px solid #d5d3cc', borderRadius: '8px', fontSize: '13px', background: '#fff', color: '#1a1a1a', outline: 'none', cursor: 'pointer' }}>
              <option value="todos">Todos os status</option>
              <option value="pendente">Pendente</option>
              <option value="pago">Pago</option>
              <option value="vencido">Vencido</option>
            </select>
            {temFiltro && (
              <button
                onClick={() => { setBusca(''); setFiltroMes('todos'); setFiltroStatus('todos') }}
                style={{ padding: '9px 14px', border: '1px solid #d5d3cc', borderRadius: '8px', fontSize: '12px', background: '#fff', color: '#666', cursor: 'pointer' }}>
                ✕ Limpar
              </button>
            )}
          </div>

          {/* Tabela */}
          <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', overflow: 'hidden' }}>
            {filtrados.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#aaa', fontSize: '14px' }}>
                {mensalidades.length === 0
                  ? 'Nenhuma mensalidade gerada ainda. Clique em "Gerar mensalidades" para começar.'
                  : 'Nenhuma cobrança encontrada com os filtros aplicados.'}
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e5e3dc', background: '#fafaf8' }}>
                      {['Filiado', 'Mês de referência', 'Vencimento', 'Valor', 'Status'].map(col => (
                        <th key={col} style={{ padding: '10px 16px', textAlign: col === 'Valor' ? 'right' : 'left', fontSize: '11px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtrados.map((m, i) => {
                      const coop    = cooperadoMap[m.cooperado_id]
                      const st      = STATUS_CONFIG[m._status]
                      const isHov   = hovered === m.id
                      const vencido = m._status === 'vencido'

                      return (
                        <tr key={m.id}
                          onClick={() => router.push(`/mensalidades/${m.id}`)}
                          onMouseEnter={() => setHovered(m.id)}
                          onMouseLeave={() => setHovered(null)}
                          style={{ borderTop: i > 0 ? '1px solid #f0eeea' : 'none', cursor: 'pointer', background: isHov ? '#fafaf8' : 'transparent', transition: 'background 0.1s' }}>

                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#EEEDFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '600', color: '#4840CC', flexShrink: 0 }}>
                                {coop?.nome_completo.charAt(0).toUpperCase() ?? '?'}
                              </div>
                              <div>
                                <div style={{ fontSize: '13px', fontWeight: '500', color: '#1a1a1a' }}>
                                  {coop?.nome_completo ?? 'Membro removido'}
                                </div>
                                {coop?.cpf && (
                                  <div style={{ fontSize: '11px', color: '#aaa', marginTop: '1px' }}>
                                    {formatarCPF(coop.cpf)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          <td style={{ padding: '12px 16px', fontSize: '13px', color: '#555', textTransform: 'capitalize' }}>
                            {formatarMes(m.mes_referencia)}
                          </td>

                          <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: vencido ? '600' : '400', color: vencido ? '#993C1D' : '#555' }}>
                            {formatarData(m.data_vencimento)}
                            {vencido && <span style={{ marginLeft: '4px', fontSize: '10px' }}>⚠</span>}
                          </td>

                          <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '13px', fontWeight: '600', color: m._status === 'pago' ? '#4840CC' : '#1a1a1a' }}>
                            {BRL(Number(m.valor))}
                          </td>

                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', color: st.cor, background: st.bg }}>
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
