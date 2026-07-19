'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Lancamento, TipoLancamento, StatusLancamento } from '@/types/database'
import BotaoAjuda from '@/components/BotaoAjuda'
import { Btn } from '@/components/ui/Btn'
import Link from 'next/link'
import {
  PageLayout, KpiCard, ContentCard, Badge, EmptyState,
  Input, Select, COM_C,
} from '@/components/nexcoop/ui'

const TIPO_CONFIG: Record<TipoLancamento, { label: string; cor: string; bg: string; icone: string; sinal: string }> = {
  receita:       { label: 'Receita',       cor: '#4840CC', bg: '#EEF0FF', icone: '↑', sinal: '+' },
  despesa:       { label: 'Despesa',       cor: '#993C1D', bg: '#FAECE7', icone: '↓', sinal: '-' },
  transferencia: { label: 'Transferência', cor: '#185FA5', bg: '#E6F1FB', icone: '↔', sinal: '' },
}

const STATUS_CONFIG: Record<StatusLancamento, { label: string; cor: string; bg: string }> = {
  pendente:  { label: 'Pendente',  cor: '#854F0B', bg: '#FAEEDA' },
  pago:      { label: 'Pago',      cor: '#4840CC', bg: '#EEF0FF' },
  cancelado: { label: 'Cancelado', cor: '#374151', bg: '#f3f4f6' },
  agendado:  { label: 'Agendado',  cor: '#6366f1', bg: '#ede9fe' },
}

const TODOS_TIPOS: TipoLancamento[] = ['receita', 'despesa', 'transferencia']
const TODOS_STATUS: StatusLancamento[] = ['pendente', 'pago', 'cancelado', 'agendado']

const BRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function formatarData(d: string | null) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
}

function mesAnoLabel(d: Date) {
  return d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
}

interface Props {
  lancamentos: Lancamento[]
  nomeCooperado: Record<string, string>
  isParceiro?: boolean
  tipoInicial?: TipoLancamento
  statusInicial?: StatusLancamento
}

export default function FinanceiroLista({ lancamentos, nomeCooperado, isParceiro, tipoInicial, statusInicial }: Props) {
  const router = useRouter()
  const [busca, setBusca] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<TipoLancamento | 'todos'>(tipoInicial ?? 'todos')
  const [filtroStatus, setFiltroStatus] = useState<StatusLancamento | 'todos'>(statusInicial ?? 'todos')
  const [filtroMes, setFiltroMes] = useState<string>('todos')
  const [hovered, setHovered] = useState<string | null>(null)

  const mesesDisponiveis = useMemo(() => {
    const set = new Set<string>()
    for (const l of lancamentos) set.add(l.data_competencia.slice(0, 7))
    return Array.from(set).sort((a, b) => b.localeCompare(a))
  }, [lancamentos])

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

  const totais = useMemo(() => {
    let receitas = 0, despesas = 0, pendentes = 0
    for (const l of filtrados) {
      if (l.tipo === 'receita') receitas += Number(l.valor)
      if (l.tipo === 'despesa') despesas += Number(l.valor)
      if (l.status === 'pendente') pendentes += Number(l.valor)
    }
    return { receitas, despesas, saldo: receitas - despesas, pendentes }
  }, [filtrados])

  const temFiltro = busca || filtroTipo !== 'todos' || filtroStatus !== 'todos' || filtroMes !== 'todos'

  return (
    <PageLayout
      titulo="Financeiro"
      subtitulo={`${lancamentos.length} lançamento${lancamentos.length !== 1 ? 's' : ''} no total`}
      icone="ti-receipt-2"
      modulo={{ label: 'NexCoop', href: '/dashboard' }}
      semBreadcrumb
      acoes={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BotaoAjuda chave="manual_financeiro_url" />
          {!isParceiro && (
            <>
              <Link
                href="/financeiro/tesouraria"
                style={{
                  padding: '8px 14px', background: '#fff', color: COM_C.azul,
                  border: `1px solid ${COM_C.borda}`, borderRadius: 8, fontSize: 13,
                  fontWeight: 600, textDecoration: 'none', display: 'inline-flex',
                  alignItems: 'center', gap: 6,
                }}
              >
                <i className="ti ti-building-bank" style={{ fontSize: 15 }} />
                Tesouraria
              </Link>
              <Btn variante="roxo" icone="ti-plus" onClick={() => router.push('/financeiro/novo')}>
                Novo lançamento
              </Btn>
            </>
          )}
        </div>
      }
    >
      {isParceiro && (
        <div style={{
          background: COM_C.verdeLt, border: '1px solid #BBF7D0', borderRadius: 12,
          padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#15803D',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <i className="ti ti-eye" /> Você está visualizando o financeiro em modo leitura.
        </div>
      )}

      <div className="com-kpi-grid-4">
        <KpiCard label="Receitas" value={BRL(totais.receitas)} sub={`${filtrados.filter(l => l.tipo === 'receita').length} lançamentos`} icon="ti-arrow-down-left" cor={COM_C.roxo} corLt={COM_C.roxoLt} />
        <KpiCard label="Despesas" value={BRL(totais.despesas)} sub={`${filtrados.filter(l => l.tipo === 'despesa').length} lançamentos`} icon="ti-arrow-up-right" cor={COM_C.vermelho} corLt={COM_C.vermelhoLt} />
        <KpiCard label="Saldo" value={BRL(totais.saldo)} sub="receitas − despesas" icon="ti-scale" cor={totais.saldo >= 0 ? COM_C.verde : COM_C.vermelho} corLt={totais.saldo >= 0 ? COM_C.verdeLt : COM_C.vermelhoLt} />
        <KpiCard label="Pendentes" value={BRL(totais.pendentes)} sub={`${filtrados.filter(l => l.status === 'pendente').length} lançamentos`} icon="ti-clock" cor={COM_C.laranja} corLt={COM_C.laranjaLt} />
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <Input type="text" placeholder="Buscar por descrição…" value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <Select value={filtroMes} onChange={e => setFiltroMes(e.target.value)} style={{ width: 'auto', minWidth: 140 }}>
          <option value="todos">Todos os meses</option>
          {mesesDisponiveis.map(mes => {
            const [ano, m] = mes.split('-')
            const d = new Date(Number(ano), Number(m) - 1, 1)
            return <option key={mes} value={mes}>{mesAnoLabel(d)}</option>
          })}
        </Select>
        <Select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value as TipoLancamento | 'todos')} style={{ width: 'auto', minWidth: 130 }}>
          <option value="todos">Todos os tipos</option>
          {TODOS_TIPOS.map(t => <option key={t} value={t}>{TIPO_CONFIG[t].label}</option>)}
        </Select>
        <Select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value as StatusLancamento | 'todos')} style={{ width: 'auto', minWidth: 130 }}>
          <option value="todos">Todos os status</option>
          {TODOS_STATUS.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
        </Select>
        {temFiltro && (
          <Btn variante="cinza" tamanho="sm" onClick={() => { setBusca(''); setFiltroTipo('todos'); setFiltroStatus('todos'); setFiltroMes('todos') }}>
            Limpar
          </Btn>
        )}
      </div>

      {filtrados.length === 0 ? (
        <EmptyState emoji="💸" titulo="Nenhum lançamento encontrado" descricao="Ajuste os filtros ou cadastre um novo lançamento." />
      ) : (
        <ContentCard noPadding>
          <div style={{ overflowX: 'auto' }}>
            <table className="com-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
              <thead>
                <tr>
                  {['Tipo', 'Descrição', 'Cooperado', 'Competência', 'Vencimento', 'Valor', 'Status'].map((col, i) => (
                    <th key={col} style={{ textAlign: col === 'Valor' ? 'right' : 'left' }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.map((l) => {
                  const tipo = TIPO_CONFIG[l.tipo]
                  const st = STATUS_CONFIG[l.status]
                  const vencido = l.status === 'pendente' && l.data_vencimento && new Date(l.data_vencimento + 'T00:00:00') < new Date()
                  return (
                    <tr
                      key={l.id}
                      onClick={() => !isParceiro && router.push(`/financeiro/${l.id}`)}
                      onMouseEnter={() => !isParceiro && setHovered(l.id)}
                      onMouseLeave={() => setHovered(null)}
                      style={{ cursor: isParceiro ? 'default' : 'pointer', background: hovered === l.id ? '#FAFAF9' : undefined }}
                    >
                      <td>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: 28, height: 28, borderRadius: 8, background: tipo.bg, color: tipo.cor,
                          fontSize: 14, fontWeight: 700,
                        }}>{tipo.icone}</span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{l.descricao}</div>
                        {l.numero_documento && <div style={{ fontSize: 11, color: COM_C.txtSub }}>Doc. {l.numero_documento}</div>}
                      </td>
                      <td style={{ fontSize: 12, color: COM_C.txtSub, maxWidth: 160 }}>
                        {l.cooperado_id ? nomeCooperado[l.cooperado_id] ?? '—' : '—'}
                      </td>
                      <td style={{ color: COM_C.txtSub }}>{formatarData(l.data_competencia)}</td>
                      <td style={{ fontWeight: vencido ? 700 : 400, color: vencido ? COM_C.vermelho : COM_C.txtSub }}>
                        {formatarData(l.data_vencimento)}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: tipo.cor }}>
                        {tipo.sinal}{BRL(Number(l.valor))}
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