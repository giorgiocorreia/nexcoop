// Parte pura da tela de leads (regra 5 do CLAUDE.md): filtro, contagem,
// formatação e exportação. Fica fora do componente para poder ser testada
// sem montar React — e porque contagem errada de KPI é o tipo de bug que
// ninguém percebe olhando a tela.

import type { SiteLead } from '@/types/database'

export const TIPO_LABEL: Record<SiteLead['tipo'], string> = {
  cooperado:         'Adesão de cooperado',
  parceria:          'Proposta de parceria',
  agendamento_cacau: 'Entrega de cacau',
}

export const STATUS_LABEL: Record<SiteLead['status'], string> = {
  novo:        'Novo',
  em_contato:  'Em contato',
  convertido:  'Convertido',
  descartado:  'Descartado',
}

export function formatarData(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

/**
 * Link de WhatsApp a partir do telefone digitado no formulário, que vem em
 * formato livre ("(73) 99999-8888", "73 99999 8888"). Devolve null quando não
 * dá para confiar no número — melhor não mostrar o botão do que abrir uma
 * conversa com número errado.
 */
export function linkWhatsapp(telefone: string | null | undefined): string | null {
  const digitos = (telefone ?? '').replace(/\D/g, '')
  if (digitos.length < 10) return null
  // 10-11 dígitos = número nacional sem DDI, recebe o 55. Acima disso já vem
  // com país (13 = 55 + DDD + 9 dígitos).
  if (digitos.length <= 11) return `https://wa.me/55${digitos}`
  if (digitos.length > 13) return null
  return `https://wa.me/${digitos}`
}

export interface FiltroLeads {
  status?: 'todos' | SiteLead['status']
  tipo?: 'todos' | SiteLead['tipo']
  busca?: string
}

/**
 * A busca varre também o jsonb `dados` — quem procura por um CPF ou por uma
 * cidade está procurando em campo que não virou coluna.
 */
export function filtrarLeads(leads: SiteLead[], filtro: FiltroLeads): SiteLead[] {
  const termo = (filtro.busca ?? '').trim().toLowerCase()
  return leads.filter(l => {
    if (filtro.status && filtro.status !== 'todos' && l.status !== filtro.status) return false
    if (filtro.tipo && filtro.tipo !== 'todos' && l.tipo !== filtro.tipo) return false
    if (!termo) return true
    const alvo = [l.nome, l.email, l.telefone, l.mensagem, ...Object.values(l.dados ?? {})]
      .filter(Boolean).join(' ').toLowerCase()
    return alvo.includes(termo)
  })
}

export function contarPorStatus(leads: SiteLead[]): Record<SiteLead['status'], number> {
  const c: Record<SiteLead['status'], number> = {
    novo: 0, em_contato: 0, convertido: 0, descartado: 0,
  }
  for (const l of leads) if (l.status in c) c[l.status]++
  return c
}

/**
 * Mês do CALENDÁRIO, não últimos 30 dias — é como a diretoria pergunta
 * ("quantos chegaram esse mês?"). `referencia` existe para o teste não
 * depender da data de hoje.
 */
export function contarNoMes(leads: SiteLead[], referencia: Date = new Date()): number {
  return leads.filter(l => {
    const d = new Date(l.criado_em)
    return d.getMonth() === referencia.getMonth()
      && d.getFullYear() === referencia.getFullYear()
  }).length
}

// ── Exportação ──────────────────────────────────────────────────────────────

const COLUNAS_CSV = [
  'Data', 'Formulário', 'Nome', 'E-mail', 'Telefone', 'Status', 'Mensagem',
  'Observações', 'Origem', 'Outros campos',
] as const

/**
 * Escapa um valor para CSV. Aspas dobradas e o campo inteiro entre aspas
 * quando há separador, aspas ou quebra de linha — mensagem de formulário tem
 * quebra de linha o tempo todo, e sem isto o arquivo desalinha.
 */
export function escaparCsv(valor: unknown): string {
  const s = String(valor ?? '')
  if (!/[";\n\r]/.test(s)) return s
  return `"${s.replace(/"/g, '""')}"`
}

/**
 * CSV com `;` e BOM: é o que o Excel em português abre com as colunas já
 * separadas e o acento correto. Vírgula obrigaria o usuário a passar pelo
 * assistente de importação a cada vez.
 */
export function gerarCsv(leads: SiteLead[]): string {
  const linhas = [COLUNAS_CSV.join(';')]
  for (const l of leads) {
    const extras = Object.entries(l.dados ?? {})
      .map(([k, v]) => `${k}=${v}`)
      .join(' | ')
    linhas.push([
      formatarData(l.criado_em),
      TIPO_LABEL[l.tipo] ?? l.tipo,
      l.nome,
      l.email ?? '',
      l.telefone ?? '',
      STATUS_LABEL[l.status] ?? l.status,
      l.mensagem ?? '',
      l.observacoes ?? '',
      l.origem ?? '',
      extras,
    ].map(escaparCsv).join(';'))
  }
  return '﻿' + linhas.join('\r\n')
}

/** Nome do arquivo exportado, com a data de hoje. */
export function nomeArquivoCsv(referencia: Date = new Date()): string {
  const iso = referencia.toISOString().slice(0, 10)
  return `leads-site-${iso}.csv`
}
