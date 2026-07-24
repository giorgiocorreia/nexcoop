'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Cooperado, StatusCooperado } from '@/types/database'
import BotaoAjuda from '@/components/BotaoAjuda'
import { toast } from 'sonner'
import { emitirCarteirinhasEmLote } from '@/lib/carteirinha/actions'
import { Btn } from '@/components/ui/Btn'
import { nomenclatura } from '@/lib/nomenclatura'
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

interface Props {
  cooperados: Cooperado[]
  tipoOrg: string
  statusInicial?: StatusCooperado
  // Associação: ids de associados com mensalidade vencida (fonte única, do servidor).
  inadimplentesMensalidade?: string[]
  mensalidadeInicial?: boolean
}

export default function CooperadosLista({ cooperados, tipoOrg, statusInicial, inadimplentesMensalidade, mensalidadeInicial }: Props) {
  const n = nomenclatura(tipoOrg)
  const ehAssoc = tipoOrg === 'associacao'
  const router = useRouter()
  const [lista] = useState(cooperados)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<StatusCooperado | 'todos'>(statusInicial ?? 'todos')
  const [filtroMensalidade, setFiltroMensalidade] = useState<'todos' | 'atrasada'>(mensalidadeInicial ? 'atrasada' : 'todos')
  const [hovered, setHovered] = useState<string | null>(null)

  // Seleção múltipla pra impressão de carteirinhas em lote (fase 3). Quem
  // não tem carteirinha ativa é silenciosamente pulado pela rota de
  // impressão — a seleção aqui não sabe (nem precisa saber) quem tem ou não.
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  // Modo de seleção para impressão em lote: os checkboxes só aparecem depois
  // de clicar em "Imprimir carteirinhas". Antes o botão é que só aparecia
  // depois de marcar alguém — a pessoa tinha que adivinhar o caminho
  // (feedback do Giorgio, 24/07/2026).
  const [modoSelecao, setModoSelecao] = useState(false)
  const [emitindoLote, setEmitindoLote] = useState(false)

  // Set de inadimplentes por mensalidade (só associação) — mesmo número do dashboard.
  const setInad = useMemo(() => new Set(inadimplentesMensalidade ?? []), [inadimplentesMensalidade])

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
      const passaMensalidade = !ehAssoc || filtroMensalidade === 'todos' || setInad.has(c.id)
      return passaBusca && passaStatus && passaMensalidade
    })
  }, [lista, busca, filtroStatus, filtroMensalidade, ehAssoc, setInad])

  const temFiltro = busca || filtroStatus !== 'todos' || filtroMensalidade !== 'todos'

  const todosFiltradosSelecionados = filtrados.length > 0 && filtrados.every(c => selecionados.has(c.id))

  function alternarSelecao(id: string) {
    setSelecionados(prev => {
      const novo = new Set(prev)
      if (novo.has(id)) novo.delete(id)
      else novo.add(id)
      return novo
    })
  }

  function alternarSelecionarTodosFiltrados() {
    setSelecionados(prev => {
      if (todosFiltradosSelecionados) {
        // Desmarca só os que estão visíveis no filtro atual — não mexe numa
        // seleção feita antes de trocar o filtro.
        const novo = new Set(prev)
        filtrados.forEach(c => novo.delete(c.id))
        return novo
      }
      const novo = new Set(prev)
      filtrados.forEach(c => novo.add(c.id))
      return novo
    })
  }

  function imprimirCarteirinhasSelecionadas() {
    if (selecionados.size === 0) return
    const ids = Array.from(selecionados).join(',')
    window.open(`/imprimir/carteirinhas?ids=${encodeURIComponent(ids)}`, '_blank', 'noopener,noreferrer')
    sairDoModoSelecao()
  }

  // Emite para os selecionados que ainda não têm carteirinha. Quem já tem é
  // pulado (nunca reemitido — isso invalidaria o cartão que a pessoa já
  // carrega); a 2ª via continua sendo ato individual, na ficha.
  async function emitirCarteirinhasSelecionadas() {
    if (selecionados.size === 0 || emitindoLote) return
    setEmitindoLote(true)
    try {
      const res = await emitirCarteirinhasEmLote(Array.from(selecionados))
      if (res.error) {
        toast.error(res.error)
        return
      }
      const { emitidas, jaTinham } = res.data!
      if (emitidas === 0) {
        toast.info(jaTinham > 0
          ? `Nenhuma emitida — ${jaTinham} já tinham carteirinha ativa.`
          : 'Nenhuma carteirinha emitida.')
      } else {
        toast.success(
          `${emitidas} carteirinha(s) emitida(s)` +
          (jaTinham > 0 ? ` · ${jaTinham} já tinham` : '') +
          '. Agora é só imprimir.'
        )
      }
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao emitir as carteirinhas.')
    } finally {
      setEmitindoLote(false)
    }
  }

  function sairDoModoSelecao() {
    setModoSelecao(false)
    setSelecionados(new Set())
  }

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
          {ehAssoc && (
            <Btn variante="cinza" icone="ti-calendar-due" onClick={() => router.push('/mensalidades/gerar')}>
              Gerar mensalidades
            </Btn>
          )}
          {!modoSelecao ? (
            <Btn variante="cinza" icone="ti-printer" onClick={() => setModoSelecao(true)}>
              Imprimir carteirinhas
            </Btn>
          ) : (
            <>
              <Btn
                variante="cinza"
                icone="ti-id"
                onClick={emitirCarteirinhasSelecionadas}
                disabled={selecionados.size === 0 || emitindoLote}
              >
                {emitindoLote ? 'Emitindo...' : `Emitir ${selecionados.size > 0 ? `(${selecionados.size})` : ''}`}
              </Btn>
              <Btn
                variante="roxo"
                icone="ti-printer"
                onClick={imprimirCarteirinhasSelecionadas}
                disabled={selecionados.size === 0}
              >
                Imprimir {selecionados.size > 0 ? `(${selecionados.size})` : ''}
              </Btn>
              <Btn variante="cinza" onClick={sairDoModoSelecao}>
                Cancelar
              </Btn>
            </>
          )}
          <Btn variante="roxo" icone="ti-plus" onClick={() => router.push('/cooperados/novo')}>
            {n.novo}
          </Btn>
        </div>
      }
    >
      {/* KPIs clicáveis: filtram a lista. Em associação, Inadimplentes usa a
          mensalidade vencida (mesmo número do dashboard). */}
      <div className="com-kpi-grid-4">
        <KpiCard label={`Total de ${n.plural}`} value={String(resumo.total)} icon="ti-users" cor={COM_C.txtSub} corLt="#F5F5F4"
          onClick={() => { setBusca(''); setFiltroStatus('todos'); setFiltroMensalidade('todos') }} />
        <KpiCard label="Ativos" value={String(resumo.ativos)} icon="ti-user-check" cor={COM_C.roxo} corLt={COM_C.roxoLt}
          onClick={() => { setFiltroMensalidade('todos'); setFiltroStatus('ativo') }} />
        <KpiCard label="Probatórios" value={String(resumo.probatorios)} icon="ti-user-search" cor={COM_C.azul} corLt={COM_C.azulLt}
          onClick={() => { setFiltroMensalidade('todos'); setFiltroStatus('probatorio') }} />
        {ehAssoc ? (
          <KpiCard label="Inadimplentes" value={String(setInad.size)} icon="ti-user-exclamation" cor={COM_C.laranja} corLt={COM_C.laranjaLt}
            onClick={() => { setFiltroStatus('todos'); setFiltroMensalidade('atrasada') }} />
        ) : (
          <KpiCard label="Inadimplentes" value={String(resumo.inadimplentes)} icon="ti-user-exclamation" cor={COM_C.laranja} corLt={COM_C.laranjaLt}
            onClick={() => setFiltroStatus('inadimplente')} />
        )}
      </div>

      <div className="com-toolbar nxc-toolbar">
        <div style={{ flex: 1, minWidth: 220 }}>
          <Input
            type="text"
            placeholder="Buscar por nome, CPF ou e-mail…"
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
          <Btn variante="cinza" tamanho="sm" onClick={() => { setBusca(''); setFiltroStatus('todos'); setFiltroMensalidade('todos') }}>
            Limpar
          </Btn>
        )}
      </div>

      {/* Instrução do modo de seleção — sem isto o usuário precisava adivinhar
          que devia marcar alguém pra revelar o botão de impressão. */}
      {modoSelecao && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 12px',
          padding: '10px 14px', borderRadius: 10,
          background: COM_C.roxoLt, border: `1px solid ${COM_C.roxo}33`,
        }}>
          <i className="ti ti-info-circle" style={{ fontSize: 16, color: COM_C.roxo }} aria-hidden />
          <span style={{ fontSize: 13, color: COM_C.roxo, fontWeight: 500 }}>
            Selecione os {n.plural.toLowerCase()} e escolha a ação.
            {' '}<strong>Emitir</strong> gera a carteirinha de quem ainda não tem;
            {' '}<strong>Imprimir</strong> gera o PDF de quem já tem — 4 por folha, para cortar, dobrar e plastificar.
          </span>
        </div>
      )}

      {filtrados.length === 0 ? (
        <EmptyState
          emoji="👥"
          titulo={temFiltro ? `Nenhum ${n.singular.toLowerCase()} encontrado` : `Nenhum ${n.singular.toLowerCase()} cadastrado`}
          descricao={temFiltro ? 'Tente outros filtros de busca.' : undefined}
          acao={!temFiltro ? { label: n.novo, onClick: () => router.push('/cooperados/novo') } : undefined}
        />
      ) : (
        <ContentCard noPadding>
          <div className="com-table-scroll" style={{ overflowX: 'auto' }}>
            <table className="com-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
              <thead>
                <tr>
                  {modoSelecao && (
                    <th style={{ width: 36 }}>
                      <input
                        type="checkbox"
                        checked={todosFiltradosSelecionados}
                        onChange={alternarSelecionarTodosFiltrados}
                        title="Selecionar todos os filtrados"
                        aria-label="Selecionar todos os filtrados"
                      />
                    </th>
                  )}
                  {['Nome', 'CPF', 'E-mail', 'Cidade / UF', 'Admissão', ...(ehAssoc ? ['Mensalidade'] : []), 'Status'].map(col => (
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
                      // No modo de seleção, clicar na linha marca/desmarca em vez
                      // de navegar — evita sair da tela no meio da seleção.
                      onClick={() => modoSelecao ? alternarSelecao(c.id) : router.push(`/cooperados/${c.id}`)}
                      onMouseEnter={() => setHovered(c.id)}
                      onMouseLeave={() => setHovered(null)}
                      style={{ cursor: 'pointer', background: isHov ? '#FAFAF9' : undefined }}
                    >
                      {modoSelecao && (
                        <td onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selecionados.has(c.id)}
                            onChange={() => alternarSelecao(c.id)}
                            aria-label={`Selecionar ${c.nome_completo}`}
                          />
                        </td>
                      )}
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
                      {ehAssoc && (
                        <td>
                          {setInad.has(c.id)
                            ? <Badge label="Atrasada" bg="#fee2e2" cor="#dc2626" />
                            : <Badge label="Em dia" bg="#dcfce7" cor="#166534" />}
                        </td>
                      )}
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