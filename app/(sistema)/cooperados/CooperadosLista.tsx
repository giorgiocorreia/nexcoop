'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Cooperado, StatusCooperado } from '@/types/database'
import BotaoAjuda from '@/components/BotaoAjuda'
import { Btn } from '@/components/ui/Btn'
import {
  PageLayout, KpiCard, ContentCard, Badge, EmptyState,
  Input, Select, COM_C,
} from '@/components/nexcoop/ui'

const STATUS_CONFIG: Record<StatusCooperado, { label: string; cor: string; bg: string }> = {
  proposta:     { label: 'Proposta',      cor: '#6366f1', bg: '#ede9fe' },
  probatorio:   { label: 'Probatório',    cor: '#185FA5', bg: '#E6F1FB' },
  ativo:        { label: 'Ativo',         cor: '#4840CC', bg: '#EEF0FF' },
  inadimplente: { label: 'Inadimplente',  cor: '#854F0B', bg: '#FAEEDA' },
  suspenso:     { label: 'Suspenso',      cor: '#993C1D', bg: '#FAECE7' },
  demitido:     { label: 'Demitido',      cor: '#7f1d1d', bg: '#fee2e2' },
  excluido:     { label: 'Excluído',      cor: '#374151', bg: '#f3f4f6' },
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

function getNomenclatura(tipoOrg: string) {
  if (tipoOrg === 'cooperativa') {
    return { singular: 'Cooperado', plural: 'Cooperados', novo: 'Novo cooperado', busca: 'Buscar por nome, CPF ou e-mail…' }
  }
  return { singular: 'Filiado', plural: 'Filiados', novo: 'Novo filiado', busca: 'Buscar por nome, CPF ou e-mail…' }
}

interface Props {
  cooperados: Cooperado[]
  tipoOrg: string
  statusInicial?: StatusCooperado
}

export default function CooperadosLista({ cooperados, tipoOrg, statusInicial }: Props) {
  const n = getNomenclatura(tipoOrg)
  const router = useRouter()
  const [lista] = useState(cooperados)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<StatusCooperado | 'todos'>(statusInicial ?? 'todos')
  const [hovered, setHovered] = useState<string | null>(null)

  const resumo = useMemo(() => ({
    total: lista.length,
    ativos: lista.filter(c => c.status === 'ativo').length,
    probatorios: lista.filter(c => c.status === 'probatorio').length,
    inadimplentes: lista.filter(c => c.status === 'inadimplente').length,
  }), [lista])

  const filtrados = useMemo(() => {
    const q = busca.toLowerCase().trim()
    const qDigitos = q.replace(/\D/g, '')
    const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    return lista.filter(c => {
      const passaBusca =
        !q ||
        normalize(c.nome_completo).includes(normalize(q)) ||
        (qDigitos.length > 0 && (c.cpf ?? '').replace(/\D/g, '').includes(qDigitos)) ||
        (c.email ?? '').toLowerCase().includes(q)
      const passaStatus = filtroStatus === 'todos' || c.status === filtroStatus
      return passaBusca && passaStatus
    })
  }, [lista, busca, filtroStatus])

  const temFiltro = busca || filtroStatus !== 'todos'

  return (
    <PageLayout
      titulo={n.plural}
      subtitulo={`${lista.length} ${n.plural.toLowerCase()} cadastrados`}
      icone="ti-users"
      modulo={{ label: 'NexCoop', href: '/dashboard' }}
      semBreadcrumb
      acoes={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BotaoAjuda chave="manual_cooperados_url" />
          <Btn variante="roxo" icone="ti-plus" onClick={() => router.push('/cooperados/novo')}>
            {n.novo}
          </Btn>
        </div>
      }
    >
      <div className="com-kpi-grid-4">
        <KpiCard label={`Total de ${n.plural}`} value={String(resumo.total)} icon="ti-users" cor={COM_C.txtSub} corLt="#F5F5F4" />
        <KpiCard label="Ativos" value={String(resumo.ativos)} icon="ti-user-check" cor={COM_C.roxo} corLt={COM_C.roxoLt} />
        <KpiCard label="Probatórios" value={String(resumo.probatorios)} icon="ti-user-search" cor={COM_C.azul} corLt={COM_C.azulLt} />
        <KpiCard label="Inadimplentes" value={String(resumo.inadimplentes)} icon="ti-user-exclamation" cor={COM_C.laranja} corLt={COM_C.laranjaLt} />
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <Input
            type="text"
            placeholder={n.busca}
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
        </div>
        <Select
          value={filtroStatus}
          onChange={e => setFiltroStatus(e.target.value as StatusCooperado | 'todos')}
          style={{ width: 'auto', minWidth: 160 }}
        >
          <option value="todos">Todos os status</option>
          {TODOS_STATUS.map(s => (
            <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
          ))}
        </Select>
        {temFiltro && (
          <Btn variante="cinza" tamanho="sm" onClick={() => { setBusca(''); setFiltroStatus('todos') }}>
            Limpar
          </Btn>
        )}
      </div>

      {filtrados.length === 0 ? (
        <EmptyState
          emoji="👥"
          titulo={temFiltro ? `Nenhum ${n.singular.toLowerCase()} encontrado` : `Nenhum ${n.singular.toLowerCase()} cadastrado`}
          descricao={temFiltro ? 'Tente outros filtros de busca.' : undefined}
          acao={!temFiltro ? { label: n.novo, onClick: () => router.push('/cooperados/novo') } : undefined}
        />
      ) : (
        <ContentCard noPadding>
          <div style={{ overflowX: 'auto' }}>
            <table className="com-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
              <thead>
                <tr>
                  {['Nome', 'CPF', 'E-mail', 'Cidade / UF', 'Admissão', 'Status'].map(col => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.map((c) => {
                  const st = STATUS_CONFIG[c.status]
                  const isHov = hovered === c.id
                  return (
                    <tr
                      key={c.id}
                      onClick={() => router.push(`/cooperados/${c.id}`)}
                      onMouseEnter={() => setHovered(c.id)}
                      onMouseLeave={() => setHovered(null)}
                      style={{ cursor: 'pointer', background: isHov ? '#FAFAF9' : undefined }}
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: '50%', background: COM_C.roxoLt,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 13, fontWeight: 700, color: COM_C.roxo, flexShrink: 0,
                          }}>
                            {c.nome_completo.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600 }}>{c.nome_completo}</div>
                            {c.numero_matricula && (
                              <div style={{ fontSize: 11, color: COM_C.txtSub }}>Matríc. {c.numero_matricula}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ color: COM_C.txtSub }}>{formatarCPF(c.cpf)}</td>
                      <td style={{ color: COM_C.txtSub }}>{c.email || '—'}</td>
                      <td style={{ color: COM_C.txtSub }}>
                        {c.cidade && c.estado ? `${c.cidade} / ${c.estado}` : c.cidade || c.estado || '—'}
                      </td>
                      <td style={{ color: COM_C.txtSub }}>{formatarData(c.data_admissao)}</td>
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