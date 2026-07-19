'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Documento, CategoriaDocumento } from '@/types/database'
import BotaoAjuda from '@/components/BotaoAjuda'
import { Btn } from '@/components/ui/Btn'
import {
  PageLayout, KpiCard, ContentCard, Badge, EmptyState,
  Input, Select, COM_C,
} from '@/components/nexcoop/ui'

const CATEGORIA_CONFIG: Record<CategoriaDocumento, { label: string; cor: string; bg: string; icone: string }> = {
  estatuto:   { label: 'Estatuto',   cor: '#185FA5', bg: '#E6F1FB', icone: '📋' },
  ata:        { label: 'Ata',        cor: '#4840CC', bg: '#EEF0FF', icone: '📝' },
  contrato:   { label: 'Contrato',   cor: '#6366f1', bg: '#ede9fe', icone: '🤝' },
  convenio:   { label: 'Convênio',   cor: '#7c3aed', bg: '#f5f3ff', icone: '🔗' },
  edital:     { label: 'Edital',     cor: '#0e7490', bg: '#ecfeff', icone: '📢' },
  certidao:   { label: 'Certidão',   cor: '#854F0B', bg: '#FAEEDA', icone: '📜' },
  licenca:    { label: 'Licença',    cor: '#993C1D', bg: '#FAECE7', icone: '🔑' },
  relatorio:  { label: 'Relatório',  cor: '#374151', bg: '#f3f4f6', icone: '📊' },
  financeiro: { label: 'Financeiro', cor: '#4840CC', bg: '#EEF0FF', icone: '💰' },
  projeto:    { label: 'Projeto',    cor: '#6366f1', bg: '#ede9fe', icone: '🎯' },
  aditivo:    { label: 'Aditivo',    cor: '#854F0B', bg: '#FAEEDA', icone: '📎' },
  outro:      { label: 'Outro',      cor: '#374151', bg: '#f3f4f6', icone: '📄' },
}

const TODAS_CATEGORIAS = Object.keys(CATEGORIA_CONFIG) as CategoriaDocumento[]

type StatusValidade = 'vencido' | 'alerta' | 'ok' | 'sem_validade'

function calcStatus(doc: Documento): StatusValidade {
  if (!doc.data_validade) return 'sem_validade'
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  const val = new Date(doc.data_validade + 'T00:00:00')
  if (val < hoje) return 'vencido'
  const alerta = new Date(hoje); alerta.setDate(alerta.getDate() + doc.alerta_dias)
  if (val <= alerta) return 'alerta'
  return 'ok'
}

const STATUS_VALIDADE: Record<StatusValidade, { label: string; cor: string; bg: string }> = {
  vencido:      { label: 'Vencido',      cor: '#993C1D', bg: '#FAECE7' },
  alerta:       { label: 'Vencendo',     cor: '#854F0B', bg: '#FAEEDA' },
  ok:           { label: 'Em dia',       cor: '#4840CC', bg: '#EEF0FF' },
  sem_validade: { label: 'Sem validade', cor: '#6b7280', bg: '#f3f4f6' },
}

function diasAteVencimento(dataValidade: string | null): number | null {
  if (!dataValidade) return null
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  const val = new Date(dataValidade + 'T00:00:00')
  return Math.round((val.getTime() - hoje.getTime()) / 86_400_000)
}

function formatarData(d: string | null) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
}

// Mesmo recorte usado no KPI "Docs vencendo" do dashboard: janela FIXA de 30
// dias, independente do alerta_dias configurado em cada documento (por isso
// não reaproveita calcStatus/StatusValidade — são critérios diferentes).
function venceEm30Dias(dataValidade: string | null): boolean {
  if (!dataValidade) return false
  const limite = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  return dataValidade <= limite
}

interface Props {
  documentos: Documento[]
  filtroInicial?: 'vencendo_30'
}

export default function DocumentosLista({ documentos, filtroInicial }: Props) {
  const router = useRouter()
  const [busca, setBusca] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState<CategoriaDocumento | 'todas'>('todas')
  const [filtroStatus, setFiltroStatus] = useState<StatusValidade | 'todos'>('todos')
  const [apenasVencendo30, setApenasVencendo30] = useState(filtroInicial === 'vencendo_30')
  const [hovered, setHovered] = useState<string | null>(null)

  const resumo = useMemo(() => ({
    total: documentos.length,
    vencidos: documentos.filter(d => calcStatus(d) === 'vencido').length,
    alertas: documentos.filter(d => calcStatus(d) === 'alerta').length,
    semVal: documentos.filter(d => calcStatus(d) === 'sem_validade').length,
  }), [documentos])

  const filtrados = useMemo(() => {
    const q = busca.toLowerCase().trim()
    return documentos.filter(d => {
      const matchBusca = !q ||
        d.nome.toLowerCase().includes(q) ||
        (d.numero_documento ?? '').toLowerCase().includes(q) ||
        (d.orgao_emissor ?? '').toLowerCase().includes(q)
      const matchCat = filtroCategoria === 'todas' || d.categoria === filtroCategoria
      const matchStatus = filtroStatus === 'todos' || calcStatus(d) === filtroStatus
      const matchVencendo30 = !apenasVencendo30 || venceEm30Dias(d.data_validade)
      return matchBusca && matchCat && matchStatus && matchVencendo30
    })
  }, [documentos, busca, filtroCategoria, filtroStatus, apenasVencendo30])

  const temFiltro = busca || filtroCategoria !== 'todas' || filtroStatus !== 'todos' || apenasVencendo30

  return (
    <PageLayout
      titulo="Documentos"
      subtitulo="Gestão documental da cooperativa"
      icone="ti-files"
      modulo={{ label: 'NexCoop', href: '/dashboard' }}
      semBreadcrumb
      acoes={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BotaoAjuda chave="manual_documentos_url" />
          <Btn variante="roxo" icone="ti-plus" onClick={() => router.push('/documentos/novo')}>
            Novo documento
          </Btn>
        </div>
      }
    >
      <div className="com-kpi-grid-4">
        <KpiCard label="Total" value={String(resumo.total)} sub="documentos cadastrados" icon="ti-files" cor={COM_C.azul} corLt={COM_C.azulLt} />
        <KpiCard label="Vencidos" value={String(resumo.vencidos)} sub="com prazo expirado" icon="ti-alert-circle" cor={COM_C.vermelho} corLt={COM_C.vermelhoLt} />
        <KpiCard label="Vencendo" value={String(resumo.alertas)} sub="dentro do prazo de alerta" icon="ti-clock" cor={COM_C.laranja} corLt={COM_C.laranjaLt} />
        <KpiCard label="Sem validade" value={String(resumo.semVal)} sub="sem prazo definido" icon="ti-infinity" cor={COM_C.txtSub} corLt="#F5F5F4" />
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <Input type="text" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nome, número, órgão…" />
        </div>
        <Select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value as CategoriaDocumento | 'todas')} style={{ width: 'auto', minWidth: 160 }}>
          <option value="todas">Todas as categorias</option>
          {TODAS_CATEGORIAS.map(c => <option key={c} value={c}>{CATEGORIA_CONFIG[c].label}</option>)}
        </Select>
        <Select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value as StatusValidade | 'todos')} style={{ width: 'auto', minWidth: 140 }}>
          <option value="todos">Todos os status</option>
          <option value="vencido">Vencido</option>
          <option value="alerta">Vencendo</option>
          <option value="ok">Em dia</option>
          <option value="sem_validade">Sem validade</option>
        </Select>
        <Btn
          variante={apenasVencendo30 ? 'roxo' : 'cinza'}
          tamanho="sm"
          onClick={() => setApenasVencendo30(v => !v)}
        >
          Vencendo em 30 dias
        </Btn>
        {temFiltro && (
          <Btn variante="cinza" tamanho="sm" onClick={() => { setBusca(''); setFiltroCategoria('todas'); setFiltroStatus('todos'); setApenasVencendo30(false) }}>
            Limpar
          </Btn>
        )}
      </div>

      {filtrados.length === 0 ? (
        <EmptyState
          emoji="📄"
          titulo={documentos.length === 0 ? 'Nenhum documento cadastrado' : 'Nenhum documento encontrado'}
          descricao={documentos.length === 0 ? 'Cadastre o primeiro documento da cooperativa.' : 'Ajuste os filtros aplicados.'}
          acao={documentos.length === 0 ? { label: 'Novo documento', onClick: () => router.push('/documentos/novo') } : undefined}
        />
      ) : (
        <ContentCard noPadding>
          <div style={{ overflowX: 'auto' }}>
            <table className="com-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
              <thead>
                <tr>
                  {['Documento', 'Categoria', 'Órgão emissor', 'Validade', 'Status'].map(col => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.map((doc) => {
                  const cat = CATEGORIA_CONFIG[doc.categoria]
                  const sv = calcStatus(doc)
                  const svConf = STATUS_VALIDADE[sv]
                  const dias = diasAteVencimento(doc.data_validade)
                  return (
                    <tr
                      key={doc.id}
                      onClick={() => router.push(`/documentos/${doc.id}`)}
                      onMouseEnter={() => setHovered(doc.id)}
                      onMouseLeave={() => setHovered(null)}
                      style={{ cursor: 'pointer', background: hovered === doc.id ? '#FAFAF9' : undefined }}
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                          <span style={{ fontSize: 16, flexShrink: 0 }}>{cat.icone}</span>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              {doc.nome}
                              {doc.restrito && <Badge label="RESTRITO" bg="#FEF2F2" cor="#DC2626" />}
                            </div>
                            {doc.numero_documento && <div style={{ fontSize: 11, color: COM_C.txtSub }}>nº {doc.numero_documento}</div>}
                          </div>
                        </div>
                      </td>
                      <td><Badge label={cat.label} bg={cat.bg} cor={cat.cor} /></td>
                      <td style={{ fontSize: 12, color: COM_C.txtSub }}>{doc.orgao_emissor || '—'}</td>
                      <td>
                        {doc.data_validade ? (
                          <>
                            <div style={{ fontWeight: 600, color: sv === 'vencido' ? COM_C.vermelho : sv === 'alerta' ? COM_C.laranja : COM_C.txt }}>
                              {formatarData(doc.data_validade)}
                            </div>
                            {dias !== null && (
                              <div style={{ fontSize: 11, color: COM_C.txtSub }}>
                                {dias < 0 ? `${Math.abs(dias)}d vencido` : dias === 0 ? 'Vence hoje' : `em ${dias}d`}
                              </div>
                            )}
                          </>
                        ) : <span style={{ color: COM_C.txtSub }}>—</span>}
                      </td>
                      <td><Badge label={svConf.label} bg={svConf.bg} cor={svConf.cor} /></td>
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