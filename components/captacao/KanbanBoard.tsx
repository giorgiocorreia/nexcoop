'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Oportunidade, Usuario, RadarFonte, RadarResultado, StatusOportunidade } from '@/types/database'
import type { OportunidadeLogComUsuario } from '@/lib/captacao/actions'
import { buscarOportunidade, excluirOportunidade } from '@/lib/captacao/actions'
import OportunidadeModal from './OportunidadeModal'
import RadarPanel from './RadarPanel'

// ── Constantes ────────────────────────────────────────────────────────────────

const TEAL = '#1D9E75'

const STATUSES_ATIVOS = ['identificado', 'contatado', 'proposta', 'aguardando'] as const
const STATUSES_FINAIS = ['aprovado', 'reprovado', 'arquivado']

const STATUS_LABEL: Record<string, string> = {
  identificado: 'Identificado', contatado: 'Contatado', proposta: 'Proposta',
  aguardando: 'Aguardando', aprovado: 'Aprovado', reprovado: 'Reprovado', arquivado: 'Arquivado',
}

const STATUS_CORES: Record<string, { bg: string; cor: string }> = {
  identificado: { bg: '#f0eeea', cor: '#555' },
  contatado:    { bg: '#E6F7F1', cor: '#1D9E75' },
  proposta:     { bg: '#EEF0FF', cor: '#4840CC' },
  aguardando:   { bg: '#FEF3C7', cor: '#92400E' },
  aprovado:     { bg: '#DCFCE7', cor: '#166534' },
  reprovado:    { bg: '#FEE2E2', cor: '#991B1B' },
  arquivado:    { bg: '#f5f5f2', cor: '#888' },
}

const FONTE_BADGE: Record<string, { label: string; cor: string; bg: string }> = {
  internacional: { label: 'Internacional', cor: '#185FA5', bg: '#E6F1FB' },
  nacional:      { label: 'Nacional',      cor: '#1D9E75', bg: '#E6F7F1' },
  manual:        { label: 'Manual',        cor: '#555',    bg: '#f5f5f2' },
  agregador:     { label: 'Agregador',     cor: '#7C3AED', bg: '#EDE9FE' },
}

const COLUNAS = [
  { id: 'identificado', label: 'Identificado', statuses: ['identificado'] },
  { id: 'contatado',    label: 'Contatado',    statuses: ['contatado'] },
  { id: 'proposta',     label: 'Proposta',     statuses: ['proposta'] },
  { id: 'aguardando',   label: 'Aguardando',   statuses: ['aguardando'] },
  { id: 'resultado',    label: 'Resultado',    statuses: ['aprovado', 'reprovado'] },
]

type Aba = 'abertas' | 'a_abrir' | 'vencidas' | 'radar'
type Viz = 'lista' | 'kanban'

type ModalState =
  | { open: false }
  | { open: true; mode: 'create' }
  | { open: true; mode: 'view' | 'edit'; oportunidade: Oportunidade; logs: OportunidadeLogComUsuario[]; carregando: boolean }

interface Props {
  oportunidades: Oportunidade[]
  responsaveis: Pick<Usuario, 'id' | 'nome_completo'>[]
  fontes?: RadarFonte[]
  resultados?: RadarResultado[]
  usuarioAtual: Pick<Usuario, 'id' | 'nome_completo'>
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Retorna a data local (horário do navegador) no formato YYYY-MM-DD.
// Evita o bug clássico de usar toISOString() (sempre UTC) para comparar
// com datas de prazo, que no fuso de Brasília (UTC-3) adianta o "hoje"
// em até 3h todo final de dia.
function hojeLocal(): string {
  const d = new Date()
  const ano = d.getFullYear()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

function urgenciaPrazo(prazo: string | null): 'normal' | 'alerta' | 'urgente' {
  if (!prazo) return 'normal'
  // Mesmo truque de formatData: fixa meio-dia para não deslocar o dia
  // por causa de fuso horário na interpretação do Date.
  const dias = Math.ceil((new Date(prazo + 'T12:00:00').getTime() - Date.now()) / 86_400_000)
  if (dias <= 7)  return 'urgente'
  if (dias <= 15) return 'alerta'
  return 'normal'
}

function formatData(iso: string | null | undefined) {
  if (!iso) return null
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR')
}

function formatValor(v: number | null | undefined) {
  if (v == null) return null
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1).replace('.', ',')}M`
  if (v >= 1_000)     return `R$ ${(v / 1_000).toFixed(0)}K`
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

// ── Sub-componente: KanbanCard ────────────────────────────────────────────────

interface CardProps {
  op: Oportunidade
  onCardClick: (op: Oportunidade) => void
  onEdit: (op: Oportunidade) => void
  onDelete: (op: Oportunidade) => void
}

function KanbanCard({ op, onCardClick, onEdit, onDelete }: CardProps) {
  const urgencia = urgenciaPrazo(op.prazo_submissao)
  const fonte    = FONTE_BADGE[op.fonte] ?? FONTE_BADGE.manual

  return (
    <div
      onClick={() => onCardClick(op)}
      style={{
        background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px',
        padding: '12px', cursor: 'pointer', marginBottom: '8px',
        transition: 'box-shadow 0.15s', wordBreak: 'break-word',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}
    >
      <div style={{ marginBottom: '6px' }}>
        <span style={{ fontSize: '11px', fontWeight: '600', color: fonte.cor, background: fonte.bg, padding: '2px 7px', borderRadius: '10px' }}>
          {fonte.label}
        </span>
      </div>
      <div style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a1a', lineHeight: '1.3', marginBottom: '4px' }}>
        {op.titulo}
      </div>
      <div style={{ fontSize: '12px', color: '#888', marginBottom: '6px' }}>{op.financiador}</div>
      {formatValor(op.valor_estimado) && (
        <div style={{ fontSize: '12px', fontWeight: '600', color: TEAL, marginBottom: '4px' }}>
          {formatValor(op.valor_estimado)}
        </div>
      )}
      {op.prazo_submissao && (
        <div style={{
          fontSize: '11px', fontWeight: '500',
          color: urgencia === 'urgente' ? '#dc2626' : urgencia === 'alerta' ? '#d97706' : '#888',
          marginBottom: '8px',
        }}>
          Prazo: {formatData(op.prazo_submissao)}
          {urgencia !== 'normal' && <span style={{ marginLeft: '4px' }}>{urgencia === 'urgente' ? '🔴' : '🟡'}</span>}
        </div>
      )}
      <div
        style={{ display: 'flex', gap: '4px', marginTop: '4px' }}
        onClick={e => e.stopPropagation()}
      >
        <button onClick={() => onEdit(op)} style={btnEditar}>✏ Editar</button>
        <button onClick={() => onDelete(op)} style={btnExcluir}>✕ Excluir</button>
      </div>
    </div>
  )
}

// ── Sub-componente: Lista ─────────────────────────────────────────────────────

type SortCol = 'prazo' | 'valor' | 'status'

interface ListaProps {
  ops: Oportunidade[]
  onView: (op: Oportunidade) => void
  onEdit: (op: Oportunidade) => void
  onDelete: (op: Oportunidade) => void
}

function ListaView({ ops, onView, onEdit, onDelete }: ListaProps) {
  const [busca, setBusca]             = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroFonte, setFiltroFonte]   = useState('')
  const [sortCol, setSortCol]           = useState<SortCol>('prazo')
  const [sortDir, setSortDir]           = useState<'asc' | 'desc'>('asc')

  function toggleSort(col: SortCol) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  const sorter = (col: SortCol) => sortCol === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''

  const visibles = [...ops]
    .filter(op => {
      if (busca) {
        const q = busca.toLowerCase()
        if (!op.titulo.toLowerCase().includes(q) && !op.financiador.toLowerCase().includes(q)) return false
      }
      if (filtroStatus && op.status !== filtroStatus) return false
      if (filtroFonte  && op.fonte  !== filtroFonte)  return false
      return true
    })
    .sort((a, b) => {
      const d = sortDir === 'asc' ? 1 : -1
      if (sortCol === 'prazo') {
        const ap = a.prazo_submissao ?? 'zzz', bp = b.prazo_submissao ?? 'zzz'
        return ap < bp ? -d : ap > bp ? d : 0
      }
      if (sortCol === 'valor')  return ((a.valor_estimado ?? 0) - (b.valor_estimado ?? 0)) * d
      if (sortCol === 'status') return a.status.localeCompare(b.status, 'pt-BR') * d
      return 0
    })

  return (
    <div>
      {/* Busca + Filtros */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por título ou financiador..."
          style={{ ...inp, flex: 1, minWidth: '200px' }}
          onFocus={e => { e.target.style.borderColor = TEAL }}
          onBlur={e =>  { e.target.style.borderColor = '#d5d3cc' }}
        />
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} style={{ ...inp, width: '160px' }}>
          <option value="">Todos os status</option>
          {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select value={filtroFonte} onChange={e => setFiltroFonte(e.target.value)} style={{ ...inp, width: '160px' }}>
          <option value="">Todas as fontes</option>
          {Object.entries(FONTE_BADGE).map(([v, f]) => <option key={v} value={v}>{f.label}</option>)}
        </select>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#fafaf8', borderBottom: '1px solid #e5e3dc' }}>
              <Th onClick={() => toggleSort('status')} sortLabel={sorter('status')}>Status</Th>
              <Th>Título</Th>
              <Th>Fonte</Th>
              <Th>Financiador</Th>
              <Th onClick={() => toggleSort('valor')} sortLabel={sorter('valor')}>Valor</Th>
              <Th onClick={() => toggleSort('prazo')} sortLabel={sorter('prazo')}>Prazo</Th>
              <Th>Ações</Th>
            </tr>
          </thead>
          <tbody>
            {visibles.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '2.5rem', textAlign: 'center', fontSize: '13px', color: '#aaa' }}>
                  Nenhuma oportunidade encontrada.
                </td>
              </tr>
            ) : visibles.map((op, i) => {
              const urgencia = urgenciaPrazo(op.prazo_submissao)
              const fonte    = FONTE_BADGE[op.fonte] ?? FONTE_BADGE.manual
              const sc       = STATUS_CORES[op.status] ?? { bg: '#f5f5f2', cor: '#888' }
              return (
                <tr
                  key={op.id}
                  style={{ borderBottom: i < visibles.length - 1 ? '1px solid #f0eeea' : 'none' }}
                >
                  <td style={td}>
                    <span style={{ fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '10px', background: sc.bg, color: sc.cor, whiteSpace: 'nowrap' }}>
                      {STATUS_LABEL[op.status] ?? op.status}
                    </span>
                  </td>
                  <td
                    style={{ ...td, cursor: 'pointer', maxWidth: '280px' }}
                    onClick={() => onView(op)}
                  >
                    <span
                      style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a1a' }}
                      onMouseEnter={e => { e.currentTarget.style.color = TEAL; e.currentTarget.style.textDecoration = 'underline' }}
                      onMouseLeave={e => { e.currentTarget.style.color = '#1a1a1a'; e.currentTarget.style.textDecoration = 'none' }}
                    >
                      {op.titulo}
                    </span>
                  </td>
                  <td style={td}>
                    <span style={{ fontSize: '11px', fontWeight: '600', color: fonte.cor, background: fonte.bg, padding: '2px 7px', borderRadius: '10px', whiteSpace: 'nowrap' }}>
                      {fonte.label}
                    </span>
                  </td>
                  <td style={{ ...td, maxWidth: '180px', color: '#555', fontSize: '12px' }}>
                    {op.financiador}
                  </td>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: TEAL }}>
                      {formatValor(op.valor_estimado) ?? '—'}
                    </span>
                  </td>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>
                    <span style={{
                      fontSize: '12px',
                      fontWeight: urgencia !== 'normal' ? '600' : '400',
                      color: urgencia === 'urgente' ? '#dc2626' : urgencia === 'alerta' ? '#d97706' : '#555',
                    }}>
                      {formatData(op.prazo_submissao) ?? '—'}
                      {urgencia === 'urgente' && ' 🔴'}
                      {urgencia === 'alerta'  && ' 🟡'}
                    </span>
                  </td>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>
                    <button onClick={() => onEdit(op)} style={btnEditar}>✏ Editar</button>
                    <button onClick={() => onDelete(op)} style={{ ...btnExcluir, marginLeft: '4px' }}>✕ Excluir</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function KanbanBoard({ oportunidades, responsaveis, fontes = [], resultados = [], usuarioAtual }: Props) {
  const router = useRouter()
  const [aba, setAba]       = useState<Aba>('abertas')
  const [viz, setViz]       = useState<Viz>('lista')
  const [modal, setModal]   = useState<ModalState>({ open: false })
  const [ops, setOps]       = useState<Oportunidade[]>(oportunidades)
  const [erroGlobal, setErroGlobal] = useState('')

  useEffect(() => { setOps(oportunidades) }, [oportunidades])

  useEffect(() => {
    const saved = localStorage.getItem('captacao_viz') as Viz | null
    if (saved === 'kanban' || saved === 'lista') setViz(saved)
  }, [])

  function setVizSalvo(v: Viz) {
    setViz(v)
    localStorage.setItem('captacao_viz', v)
  }

  const hoje = hojeLocal()

  const filtradas = ops.filter(op => {
    if (aba === 'abertas')  return (STATUSES_ATIVOS as readonly string[]).includes(op.status)
    if (aba === 'a_abrir')  return op.status === 'identificado' && op.prazo_submissao != null && op.prazo_submissao > hoje
    if (aba === 'vencidas') return op.prazo_submissao != null && op.prazo_submissao < hoje && !STATUSES_FINAIS.includes(op.status)
    return true
  })

  async function handleCardClick(op: Oportunidade) {
    setErroGlobal('')
    setModal({ open: true, mode: 'view', oportunidade: op, logs: [], carregando: true })
    const res = await buscarOportunidade(op.id)
    if (res.data) {
      setModal({ open: true, mode: 'view', oportunidade: res.data.oportunidade, logs: res.data.logs, carregando: false })
    } else {
      // Falha ao buscar detalhes atualizados: fecha o modal em vez de mostrar
      // dados possivelmente desatualizados sem avisar o usuário.
      setModal({ open: false })
      setErroGlobal(res.error ?? 'Não foi possível carregar os detalhes da oportunidade. Tente novamente.')
    }
  }

  function handleCardEdit(op: Oportunidade) {
    setModal({ open: true, mode: 'edit', oportunidade: op, logs: [], carregando: false })
  }

  async function handleDelete(op: Oportunidade) {
    if (!window.confirm(`Excluir a oportunidade "${op.titulo}"?`)) return
    setErroGlobal('')
    const res = await excluirOportunidade(op.id)
    if (res.error) {
      setErroGlobal(res.error)
      return
    }
    setOps(prev => prev.filter(o => o.id !== op.id))
  }

  function handleEditar() {
    if (modal.open && modal.mode === 'view') {
      setModal({ ...modal, mode: 'edit' })
    }
  }

  // Chamado pelo modal quando registrar contato/proposta avança o status
  // automaticamente — atualiza a lista sem precisar fechar o modal.
  function handleStatusAtualizado(oportunidadeId: string, novoStatus: StatusOportunidade) {
    setOps(prev => prev.map(o => o.id === oportunidadeId ? { ...o, status: novoStatus } : o))
  }

  function handleSalvo() {
    setModal({ open: false })
    router.refresh()
  }

  const fecharModal = () => setModal({ open: false })

  const countAba = (a: Aba) => {
    if (a === 'abertas')  return ops.filter(op => (STATUSES_ATIVOS as readonly string[]).includes(op.status)).length
    if (a === 'a_abrir')  return ops.filter(op => op.status === 'identificado' && op.prazo_submissao != null && op.prazo_submissao > hoje).length
    if (a === 'vencidas') return ops.filter(op => op.prazo_submissao != null && op.prazo_submissao < hoje && !STATUSES_FINAIS.includes(op.status)).length
    return 0
  }

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '600', color: '#1a1a1a', margin: 0 }}>Captação de Recursos</h1>
          <p style={{ fontSize: '13px', color: '#888', margin: '4px 0 0' }}>Gerencie oportunidades de financiamento</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
          {/* Toggle Lista / Kanban */}
          {aba !== 'radar' && (
            <div style={{ display: 'flex', border: '1px solid #e5e3dc', borderRadius: '8px', overflow: 'hidden' }}>
              <button
                onClick={() => setVizSalvo('lista')}
                style={{
                  padding: '7px 14px', fontSize: '12px', fontWeight: viz === 'lista' ? '600' : '400',
                  background: viz === 'lista' ? '#f0fdf9' : '#fff',
                  color: viz === 'lista' ? TEAL : '#666',
                  border: 'none', cursor: 'pointer',
                  borderRight: '1px solid #e5e3dc',
                }}
              >
                ☰ Lista
              </button>
              <button
                onClick={() => setVizSalvo('kanban')}
                style={{
                  padding: '7px 14px', fontSize: '12px', fontWeight: viz === 'kanban' ? '600' : '400',
                  background: viz === 'kanban' ? '#f0fdf9' : '#fff',
                  color: viz === 'kanban' ? TEAL : '#666',
                  border: 'none', cursor: 'pointer',
                }}
              >
                ⊞ Kanban
              </button>
            </div>
          )}
          <button
            onClick={() => setModal({ open: true, mode: 'create' })}
            style={{
              padding: '9px 18px', background: TEAL, color: '#fff',
              border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#178a64' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = TEAL }}
          >
            + Nova oportunidade
          </button>
        </div>
      </div>

      {/* Erro global (delete / carregamento de detalhes) */}
      {erroGlobal && (
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: '#fee2e2', color: '#991b1b', fontSize: '13px', fontWeight: '500',
          padding: '10px 14px', borderRadius: '8px', marginBottom: '1rem',
        }}>
          <span>{erroGlobal}</span>
          <button
            onClick={() => setErroGlobal('')}
            style={{ background: 'none', border: 'none', color: '#991b1b', cursor: 'pointer', fontSize: '16px', lineHeight: 1, padding: '0 4px' }}
          >
            ×
          </button>
        </div>
      )}

      {/* Abas */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '1.5rem', borderBottom: '1px solid #e5e3dc' }}>
        {([
          { id: 'abertas' as Aba,  label: 'Abertas agora' },
          { id: 'a_abrir' as Aba,  label: 'A abrir' },
          { id: 'vencidas' as Aba, label: 'Vencidas' },
          { id: 'radar' as Aba,    label: '🔍 Radar' },
        ] as const).map(({ id, label }) => {
          const ativo = aba === id
          const count = id !== 'radar' ? countAba(id) : 0
          return (
            <button
              key={id}
              onClick={() => setAba(id)}
              style={{
                padding: '8px 14px', fontSize: '13px', fontWeight: ativo ? '600' : '400',
                color: ativo ? TEAL : '#888',
                background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: ativo ? `2px solid ${TEAL}` : '2px solid transparent',
                marginBottom: '-1px',
              }}
            >
              {label}
              {count > 0 && (
                <span style={{
                  marginLeft: '6px', fontSize: '10px', fontWeight: '600',
                  background: ativo ? '#E6F7F1' : '#f0eeea',
                  color: ativo ? TEAL : '#888',
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

      {/* Lista */}
      {aba !== 'radar' && viz === 'lista' && (
        <ListaView
          ops={filtradas}
          onView={handleCardClick}
          onEdit={handleCardEdit}
          onDelete={handleDelete}
        />
      )}

      {/* Kanban */}
      {aba !== 'radar' && viz === 'kanban' && (
        <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '1rem', alignItems: 'flex-start' }}>
          {COLUNAS.map(coluna => {
            const cards     = filtradas.filter(op => coluna.statuses.includes(op.status))
            const aprovados  = cards.filter(op => op.status === 'aprovado')
            const reprovados = cards.filter(op => op.status === 'reprovado')
            const outros     = cards.filter(op => !['aprovado', 'reprovado'].includes(op.status))

            return (
              <div
                key={coluna.id}
                style={{
                  width: '260px', minWidth: '260px', flexShrink: 0,
                  background: '#f8f7f4', borderRadius: '12px', padding: '10px',
                  height: 'calc(100vh - 280px)', overflowY: 'auto',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {coluna.label}
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: '600', color: '#888', background: '#ebe9e3', borderRadius: '8px', padding: '1px 6px' }}>
                    {cards.length}
                  </span>
                </div>

                {coluna.id === 'resultado' ? (
                  <>
                    <div style={{ background: '#dcfce7', borderRadius: '8px', padding: '8px', marginBottom: '8px', minHeight: '40px' }}>
                      <div style={{ fontSize: '10px', fontWeight: '700', color: '#166534', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>✓ Aprovado</div>
                      {aprovados.map(op => <KanbanCard key={op.id} op={op} onCardClick={handleCardClick} onEdit={handleCardEdit} onDelete={handleDelete} />)}
                      {aprovados.length === 0 && <div style={{ fontSize: '11px', color: '#86efac', textAlign: 'center', padding: '4px 0' }}>—</div>}
                    </div>
                    <div style={{ background: '#f0eeea', borderRadius: '8px', padding: '8px', minHeight: '40px' }}>
                      <div style={{ fontSize: '10px', fontWeight: '700', color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>✗ Reprovado</div>
                      {reprovados.map(op => <KanbanCard key={op.id} op={op} onCardClick={handleCardClick} onEdit={handleCardEdit} onDelete={handleDelete} />)}
                      {reprovados.length === 0 && <div style={{ fontSize: '11px', color: '#aaa', textAlign: 'center', padding: '4px 0' }}>—</div>}
                    </div>
                  </>
                ) : (
                  <>
                    {outros.map(op => <KanbanCard key={op.id} op={op} onCardClick={handleCardClick} onEdit={handleCardEdit} onDelete={handleDelete} />)}
                    {coluna.id === 'identificado' && (
                      <button
                        onClick={() => setModal({ open: true, mode: 'create' })}
                        style={{
                          width: '100%', padding: '8px', fontSize: '12px', color: '#aaa',
                          background: 'transparent', border: '1px dashed #d5d3cc', borderRadius: '10px',
                          cursor: 'pointer', marginTop: '4px',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = TEAL; (e.currentTarget as HTMLButtonElement).style.borderColor = TEAL }}
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
        </div>
      )}

      {/* Modal */}
      {modal.open && (
        <OportunidadeModal
          key={modal.mode === 'create' ? 'create' : `${(modal as { oportunidade?: Oportunidade }).oportunidade?.id}-${modal.mode}`}
          mode={modal.mode}
          oportunidade={modal.mode !== 'create' ? (modal as { oportunidade: Oportunidade }).oportunidade : undefined}
          logs={modal.mode !== 'create' ? (modal as { logs: OportunidadeLogComUsuario[] }).logs : []}
          carregando={modal.mode !== 'create' && (modal as { carregando?: boolean }).carregando}
          responsaveis={responsaveis}
          usuarioAtual={usuarioAtual}
          onClose={fecharModal}
          onSalvo={handleSalvo}
          onEditar={handleEditar}
          onStatusAtualizado={handleStatusAtualizado}
        />
      )}
    </div>
  )
}

// ── Helpers de tabela ─────────────────────────────────────────────────────────

function Th({ children, onClick, sortLabel }: { children: React.ReactNode; onClick?: () => void; sortLabel?: string }) {
  return (
    <th
      onClick={onClick}
      style={{
        padding: '10px 12px', fontSize: '11px', fontWeight: '600', color: '#555',
        textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.4px',
        cursor: onClick ? 'pointer' : 'default', whiteSpace: 'nowrap',
        userSelect: 'none',
      }}
    >
      {children}{sortLabel}
    </th>
  )
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const inp: React.CSSProperties = {
  padding: '8px 12px', fontSize: '13px', border: '1px solid #d5d3cc',
  borderRadius: '8px', background: '#fff', color: '#1a1a1a',
  outline: 'none', boxSizing: 'border-box',
}

const td: React.CSSProperties = {
  padding: '10px 12px', fontSize: '13px', color: '#333', verticalAlign: 'middle',
}

const btnEditar: React.CSSProperties = {
  padding: '4px 10px', fontSize: '11px', fontWeight: '500',
  background: '#EEF0FF', color: '#4840CC', border: 'none', borderRadius: '6px', cursor: 'pointer',
}

const btnExcluir: React.CSSProperties = {
  padding: '4px 10px', fontSize: '11px', fontWeight: '500',
  background: '#FEE2E2', color: '#991B1B', border: 'none', borderRadius: '6px', cursor: 'pointer',
}
