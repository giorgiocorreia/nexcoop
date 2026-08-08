'use client'

// Acompanhamento dos leads do site (migration 096).
//
// Antes desta tela o formulário virava e-mail e mais nada: ninguém sabia
// quantos interessados chegaram no mês nem quais já tinham sido respondidos.
// Daí o eixo da tela ser o STATUS, e não a data — o que importa é o que ainda
// está sem resposta.
//
// Filtro, contagem, CSV e link de WhatsApp moram em lib/site/leads-utils.ts,
// que é onde a suíte de testes bate (regra 5 do CLAUDE.md).

import { useMemo, useState, useTransition } from 'react'
import {
  PageLayout, ContentCard, ListRow, Badge, EmptyState, KpiCard, Tabs,
  Field, Select, Textarea, Modal, COM_C, MODULO_SITE, InfoRow,
} from '@/components/nexcoop/ui'
import { Btn } from '@/components/ui/Btn'
import { atualizarLead, atualizarStatusEmLote } from '@/lib/site/leads-actions'
import {
  TIPO_LABEL, STATUS_LABEL, formatarData, linkWhatsapp, filtrarLeads,
  contarPorStatus, contarNoMes, gerarCsv, nomeArquivoCsv,
} from '@/lib/site/leads-utils'
import type { SiteLead } from '@/types/database'

// Classe do Tabler (o kit renderiza <i className={`ti ${icone}`}>), não emoji.
const TIPO_ICONE: Record<SiteLead['tipo'], string> = {
  cooperado:         'ti-user-plus',
  parceria:          'ti-building',
  agendamento_cacau: 'ti-plant',
}

const STATUS_COR: Record<SiteLead['status'], { bg: string; cor: string }> = {
  novo:       { bg: COM_C.azulLt,     cor: COM_C.azul },
  em_contato: { bg: COM_C.laranjaLt,  cor: COM_C.laranjaTxt },
  convertido: { bg: COM_C.verdeLt,    cor: COM_C.verdeTxt },
  descartado: { bg: COM_C.vermelhoLt, cor: COM_C.vermelho },
}

// Rótulos dos campos crus do HTML dos formulários — os mesmos de
// lib/site/coopaibi/formularios-utils.ts, para o detalhe não mostrar "ativ".
const ROTULOS: Record<string, string> = {
  nome: 'Nome completo', cpf: 'CPF / CNPJ', tel: 'Telefone/WhatsApp',
  telefone: 'Telefone/WhatsApp', email: 'E-mail', local: 'Localidade',
  area: 'Área disponível', perfil: 'Perfil', ativ: 'Atividade', msg: 'Mensagem',
  empresa: 'Empresa / Instituição', contato: 'Nome do contato', cargo: 'Cargo / Função',
  cota: 'Cota de interesse', segmento: 'Segmento de atuação',
  municipio: 'Município', quantidade: 'Quantidade estimada',
  data_preferencial: 'Data preferencial', cooperado: 'É cooperado?',
  observacoes: 'Observações',
}

// Quantos aparecem por vez. A lista chega inteira do servidor (até 500), mas
// renderizar 500 linhas de uma vez trava a rolagem no celular.
const POR_PAGINA = 50

interface Props {
  leads: SiteLead[]
  limite: number
}

export default function LeadsClient({ leads, limite }: Props) {
  const [aba, setAba] = useState<'todos' | SiteLead['status']>('todos')
  const [tipo, setTipo] = useState<'todos' | SiteLead['tipo']>('todos')
  const [busca, setBusca] = useState('')
  const [aberto, setAberto] = useState<SiteLead | null>(null)
  const [visiveis, setVisiveis] = useState(POR_PAGINA)
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [erroLote, setErroLote] = useState<string | null>(null)
  const [salvandoLote, iniciarLote] = useTransition()

  const contagem = useMemo(() => contarPorStatus(leads), [leads])
  const noMes = useMemo(() => contarNoMes(leads), [leads])

  const filtrados = useMemo(
    () => filtrarLeads(leads, { status: aba, tipo, busca }),
    [leads, aba, tipo, busca]
  )

  // Mexer no filtro volta para a primeira página e limpa a seleção — manter
  // selecionado o que saiu da vista faria a ação em lote pegar invisível.
  function trocarFiltro(fn: () => void) {
    fn()
    setVisiveis(POR_PAGINA)
    setSelecionados(new Set())
    setErroLote(null)
  }

  function alternar(id: string) {
    setSelecionados(prev => {
      const novo = new Set(prev)
      if (novo.has(id)) novo.delete(id)
      else novo.add(id)
      return novo
    })
  }

  function aplicarLote(status: SiteLead['status']) {
    setErroLote(null)
    iniciarLote(async () => {
      const r = await atualizarStatusEmLote([...selecionados], status)
      if (r.error) setErroLote(r.error)
      else setSelecionados(new Set())
    })
  }

  function exportar() {
    // Exporta o que está FILTRADO na tela, não a base inteira: quem filtrou
    // "novos de parceria" quer exportar isso.
    const csv = gerarCsv(filtrados)
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = nomeArquivoCsv()
    a.click()
    URL.revokeObjectURL(url)
  }

  const mostrados = filtrados.slice(0, visiveis)

  return (
    <PageLayout
      titulo="Leads do site"
      subtitulo="Quem preencheu os formulários do site institucional"
      icone="ti-inbox"
      modulo={MODULO_SITE}
      breadcrumb={[{ label: 'Leads' }]}
      acoes={
        <Btn icone="ti-download" onClick={exportar} disabled={filtrados.length === 0}>
          Exportar CSV
        </Btn>
      }
    >
      <div className="com-kpi-grid-4">
        <KpiCard label="Total" value={String(leads.length)} icon="ti-users"
          cor={COM_C.marca} corLt={COM_C.marcaLt} sub={`${noMes} neste mês`} />
        <KpiCard label="Novos" value={String(contagem.novo)} icon="ti-mail"
          cor={COM_C.azul} corLt={COM_C.azulLt} sub="sem resposta"
          onClick={() => trocarFiltro(() => setAba('novo'))} />
        <KpiCard label="Em contato" value={String(contagem.em_contato)} icon="ti-phone"
          cor={COM_C.laranja} corLt={COM_C.laranjaLt}
          onClick={() => trocarFiltro(() => setAba('em_contato'))} />
        <KpiCard label="Convertidos" value={String(contagem.convertido)} icon="ti-check"
          cor={COM_C.verde} corLt={COM_C.verdeLt}
          onClick={() => trocarFiltro(() => setAba('convertido'))} />
      </div>

      <Tabs
        ativa={aba}
        onChange={(id) => trocarFiltro(() => setAba(id as typeof aba))}
        tabs={[
          { id: 'todos',      label: 'Todos',       badge: leads.length },
          { id: 'novo',       label: 'Novos',       badge: contagem.novo },
          { id: 'em_contato', label: 'Em contato',  badge: contagem.em_contato },
          { id: 'convertido', label: 'Convertidos', badge: contagem.convertido },
          { id: 'descartado', label: 'Descartados', badge: contagem.descartado },
        ]}
      />

      <div className="com-toolbar">
        <input
          value={busca}
          onChange={(e) => trocarFiltro(() => setBusca(e.target.value))}
          placeholder="Buscar por nome, e-mail, telefone…"
          style={{
            flex: 1, minWidth: 220, padding: '8px 12px', fontSize: 13,
            border: `1px solid ${COM_C.borda}`, borderRadius: 8, outline: 'none',
          }}
        />
        <Select
          value={tipo}
          onChange={(e) => trocarFiltro(() => setTipo(e.target.value as typeof tipo))}
          style={{ maxWidth: 220 }}
        >
          <option value="todos">Todos os formulários</option>
          <option value="cooperado">{TIPO_LABEL.cooperado}</option>
          <option value="parceria">{TIPO_LABEL.parceria}</option>
          <option value="agendamento_cacau">{TIPO_LABEL.agendamento_cacau}</option>
        </Select>
      </div>

      {selecionados.size > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
          background: COM_C.marcaLt, border: `1px solid ${COM_C.borda}`,
          borderRadius: 10, padding: '10px 14px', marginBottom: 14,
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: COM_C.txt }}>
            {selecionados.size} selecionado{selecionados.size > 1 ? 's' : ''}
          </span>
          <span style={{ flex: 1 }} />
          <Btn tamanho="sm" onClick={() => aplicarLote('em_contato')} disabled={salvandoLote}>
            Marcar em contato
          </Btn>
          <Btn tamanho="sm" variante="verde" onClick={() => aplicarLote('convertido')} disabled={salvandoLote}>
            Convertido
          </Btn>
          <Btn tamanho="sm" onClick={() => aplicarLote('descartado')} disabled={salvandoLote}>
            Descartar
          </Btn>
          <Btn tamanho="sm" onClick={() => setSelecionados(new Set())} disabled={salvandoLote}>
            Limpar
          </Btn>
          {erroLote && (
            <span style={{ fontSize: 12, color: COM_C.vermelho, width: '100%' }}>{erroLote}</span>
          )}
        </div>
      )}

      {filtrados.length === 0 ? (
        <EmptyState
          emoji="📭"
          titulo={leads.length === 0 ? 'Nenhum lead ainda' : 'Nada com esse filtro'}
          descricao={
            leads.length === 0
              ? 'Quando alguém preencher um formulário do site, ele aparece aqui.'
              : 'Ajuste a busca, o formulário ou a aba de status.'
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {mostrados.map(lead => (
            <div key={lead.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="checkbox"
                checked={selecionados.has(lead.id)}
                onChange={() => alternar(lead.id)}
                aria-label={`Selecionar ${lead.nome}`}
                style={{ width: 16, height: 16, flexShrink: 0, cursor: 'pointer' }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <ListRow
                  onClick={() => setAberto(lead)}
                  icone={TIPO_ICONE[lead.tipo]}
                  iconeBg={STATUS_COR[lead.status].bg}
                  iconeCor={STATUS_COR[lead.status].cor}
                  titulo={lead.nome}
                  subtitulo={`${TIPO_LABEL[lead.tipo]} · ${formatarData(lead.criado_em)}${lead.telefone ? ' · ' + lead.telefone : ''}`}
                  badges={
                    <Badge
                      label={STATUS_LABEL[lead.status]}
                      bg={STATUS_COR[lead.status].bg}
                      cor={STATUS_COR[lead.status].cor}
                      dot
                    />
                  }
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {filtrados.length > mostrados.length && (
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Btn onClick={() => setVisiveis(v => v + POR_PAGINA)}>
            Mostrar mais ({filtrados.length - mostrados.length} restantes)
          </Btn>
        </div>
      )}

      {leads.length >= limite && (
        <div style={{ fontSize: 12, color: COM_C.txtSub, marginTop: 14 }}>
          Mostrando os {limite} leads mais recentes. Use a exportação para o histórico completo.
        </div>
      )}

      {aberto && <DetalheLead lead={aberto} onClose={() => setAberto(null)} />}
    </PageLayout>
  )
}

// ── Detalhe ────────────────────────────────────────────────────────────────

function DetalheLead({ lead, onClose }: { lead: SiteLead; onClose: () => void }) {
  const [status, setStatus] = useState<SiteLead['status']>(lead.status)
  const [observacoes, setObservacoes] = useState(lead.observacoes ?? '')
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, iniciarSalvar] = useTransition()

  // Campos já promovidos a coluna aparecem no topo do modal; repetir aqui
  // duplicaria a informação.
  const CAMPOS_JA_MOSTRADOS = new Set(['nome', 'contato', 'email', 'tel', 'telefone', 'msg', 'observacoes'])
  const extras = Object.entries(lead.dados ?? {}).filter(([k]) => !CAMPOS_JA_MOSTRADOS.has(k))

  const zap = linkWhatsapp(lead.telefone)

  function salvar() {
    setErro(null)
    iniciarSalvar(async () => {
      const r = await atualizarLead(lead.id, { status, observacoes })
      if (r.error) setErro(r.error)
      else onClose()
    })
  }

  return (
    <Modal
      titulo={lead.nome}
      subtitulo={`${TIPO_LABEL[lead.tipo]} · ${formatarData(lead.criado_em)}`}
      onClose={onClose}
      largura={560}
      footer={
        <>
          <Btn onClick={onClose}>Fechar</Btn>
          <Btn variante="verde" icone="ti-check" onClick={salvar} disabled={salvando}>
            {salvando ? 'Salvando…' : 'Salvar'}
          </Btn>
        </>
      }
    >
      {erro && (
        <div style={{
          background: COM_C.vermelhoLt, color: COM_C.vermelho, fontSize: 12,
          padding: '8px 12px', borderRadius: 8, marginBottom: 14,
        }}>
          {erro}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 18 }}>
        {lead.email && <InfoRow label="E-mail" valor={lead.email} />}
        {lead.telefone && <InfoRow label="Telefone" valor={lead.telefone} />}
        {extras.map(([k, v]) => (
          <InfoRow key={k} label={ROTULOS[k] ?? k} valor={String(v)} />
        ))}
        {lead.origem && <InfoRow label="Veio da página" valor={lead.origem} />}
      </div>

      {lead.mensagem && (
        <ContentCard title="Mensagem" padding="14px 16px">
          <div style={{ fontSize: 13, color: COM_C.txt, whiteSpace: 'pre-wrap' }}>{lead.mensagem}</div>
        </ContentCard>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 18 }}>
        <Field label="Status">
          <Select value={status} onChange={(e) => setStatus(e.target.value as SiteLead['status'])}>
            <option value="novo">{STATUS_LABEL.novo}</option>
            <option value="em_contato">{STATUS_LABEL.em_contato}</option>
            <option value="convertido">{STATUS_LABEL.convertido}</option>
            <option value="descartado">{STATUS_LABEL.descartado}</option>
          </Select>
        </Field>

        <Field label="Observações" hint="Fica só no sistema — o interessado não vê.">
          <Textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            rows={3}
            placeholder="Ex.: ligamos dia 08/08, pediu para retornar na semana que vem."
          />
        </Field>

        {zap && (
          <a href={zap} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 13, color: COM_C.verdeTxt, textDecoration: 'none', fontWeight: 600 }}>
            💬 Falar no WhatsApp
          </a>
        )}
      </div>
    </Modal>
  )
}
