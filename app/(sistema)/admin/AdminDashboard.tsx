'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Organizacao, PlanoOrganizacao, TipoOrganizacao } from '@/types/database'

const PLANO_CONFIG: Record<string, { label: string; cor: string; bg: string }> = {
  gratuito:    { label: 'Gratuito',    cor: '#555',    bg: '#f0eeea' },
  essencial:   { label: 'Essencial',   cor: '#444',    bg: '#f5f5f2' },
  cooperativa: { label: 'Cooperativa', cor: '#185FA5', bg: '#E6F1FB' },
  profissional:{ label: 'Profissional',cor: '#4840CC', bg: '#EEF0FF' },
  agro:        { label: 'Agro',        cor: '#4840CC', bg: '#EEF0FF' },
  impacto:     { label: 'Impacto',     cor: '#6366f1', bg: '#ede9fe' },
  enterprise:  { label: 'Enterprise',  cor: '#854F0B', bg: '#FAEEDA' },
}
const TIPO_LABEL: Record<TipoOrganizacao, string> = {
  cooperativa: 'Cooperativa',
  associacao: 'Associação',
  central: 'Central',
}

interface Props {
  organizacoes: Organizacao[]
  totalUsuarios: number
  totalCooperados: number
  cooperadosPorOrg: { organizacao_id: string }[]
}

function formatarData(data: string) {
  return new Date(data).toLocaleDateString('pt-BR')
}

export default function AdminDashboard({ organizacoes, totalUsuarios, totalCooperados, cooperadosPorOrg }: Props) {
  const router = useRouter()
  const [busca, setBusca] = useState('')
  const [hovered, setHovered] = useState<string | null>(null)

  const contagemPorOrg = useMemo(() => {
    const mapa: Record<string, number> = {}
    for (const c of cooperadosPorOrg) {
      mapa[c.organizacao_id] = (mapa[c.organizacao_id] ?? 0) + 1
    }
    return mapa
  }, [cooperadosPorOrg])

  const distribuicaoPlanos = useMemo(() => {
    const mapa: Record<string, number> = {}
    for (const org of organizacoes) {
      mapa[org.plano] = (mapa[org.plano] ?? 0) + 1
    }
    return mapa
  }, [organizacoes])

  const filtradas = useMemo(() => {
    const q = busca.toLowerCase().trim()
    if (!q) return organizacoes
    return organizacoes.filter(o =>
      o.nome.toLowerCase().includes(q) ||
      (o.cidade ?? '').toLowerCase().includes(q) ||
      (o.estado ?? '').toLowerCase().includes(q)
    )
  }, [organizacoes, busca])

  const totalAtivas = organizacoes.filter(o => o.ativo).length

  return (
    <div style={{ maxWidth: '1200px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <span style={{ fontSize: '20px' }}>⚙️</span>
            <h1 style={{ fontSize: '22px', fontWeight: '600', color: '#1a1a1a', margin: 0 }}>Painel Admin</h1>
          </div>
          <p style={{ fontSize: '14px', color: '#888', margin: 0 }}>
            Visão geral de todas as organizações no sistema
          </p>
        </div>
        <button
          onClick={() => router.push('/admin/organizacoes/nova')}
          style={{
            padding: '9px 18px', background: '#635BFF', color: '#fff',
            border: 'none', borderRadius: '8px', fontSize: '13px',
            fontWeight: '600', cursor: 'pointer', display: 'flex',
            alignItems: 'center', gap: '6px',
          }}
          onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = '#178a64')}
          onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = '#635BFF')}
        >
          <span>+</span> Nova organização
        </button>
      </div>

      {/* Cards de resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '1.5rem' }}>
        {[
          { label: 'Orgs ativas', valor: totalAtivas, cor: '#4840CC', bg: '#EEF0FF', border: '#635BFF33' },
          { label: 'Total usuários', valor: totalUsuarios, cor: '#185FA5', bg: '#E6F1FB', border: '#185FA533' },
          { label: 'Total filiados', valor: totalCooperados, cor: '#444', bg: '#f5f5f2', border: '#e5e3dc' },
          { label: 'Organizações', valor: organizacoes.length, cor: '#6366f1', bg: '#ede9fe', border: '#6366f133' },
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

      {/* Distribuição de planos */}
      <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '12px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.75rem' }}>
          Distribuição por plano
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {(Object.keys(PLANO_CONFIG) as PlanoOrganizacao[]).map(plano => {
            const qtd = distribuicaoPlanos[plano] ?? 0
            const cfg = PLANO_CONFIG[plano]
            return (
              <div key={plano} style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '5px 12px', background: cfg.bg, borderRadius: '20px',
                opacity: qtd === 0 ? 0.45 : 1,
              }}>
                <span style={{ fontSize: '12px', fontWeight: '600', color: cfg.cor }}>{cfg.label}</span>
                <span style={{
                  fontSize: '12px', fontWeight: '700', color: cfg.cor,
                  background: 'rgba(0,0,0,0.08)', borderRadius: '10px',
                  padding: '1px 6px',
                }}>
                  {qtd}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Busca */}
      <div style={{ position: 'relative', marginBottom: '1rem', maxWidth: '360px' }}>
        <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', color: '#aaa' }}>🔍</span>
        <input
          type="text"
          placeholder="Buscar organização…"
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

      {/* Tabela de organizações */}
      <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', overflow: 'hidden' }}>
        {filtradas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#aaa', fontSize: '14px' }}>
            {busca ? 'Nenhuma organização encontrada.' : 'Nenhuma organização cadastrada.'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e3dc', background: '#fafaf8' }}>
                {['Organização', 'Tipo', 'Cidade / UF', 'Plano', 'Filiados', 'Criado em', 'Status'].map(col => (
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
              {filtradas.map((org, i) => {
                const plano = PLANO_CONFIG[org.plano]
                const isHov = hovered === org.id
                return (
                  <tr
                    key={org.id}
                    onClick={() => router.push(`/admin/organizacoes/${org.id}`)}
                    onMouseEnter={() => setHovered(org.id)}
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
                          width: '32px', height: '32px', borderRadius: '8px',
                          background: '#EEF0FF', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', fontSize: '14px', flexShrink: 0,
                        }}><svg width="16" height="16" viewBox="0 0 32 32" fill="none"><rect x="3" y="3" width="7" height="26" rx="3" fill="#635BFF"/><rect x="22" y="3" width="7" height="26" rx="3" fill="#635BFF"/><path d="M10 3L22 29" stroke="#635BFF" strokeWidth="4.5" strokeLinecap="round"/></svg></div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '500', color: '#1a1a1a' }}>
                            {org.nome}
                          </div>
                          {org.nome_curto && (
                            <div style={{ fontSize: '11px', color: '#aaa' }}>{org.nome_curto}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#555' }}>
                      {TIPO_LABEL[org.tipo]}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#555' }}>
                      {org.cidade && org.estado ? `${org.cidade} / ${org.estado}` : org.cidade || org.estado || '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        display: 'inline-block', padding: '3px 10px',
                        borderRadius: '20px', fontSize: '11px', fontWeight: '600',
                        color: plano.cor, background: plano.bg,
                      }}>
                        {plano.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#555', textAlign: 'center' }}>
                      {contagemPorOrg[org.id] ?? 0}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#555' }}>
                      {formatarData(org.criado_em)}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        display: 'inline-block', padding: '3px 10px',
                        borderRadius: '20px', fontSize: '11px', fontWeight: '600',
                        color: org.ativo ? '#4840CC' : '#7f1d1d',
                        background: org.ativo ? '#EEF0FF' : '#fee2e2',
                      }}>
                        {org.ativo ? 'Ativa' : 'Inativa'}
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
          {filtradas.length} de {organizacoes.length} organizaç{organizacoes.length !== 1 ? 'ões' : 'ão'}
        </p>
      )}
    </div>
  )
}
