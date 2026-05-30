'use client'

import { useState } from 'react'
import type { Oportunidade, Usuario, RadarFonte, RadarResultado } from '@/types/database'
import type { OportunidadeLogComUsuario } from '@/lib/captacao/actions'
import { moverOportunidade, buscarOportunidade } from '@/lib/captacao/actions'
import OportunidadeModal from './OportunidadeModal'
import RadarPanel from './RadarPanel'

// ── Constantes ────────────────────────────────────────────────────────────────

const STATUSES_ATIVOS   = ['identificado', 'contatado', 'proposta', 'aguardando'] as const
const STATUSES_FINAIS   = ['aprovado', 'reprovado', 'arquivado']
const STATUSES_LINEARES = ['identificado', 'contatado', 'proposta', 'aguardando']

const FONTE_BADGE: Record<string, { label: string; cor: string; bg: string }> = {
  internacional: { label: 'Internacional', cor: '#185FA5', bg: '#E6F1FB' },
  nacional:      { label: 'Nacional',      cor: '#1D9E75', bg: '#E6F7F1' },
  manual:        { label: 'Manual',        cor: '#555',    bg: '#f5f5f2' },
}

const COLUNAS = [
  { id: 'identificado', label: 'Identificado', statuses: ['identificado'] },
  { id: 'contatado',    label: 'Contatado',    statuses: ['contatado'] },
  { id: 'proposta',     label: 'Proposta',     statuses: ['proposta'] },
  { id: 'aguardando',   label: 'Aguardando',   statuses: ['aguardando'] },
  { id: 'resultado',    label: 'Resultado',    statuses: ['aprovado', 'reprovado'] },
]

type Aba = 'abertas' | 'a_abrir' | 'vencidas' | 'radar'

type ModalState =
  | { open: false }
  | { open: true; mode: 'create' }
  | { open: true; mode: 'view' | 'edit'; oportunidade: Oportunidade; logs: OportunidadeLogComUsuario[]; carregando: boolean }

interface Props {
  oportunidades: Oportunidade[]
  responsaveis: Pick<Usuario, 'id' | 'nome_completo'>[]
  fontes?: RadarFonte[]
  resultados?: RadarResultado[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function urgenciaPrazo(prazo: string | null): 'normal' | 'alerta' | 'urgente' {
  if (!prazo) return 'normal'
  const dias = Math.ceil((new Date(prazo).getTime() - Date.now()) / 86_400_000)
  if (dias <= 0)  return 'urgente'
  if (dias <= 7)  return 'urgente'
  if (dias <= 15) return 'alerta'
  return 'normal'
}

function formatData(iso: string | null | undefined) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('pt-BR')
}

function formatValorCurto(v: number | null | undefined, moeda = 'BRL') {
  if (v == null) return null
  if (v >= 1_000_000) return `${moeda} ${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `${moeda} ${(v / 1_000).toFixed(0)}K`
  return v.toLocaleString('pt-BR', { style: 'currency', currency: moeda })
}

// ── Sub-componente: KanbanCard ────────────────────────────────────────────────

interface CardProps {
  op: Oportunidade
  onCardClick: (op: Oportunidade) => void
  onMover: (id: string, novoStatus: string) => void
}

function KanbanCard({ op, onCardClick, onMover }: CardProps) {
  const [pendente, setPendente] = useState(false)
  const idx = STATUSES_LINEARES.indexOf(op.status)
  const prevStatus = idx > 0 ? STATUSES_LINEARES[idx - 1] : null
  const nextStatus = idx >= 0 && idx < STATUSES_LINEARES.length - 1 ? STATUSES_LINEARES[idx + 1] : null
  const isAguardando = op.status === 'aguardando'
  const isResultado  = STATUSES_FINAIS.includes(op.status)
  const urgencia = urgenciaPrazo(op.prazo_submissao)
  const fonte = FONTE_BADGE[op.fonte] ?? FONTE_BADGE.manual

  async function mover(novoStatus: string) {
    setPendente(true)
    await onMover(op.id, novoStatus)
    setPendente(false)
  }

  return (
    <div
      onClick={() => onCardClick(op)}
      style={{
        background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px',
        padding: '12px', cursor: 'pointer', marginBottom: '8px',
        opacity: pendente ? 0.6 : 1,
        transition: 'box-shadow 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
        <span style={{ fontSize: '11px', fontWeight: '600', color: fonte.cor, background: fonte.bg, padding: '2px 7px', borderRadius: '10px' }}>
          {fonte.label}
        </span>
      </div>

      <div style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a1a', lineHeight: '1.3', marginBottom: '4px' }}>
        {op.titulo}
      </div>

      <div style={{ fontSize: '12px', color: '#888', marginBottom: '6px' }}>{op.financiador}</div>

      {formatValorCurto(op.valor_estimado, op.moeda) && (
        <div style={{ fontSize: '12px', fontWeight: '600', color: '#1D9E75', marginBottom: '4px' }}>
          {formatValorCurto(op.valor_estimado, op.moeda)}
        </div>
      )}

      {op.prazo_submissao && (
        <div style={{
          fontSize: '11px', fontWeight: '500', marginBottom: '8px',
          color: urgencia === 'urgente' ? '#dc2626' : urgencia === 'alerta' ? '#d97706' : '#888',
        }}>
          Prazo: {formatData(op.prazo_submissao)}
          {urgencia !== 'normal' && <span style={{ marginLeft: '4px' }}>{urgencia === 'urgente' ? '🔴' : '🟡'}</span>}
        </div>
      )}

      {/* Botões de mover */}
      <div
        onClick={e => e.stopPropagation()}
        style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}
      >
        {prevStatus && (
          <MoverBtn onClick={() => mover(prevStatus)} title={`← ${prevStatus}`}>←</MoverBtn>
        )}
        {!isAguardando && !isResultado && nextStatus && (
          <MoverBtn onClick={() => mover(nextStatus)} title={`→ ${nextStatus}`}>→</MoverBtn>
        )}
        {isAguardando && (
          <>
            <MoverBtn onClick={() => mover('aprovado')} cor="#1D9E75" title="Aprovar">✓</MoverBtn>
            <MoverBtn onClick={() => mover('reprovado')} cor="#dc2626" title="Reprovar">✗</MoverBtn>
          </>
        )}
        {isResultado && (
          <MoverBtn onClick={() => mover('aguardando')} title="Voltar para Aguardando">↺</MoverBtn>
        )}
      </div>
    </div>
  )
}

function MoverBtn({ onClick, title, cor, children }: { onClick: () => void; title?: string; cor?: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        padding: '2px 8px', fontSize: '12px', fontWeight: '600',
        background: '#f5f5f2', border: '1px solid #e5e3dc', borderRadius: '6px',
        cursor: 'pointer', color: cor || '#555',
      }}
      onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = '#eae8e2')}
      onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = '#f5f5f2')}
    >
      {children}
    </button>
  )
}

import React from 'react'

// ── Componente principal ──────────────────────────────────────────────────────

export default function KanbanBoard({ oportunidades, responsaveis, fontes = [], resultados = [] }: Props) {
  const [aba, setAba] = useState<Aba>('abertas')
  const [modal, setModal] = useState<ModalState>({ open: false })

  const hoje = new Date().toISOString().split('T')[0]

  const filtradas = oportunidades.filter(op => {
    if (aba === 'abertas')  return (STATUSES_ATIVOS as readonly string[]).includes(op.status)
    if (aba === 'a_abrir')  return op.status === 'identificado' && op.prazo_submissao != null && op.prazo_submissao > hoje
    if (aba === 'vencidas') return op.prazo_submissao != null && op.prazo_submissao < hoje && !STATUSES_FINAIS.includes(op.status)
    return true
  })

  async function handleCardClick(op: Oportunidade) {
    setModal({ open: true, mode: 'view', oportunidade: op, logs: [], carregando: true })
    const res = await buscarOportunidade(op.id)
    if (res.data) {
      setModal({ open: true, mode: 'view', oportunidade: res.data.oportunidade, logs: res.data.logs, carregando: false })
    } else {
      setModal(prev => prev.open && prev.mode === 'view' ? { ...prev, carregando: false } : prev)
    }
  }

  async function handleMover(id: string, novoStatus: string) {
    await moverOportunidade(id, novoStatus)
  }

  function handleEditar() {
    if (modal.open && modal.mode === 'view') {
      setModal({ ...modal, mode: 'edit' })
    }
  }

  const fecharModal = () => setModal({ open: false })

  const countAba = (a: Aba) => {
    if (a === 'abertas')  return oportunidades.filter(op => (STATUSES_ATIVOS as readonly string[]).includes(op.status)).length
    if (a === 'a_abrir')  return oportunidades.filter(op => op.status === 'identificado' && op.prazo_submissao != null && op.prazo_submissao > hoje).length
    if (a === 'vencidas') return oportunidades.filter(op => op.prazo_submissao != null && op.prazo_submissao < hoje && !STATUSES_FINAIS.includes(op.status)).length
    return 0
  }

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '600', color: '#1a1a1a', margin: 0 }}>Captação de Recursos</h1>
          <p style={{ fontSize: '13px', color: '#888', margin: '4px 0 0' }}>Gerencie oportunidades de financiamento</p>
        </div>
        <button
          onClick={() => setModal({ open: true, mode: 'create' })}
          style={{
            padding: '9px 18px', background: '#1D9E75', color: '#fff',
            border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
          }}
          onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = '#178a64')}
          onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = '#1D9E75')}
        >
          + Nova oportunidade
        </button>
      </div>

      {/* Abas */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '1.5rem', borderBottom: '1px solid #e5e3dc', paddingBottom: '0' }}>
        {([
          { id: 'abertas' as Aba,  label: 'Abertas agora' },
          { id: 'a_abrir' as Aba,  label: 'A abrir' },
          { id: 'vencidas' as Aba, label: 'Vencidas' },
          { id: 'radar' as Aba,    label: '🔍 Radar' },
        ] as const).map(({ id, label }) => {
          const ativo = aba === id
          const count = id !== 'radar' ? countAba(id as Exclude<Aba, 'radar'>) : 0
          return (
            <button
              key={id}
              onClick={() => setAba(id)}
              style={{
                padding: '8px 14px', fontSize: '13px', fontWeight: ativo ? '600' : '400',
                color: ativo ? '#1D9E75' : '#888',
                background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: ativo ? '2px solid #1D9E75' : '2px solid transparent',
                marginBottom: '-1px',
              }}
            >
              {label}
              {count > 0 && (
                <span style={{
                  marginLeft: '6px', fontSize: '10px', fontWeight: '600',
                  background: ativo ? '#E6F7F1' : '#f0eeea',
                  color: ativo ? '#1D9E75' : '#888',
                  padding: '1px 5px', borderRadius: '8px',
                }}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Aba Radar */}
      {aba === 'radar' && (
        <RadarPanel fontesIniciais={fontes} resultadosIniciais={resultados} />
      )}

      {/* Kanban */}
      {aba !== 'radar' && <div style={{ display: 'flex', gap: '14px', overflowX: 'auto', paddingBottom: '1rem', alignItems: 'flex-start', minHeight: 'calc(100vh - 240px)' }}>
        {COLUNAS.map(coluna => {
          const cards = filtradas.filter(op => coluna.statuses.includes(op.status))
          const aprovados  = cards.filter(op => op.status === 'aprovado')
          const reprovados = cards.filter(op => op.status === 'reprovado')
          const outros     = cards.filter(op => !['aprovado', 'reprovado'].includes(op.status))

          return (
            <div
              key={coluna.id}
              style={{
                minWidth: '220px', width: '220px', flexShrink: 0,
                background: '#f8f7f4', borderRadius: '12px', padding: '10px',
              }}
            >
              {/* Header coluna */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {coluna.label}
                </span>
                <span style={{ fontSize: '11px', fontWeight: '600', color: '#888', background: '#ebe9e3', borderRadius: '8px', padding: '1px 6px' }}>
                  {cards.length}
                </span>
              </div>

              {/* Cards */}
              {coluna.id === 'resultado' ? (
                <>
                  {/* Sub-seção Aprovado */}
                  <div style={{ background: '#dcfce7', borderRadius: '8px', padding: '8px', marginBottom: '8px', minHeight: '40px' }}>
                    <div style={{ fontSize: '10px', fontWeight: '700', color: '#166534', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>✓ Aprovado</div>
                    {aprovados.map(op => (
                      <KanbanCard key={op.id} op={op} onCardClick={handleCardClick} onMover={handleMover} />
                    ))}
                    {aprovados.length === 0 && <div style={{ fontSize: '11px', color: '#86efac', textAlign: 'center', padding: '4px 0' }}>—</div>}
                  </div>
                  {/* Sub-seção Reprovado */}
                  <div style={{ background: '#f0eeea', borderRadius: '8px', padding: '8px', minHeight: '40px' }}>
                    <div style={{ fontSize: '10px', fontWeight: '700', color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>✗ Reprovado</div>
                    {reprovados.map(op => (
                      <KanbanCard key={op.id} op={op} onCardClick={handleCardClick} onMover={handleMover} />
                    ))}
                    {reprovados.length === 0 && <div style={{ fontSize: '11px', color: '#aaa', textAlign: 'center', padding: '4px 0' }}>—</div>}
                  </div>
                </>
              ) : (
                <>
                  {outros.map(op => (
                    <KanbanCard key={op.id} op={op} onCardClick={handleCardClick} onMover={handleMover} />
                  ))}
                  {coluna.id === 'identificado' && (
                    <button
                      onClick={() => setModal({ open: true, mode: 'create' })}
                      style={{
                        width: '100%', padding: '8px', fontSize: '12px', color: '#aaa',
                        background: 'transparent', border: '1px dashed #d5d3cc', borderRadius: '10px',
                        cursor: 'pointer', marginTop: '4px',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#1D9E75'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#1D9E75' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#aaa'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#d5d3cc' }}
                    >
                      + Adicionar
                    </button>
                  )}
                  {outros.length === 0 && coluna.id !== 'identificado' && (
                    <div style={{ fontSize: '12px', color: '#ccc', textAlign: 'center', padding: '12px 0' }}>Vazio</div>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>}

      {/* Modal */}
      {modal.open && (
        <OportunidadeModal
          key={modal.mode === 'create' ? 'create' : `${(modal as { oportunidade?: Oportunidade }).oportunidade?.id}-${modal.mode}`}
          mode={modal.mode}
          oportunidade={modal.mode !== 'create' ? (modal as { oportunidade: Oportunidade }).oportunidade : undefined}
          logs={modal.mode !== 'create' ? (modal as { logs: OportunidadeLogComUsuario[] }).logs : []}
          carregando={modal.mode !== 'create' && (modal as { carregando?: boolean }).carregando}
          responsaveis={responsaveis}
          onClose={fecharModal}
          onSalvo={fecharModal}
          onEditar={handleEditar}
        />
      )}
    </div>
  )
}
