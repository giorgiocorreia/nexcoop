'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Mensalidade, StatusMensalidade } from '@/types/database'
import type { CooperadoResumo } from './page'
import { termoMensalidade } from './termo'
import { Btn } from '@/components/ui/Btn'
import {
  PageLayout, KpiCard, ContentCard, Badge, EmptyState,
  Input, Select, COM_C,
} from '@/components/nexcoop/ui'

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
  return new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
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
  tipoOrg?: string | null
}

export default function MensalidadesLista({ mensalidades, cooperadoMap, tipoOrg }: Props) {
  const termo = termoMensalidade(tipoOrg)
  const router = useRouter()
  const [busca, setBusca] = useState('')
  const [filtroMes, setFiltroMes] = useState<string>('todos')
  const [filtroStatus, setFiltroStatus] = useState<StatusMensalidade | 'todos'>('todos')
  const [hovered, setHovered] = useState<string | null>(null)

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
      if (m._status === 'pago') { pagas++; arrecadado += Number(m.valor) }
      if (m._status === 'pendente') pendentes++
      if (m._status === 'vencido') vencidas++
    }
    return { total: mensalidades.length, pagas, pendentes, vencidas, arrecadado }
  }, [comStatus, mensalidades.length])

  const temFiltro = busca || filtroMes !== 'todos' || filtroStatus !== 'todos'

  return (
    <PageLayout
      titulo="Mensalidades"
      subtitulo={`Cobranças mensais dos ${termo.plural}`}
      icone="ti-calendar-due"
      modulo={{ label: 'NexCoop', href: '/dashboard' }}
      semBreadcrumb
      acoes={
        <Btn variante="roxo" icone="ti-bolt" onClick={() => router.push('/mensalidades/gerar')}>
          Gerar mensalidades
        </Btn>
      }
    >
      <div className="com-kpi-grid-4">
        <KpiCard label="Total" value={String(resumo.total)} sub="nos últimos 12 meses" icon="ti-list" cor={COM_C.txtSub} corLt="#F5F5F4" />
        <KpiCard label="Arrecadado" value={BRL(resumo.arrecadado)} sub={`${resumo.pagas} cobranças pagas`} icon="ti-cash" cor={COM_C.roxo} corLt={COM_C.roxoLt} />
        <KpiCard label="Pendentes" value={String(resumo.pendentes)} sub="aguardando pagamento" icon="ti-clock" cor={COM_C.laranja} corLt={COM_C.laranjaLt} />
        <KpiCard label="Vencidas" value={String(resumo.vencidas)} sub="prazo expirado" icon="ti-alert-circle" cor={COM_C.vermelho} corLt={COM_C.vermelhoLt} />
      </div>

      <div className="com-toolbar nxc-toolbar">
        <div style={{ flex: 1, minWidth: 200 }}>
          <Input type="text" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar membro..." />
        </div>
        <Select value={filtroMes} onChange={e => setFiltroMes(e.target.value)} style={{ width: 'auto', minWidth: 150 }}>
          <option value="todos">Todos os meses</option>
          {mesesDisponiveis.map(mes => (
            <option key={mes} value={mes}>{formatarMesCurto(mes + '-01')}</option>
          ))}
        </Select>
        <Select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value as StatusMensalidade | 'todos')} style={{ width: 'auto', minWidth: 140 }}>
          <option value="todos">Todos os status</option>
          <option value="pendente">Pendente</option>
          <option value="pago">Pago</option>
          <option value="vencido">Vencido</option>
        </Select>
        {temFiltro && (
          <Btn variante="cinza" tamanho="sm" onClick={() => { setBusca(''); setFiltroMes('todos'); setFiltroStatus('todos') }}>
            Limpar
          </Btn>
        )}
      </div>

      {filtrados.length === 0 ? (
        <EmptyState
          emoji="📅"
          titulo={mensalidades.length === 0 ? 'Nenhuma mensalidade gerada' : 'Nenhuma cobrança encontrada'}
          descricao={mensalidades.length === 0 ? 'Clique em "Gerar mensalidades" para começar.' : 'Ajuste os filtros aplicados.'}
          acao={mensalidades.length === 0 ? { label: 'Gerar mensalidades', onClick: () => router.push('/mensalidades/gerar') } : undefined}
        />
      ) : (
        <ContentCard noPadding>
          <div className="com-table-scroll" style={{ overflowX: 'auto' }}>
            <table className="com-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
              <thead>
                <tr>
                  {[termo.Singular, 'Mês de referência', 'Vencimento', 'Valor', 'Status'].map((col, i) => (
                    <th key={col} style={{ textAlign: i >= 3 ? 'right' : 'left' }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.map((m) => {
                  const coop = cooperadoMap[m.cooperado_id]
                  const st = STATUS_CONFIG[m._status]
                  const vencido = m._status === 'vencido'
                  return (
                    <tr
                      key={m.id}
                      onClick={() => router.push(`/mensalidades/${m.id}`)}
                      onMouseEnter={() => setHovered(m.id)}
                      onMouseLeave={() => setHovered(null)}
                      style={{ cursor: 'pointer', background: hovered === m.id ? '#FAFAF9' : undefined }}
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: '50%', background: COM_C.roxoLt,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 13, fontWeight: 700, color: COM_C.roxo, flexShrink: 0,
                          }}>
                            {coop?.nome_completo.charAt(0).toUpperCase() ?? '?'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600 }}>{coop?.nome_completo ?? 'Membro removido'}</div>
                            {coop?.cpf && <div style={{ fontSize: 11, color: COM_C.txtSub }}>{formatarCPF(coop.cpf)}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ color: COM_C.txtSub, textTransform: 'capitalize' }}>{formatarMes(m.mes_referencia)}</td>
                      <td style={{ fontWeight: vencido ? 700 : 400, color: vencido ? COM_C.vermelho : COM_C.txtSub }}>
                        {formatarData(m.data_vencimento)}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: m._status === 'pago' ? COM_C.roxo : COM_C.txt }}>
                        {BRL(Number(m.valor))}
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