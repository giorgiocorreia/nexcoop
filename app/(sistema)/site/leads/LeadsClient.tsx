'use client'

// Acompanhamento dos leads do site (migration 096).
//
// Antes desta tela o formulário virava e-mail e mais nada: ninguém sabia
// quantos interessados chegaram no mês nem quais já tinham sido respondidos.
// Daí o eixo da tela ser o STATUS, e não a data — o que importa é o que ainda
// está sem resposta.

import { useMemo, useState, useTransition } from 'react'
import {
  PageLayout, ContentCard, ListRow, Badge, EmptyState, KpiCard, Tabs,
  Field, Select, Textarea, Modal, COM_C, MODULO_SITE, InfoRow,
} from '@/components/nexcoop/ui'
import { Btn } from '@/components/ui/Btn'
import { atualizarLead } from '@/lib/site/leads-actions'
import type { SiteLead } from '@/types/database'

const TIPO_LABEL: Record<SiteLead['tipo'], string> = {
  cooperado:         'Adesão de cooperado',
  parceria:          'Proposta de parceria',
  agendamento_cacau: 'Entrega de cacau',
}

// Classe do Tabler (o kit renderiza <i className={`ti ${icone}`}>), não emoji.
const TIPO_ICONE: Record<SiteLead['tipo'], string> = {
  cooperado:         'ti-user-plus',
  parceria:          'ti-building',
  agendamento_cacau: 'ti-plant',
}

const STATUS_LABEL: Record<SiteLead['status'], string> = {
  novo:        'Novo',
  em_contato:  'Em contato',
  convertido:  'Convertido',
  descartado:  'Descartado',
}

const STATUS_COR: Record<SiteLead['status'], { bg: string; cor: string }> = {
  novo:       { bg: COM_C.azulLt,     cor: COM_C.azul },
  em_contato: { bg: COM_C.laranjaLt,  cor: COM_C.laranjaTxt },
  convertido: { bg: COM_C.verdeLt,    cor: COM_C.verdeTxt },
  descartado: { bg: COM_C.vermelhoLt, cor: COM_C.vermelho },
}

// Rótulos dos campos crus do HTML dos formulários — os mesmos de
// lib/site/coopaibi/formularios.ts, para o detalhe não mostrar "ativ" e "msg".
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

function formatarData(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// Só dígitos, com 55 na frente quando o número vem no formato brasileiro.
function linkWhatsapp(telefone: string): string | null {
  const digitos = telefone.replace(/\D/g, '')
  if (digitos.length < 10) return null
  return `https://wa.me/${digitos.length <= 11 ? '55' + digitos : digitos}`
}

interface Props {
  leads: SiteLead[]
  limite: number
}

export default function LeadsClient({ leads, limite }: Props) {
  const [aba, setAba] = useState<'todos' | SiteLead['status']>('todos')
  const [tipo, setTipo] = useState<'todos' | SiteLead['tipo']>('todos')
  const [busca, setBusca] = useState('')
  const [aberto, setAberto] = useState<SiteLead | null>(null)

  const contagem = useMemo(() => {
    const c: Record<string, number> = { novo: 0, em_contato: 0, convertido: 0, descartado: 0 }
    for (const l of leads) c[l.status] = (c[l.status] ?? 0) + 1
    return c
  }, [leads])

  // "Este mês" é o mês corrente do calendário, que é como a diretoria pergunta
  // ("quantos chegaram esse mês?") — não os últimos 30 dias.
  const noMes = useMemo(() => {
    const agora = new Date()
    return leads.filter(l => {
      const d = new Date(l.criado_em)
      return d.getMonth() === agora.getMonth() && d.getFullYear() === agora.getFullYear()
    }).length
  }, [leads])

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return leads.filter(l => {
      if (aba !== 'todos' && l.status !== aba) return false
      if (tipo !== 'todos' && l.tipo !== tipo) return false
      if (!termo) return true
      const alvo = [l.nome, l.email, l.telefone, l.mensagem, ...Object.values(l.dados ?? {})]
        .filter(Boolean).join(' ').toLowerCase()
      return alvo.includes(termo)
    })
  }, [leads, aba, tipo, busca])

  return (
    <PageLayout
      titulo="Leads do site"
      subtitulo="Quem preencheu os formulários do site institucional"
      icone="ti-inbox"
      modulo={MODULO_SITE}
      breadcrumb={[{ label: 'Leads' }]}
    >
      <div className="com-kpi-grid-4">
        <KpiCard label="Total" value={String(leads.length)} icon="ti-users"
          cor={COM_C.marca} corLt={COM_C.marcaLt} sub={`${noMes} neste mês`} />
        <KpiCard label="Novos" value={String(contagem.novo)} icon="ti-mail"
          cor={COM_C.azul} corLt={COM_C.azulLt} sub="sem resposta"
          onClick={() => setAba('novo')} />
        <KpiCard label="Em contato" value={String(contagem.em_contato)} icon="ti-phone"
          cor={COM_C.laranja} corLt={COM_C.laranjaLt}
          onClick={() => setAba('em_contato')} />
        <KpiCard label="Convertidos" value={String(contagem.convertido)} icon="ti-check"
          cor={COM_C.verde} corLt={COM_C.verdeLt}
          onClick={() => setAba('convertido')} />
      </div>

      <Tabs
        ativa={aba}
        onChange={(id) => setAba(id as typeof aba)}
        tabs={[
          { id: 'todos',      label: 'Todos',      badge: leads.length },
          { id: 'novo',       label: 'Novos',      badge: contagem.novo },
          { id: 'em_contato', label: 'Em contato', badge: contagem.em_contato },
          { id: 'convertido', label: 'Convertidos', badge: contagem.convertido },
          { id: 'descartado', label: 'Descartados', badge: contagem.descartado },
        ]}
      />

      <div className="com-toolbar">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, e-mail, telefone…"
          style={{
            flex: 1, minWidth: 220, padding: '8px 12px', fontSize: 13,
            border: `1px solid ${COM_C.borda}`, borderRadius: 8, outline: 'none',
          }}
        />
        <Select value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)} style={{ maxWidth: 220 }}>
          <option value="todos">Todos os formulários</option>
          <option value="cooperado">{TIPO_LABEL.cooperado}</option>
          <option value="parceria">{TIPO_LABEL.parceria}</option>
          <option value="agendamento_cacau">{TIPO_LABEL.agendamento_cacau}</option>
        </Select>
      </div>

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
          {filtrados.map(lead => (
            <ListRow
              key={lead.id}
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
          ))}
        </div>
      )}

      {leads.length >= limite && (
        <div style={{ fontSize: 12, color: COM_C.txtSub, marginTop: 14 }}>
          Mostrando os {limite} leads mais recentes.
        </div>
      )}

      {aberto && (
        <DetalheLead
          lead={aberto}
          onClose={() => setAberto(null)}
        />
      )}
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

  const zap = lead.telefone ? linkWhatsapp(lead.telefone) : null

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
