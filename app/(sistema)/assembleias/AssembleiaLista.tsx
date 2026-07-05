'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Assembleia, TipoAssembleia, StatusAssembleia } from '@/types/database'
import BotaoAjuda from '@/components/BotaoAjuda'
import { Btn } from '@/components/ui/Btn'
import {
  PageLayout, KpiCard, ContentCard, Badge, EmptyState,
  Input, Select, COM_C,
} from '@/components/nexcoop/ui'

const TIPO_CONFIG: Record<TipoAssembleia, { sigla: string; label: string; cor: string; bg: string }> = {
  AGO:        { sigla: 'AGO', label: 'Assembleia Geral Ordinária',           cor: '#185FA5', bg: '#E6F1FB' },
  AGE:        { sigla: 'AGE', label: 'Assembleia Geral Extraordinária',      cor: '#6366f1', bg: '#ede9fe' },
  reuniao_CA: { sigla: 'CA',  label: 'Reunião do Conselho de Administração', cor: '#4840CC', bg: '#EEF0FF' },
  reuniao_CF: { sigla: 'CF',  label: 'Reunião do Conselho Fiscal',           cor: '#854F0B', bg: '#FAEEDA' },
}

const STATUS_CONFIG: Record<StatusAssembleia, { label: string; cor: string; bg: string }> = {
  agendada:  { label: 'Agendada',  cor: '#185FA5', bg: '#E6F1FB' },
  realizada: { label: 'Realizada', cor: '#4840CC', bg: '#EEF0FF' },
  cancelada: { label: 'Cancelada', cor: '#374151', bg: '#f3f4f6' },
}

const MODALIDADE_LABEL: Record<string, string> = {
  presencial: 'Presencial',
  remota: 'Remota',
  hibrida: 'Híbrida',
}

const TODOS_TIPOS: TipoAssembleia[] = ['AGO', 'AGE', 'reuniao_CA', 'reuniao_CF']
const TODOS_STATUS: StatusAssembleia[] = ['agendada', 'realizada', 'cancelada']

function formatarData(d: string | null) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
}

function diasAte(data: string) {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  const alvo = new Date(data + 'T00:00:00')
  return Math.round((alvo.getTime() - hoje.getTime()) / 86_400_000)
}

interface Props { assembleias: Assembleia[] }

export default function AssembleiaLista({ assembleias }: Props) {
  const router = useRouter()
  const [busca, setBusca] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<TipoAssembleia | 'todos'>('todos')
  const [filtroStatus, setFiltroStatus] = useState<StatusAssembleia | 'todos'>('todos')
  const [filtroAno, setFiltroAno] = useState<string>('todos')
  const [hovered, setHovered] = useState<string | null>(null)

  const anosDisponiveis = useMemo(() => {
    const set = new Set<string>()
    for (const a of assembleias) set.add(a.data_realizacao.slice(0, 4))
    return Array.from(set).sort((a, b) => b.localeCompare(a))
  }, [assembleias])

  const resumo = useMemo(() => ({
    total: assembleias.length,
    agendadas: assembleias.filter(a => a.status === 'agendada').length,
    realizadas: assembleias.filter(a => a.status === 'realizada').length,
    canceladas: assembleias.filter(a => a.status === 'cancelada').length,
  }), [assembleias])

  const filtradas = useMemo(() => {
    const q = busca.toLowerCase().trim()
    return assembleias.filter(a => {
      if (q && !a.titulo.toLowerCase().includes(q) && !TIPO_CONFIG[a.tipo].label.toLowerCase().includes(q)) return false
      if (filtroTipo !== 'todos' && a.tipo !== filtroTipo) return false
      if (filtroStatus !== 'todos' && a.status !== filtroStatus) return false
      if (filtroAno !== 'todos' && !a.data_realizacao.startsWith(filtroAno)) return false
      return true
    })
  }, [assembleias, busca, filtroTipo, filtroStatus, filtroAno])

  const temFiltro = busca || filtroTipo !== 'todos' || filtroStatus !== 'todos' || filtroAno !== 'todos'

  return (
    <PageLayout
      titulo="Assembleias"
      subtitulo={`${assembleias.length} registro${assembleias.length !== 1 ? 's' : ''} no total`}
      icone="ti-users-group"
      modulo={{ label: 'NexCoop', href: '/dashboard' }}
      semBreadcrumb
      acoes={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BotaoAjuda chave="manual_assembleia_url" />
          <Btn variante="roxo" icone="ti-plus" onClick={() => router.push('/assembleias/nova')}>
            Nova assembleia
          </Btn>
        </div>
      }
    >
      <div className="com-kpi-grid-4">
        <KpiCard label="Total" value={String(resumo.total)} icon="ti-list" cor={COM_C.txtSub} corLt="#F5F5F4" />
        <KpiCard label="Agendadas" value={String(resumo.agendadas)} icon="ti-calendar-event" cor={COM_C.azul} corLt={COM_C.azulLt} />
        <KpiCard label="Realizadas" value={String(resumo.realizadas)} icon="ti-check" cor={COM_C.roxo} corLt={COM_C.roxoLt} />
        <KpiCard label="Canceladas" value={String(resumo.canceladas)} icon="ti-x" cor={COM_C.txtSub} corLt="#F5F5F4" />
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <Input type="text" placeholder="Buscar por título ou tipo…" value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <Select value={filtroAno} onChange={e => setFiltroAno(e.target.value)} style={{ width: 'auto', minWidth: 120 }}>
          <option value="todos">Todos os anos</option>
          {anosDisponiveis.map(a => <option key={a} value={a}>{a}</option>)}
        </Select>
        <Select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value as TipoAssembleia | 'todos')} style={{ width: 'auto', minWidth: 130 }}>
          <option value="todos">Todos os tipos</option>
          {TODOS_TIPOS.map(t => <option key={t} value={t}>{TIPO_CONFIG[t].sigla}</option>)}
        </Select>
        <Select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value as StatusAssembleia | 'todos')} style={{ width: 'auto', minWidth: 130 }}>
          <option value="todos">Todos os status</option>
          {TODOS_STATUS.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
        </Select>
        {temFiltro && (
          <Btn variante="cinza" tamanho="sm" onClick={() => { setBusca(''); setFiltroTipo('todos'); setFiltroStatus('todos'); setFiltroAno('todos') }}>
            Limpar
          </Btn>
        )}
      </div>

      {filtradas.length === 0 ? (
        <EmptyState emoji="🏛️" titulo="Nenhuma assembleia encontrada" descricao="Ajuste os filtros ou crie uma nova assembleia." />
      ) : (
        <ContentCard noPadding>
          <div style={{ overflowX: 'auto' }}>
            <table className="com-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
              <thead>
                <tr>
                  {['Tipo', 'Título', 'Data', 'Modalidade', 'Quórum', 'Status'].map(col => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtradas.map((a) => {
                  const tipo = TIPO_CONFIG[a.tipo]
                  const st = STATUS_CONFIG[a.status]
                  const dias = diasAte(a.data_realizacao)
                  const proxima = a.status === 'agendada' && dias >= 0 && dias <= 7
                  const hoje = a.status === 'agendada' && dias === 0
                  return (
                    <tr
                      key={a.id}
                      onClick={() => router.push(`/assembleias/${a.id}`)}
                      onMouseEnter={() => setHovered(a.id)}
                      onMouseLeave={() => setHovered(null)}
                      style={{
                        cursor: 'pointer',
                        background: proxima && hovered !== a.id ? '#FFFBEB' : hovered === a.id ? '#FAFAF9' : undefined,
                      }}
                    >
                      <td><Badge label={tipo.sigla} bg={tipo.bg} cor={tipo.cor} /></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600 }}>{a.titulo}</span>
                          {hoje && <Badge label="HOJE" bg="#FEF3C7" cor="#92400e" />}
                          {proxima && !hoje && <Badge label={`em ${dias}d`} bg={COM_C.azulLt} cor={COM_C.azul} />}
                        </div>
                        {a.local && <div style={{ fontSize: 11, color: COM_C.txtSub, marginTop: 2 }}>{a.local}</div>}
                      </td>
                      <td style={{ color: COM_C.txtSub, whiteSpace: 'nowrap' }}>{formatarData(a.data_realizacao)}</td>
                      <td style={{ fontSize: 12, color: COM_C.txtSub }}>{MODALIDADE_LABEL[a.modalidade] ?? a.modalidade}</td>
                      <td>
                        {a.status === 'realizada' ? (
                          <span style={{ fontWeight: 700, color: a.quorum_atingido ? COM_C.roxo : COM_C.vermelho }}>
                            {a.total_presentes}{a.quorum_minimo ? ` / ${a.quorum_minimo}` : ''} {a.quorum_atingido ? '✓' : '✗'}
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, color: COM_C.txtSub }}>{a.quorum_minimo ? `Mín. ${a.quorum_minimo}` : '—'}</span>
                        )}
                      </td>
                      <td><Badge label={st.label} bg={st.bg} cor={st.cor} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </ContentCard>
      )}
    </PageLayout>
  )
}