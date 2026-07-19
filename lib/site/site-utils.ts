// Funções puras do módulo Site (sem I/O) — nunca importar Supabase aqui.
// Padrão: lib/site/queries.ts concentra as consultas; este arquivo só
// formata/valida/deriva dados já em memória (regra 5 do CLAUDE.md).

import type { SiteConfig } from '@/types/database'

export interface SiteTema {
  corPrimaria:   string  // verde escuro — header/rodapé/CTA de destaque
  corSecundaria: string  // verde médio — botões, navbar ativa
  corClara:      string  // verde clarinho — tags, fundos suaves
  corDestaque:   string  // verde-limão — CTA principal
  corDourada:    string  // dourado — faixa de reconhecimento
  corEscura:     string  // quase-preto — rodapé
  logoUrl:       string
  nomeExibicao:  string
  nomeCurto:     string
}

// Identidade visual extraída de assets/style.css do site atual da COOPAIBI
// (Dropbox/.../coopaibi-site) — usada como default até a org configurar o
// tema próprio em site_config.tema.
export const TEMA_PADRAO_COOPAIBI: SiteTema = {
  corPrimaria:   '#1a5c1a',
  corSecundaria: '#2e8b2e',
  corClara:      '#e8f5e9',
  corDestaque:   '#7ed94a',
  corDourada:    '#c8860a',
  corEscura:     '#0f1a0f',
  logoUrl:       '/sites/coopaibi/logo.jpeg',
  nomeExibicao:  'COOPAIBI',
  nomeCurto:     'Cooperativa Mista Agropecuária de Ibirataia',
}

// Tema neutro pra qualquer org que ainda não tenha identidade própria em
// site_config.tema — evita que um site novo saia "verde COOPAIBI" sem querer.
export const TEMA_PADRAO_GENERICO: SiteTema = {
  corPrimaria:   '#1e3a5f',
  corSecundaria: '#2d5586',
  corClara:      '#eaf1fb',
  corDestaque:   '#4f8ef0',
  corDourada:    '#c8860a',
  corEscura:     '#0f1420',
  logoUrl:       '/images/logo-nexcoop-onlyone.png',
  nomeExibicao:  'Cooperativa',
  nomeCurto:     '',
}

// Mescla o jsonb `tema` da org (quando preenchido) sobre o default —
// permite customização parcial (só a cor primária, por exemplo).
export function resolverTema(config: SiteConfig, nomeOrg: string): SiteTema {
  const base = config.slug === 'coopaibi' ? TEMA_PADRAO_COOPAIBI : TEMA_PADRAO_GENERICO
  const overrides = (config.tema ?? {}) as Partial<SiteTema>
  return {
    ...base,
    ...overrides,
    nomeExibicao: overrides.nomeExibicao ?? (config.slug === 'coopaibi' ? base.nomeExibicao : nomeOrg),
  }
}

// Lê um texto editorial com fallback pro default hardcoded do template —
// painel de edição vem depois (ver docs/PLANO_MODULO_SITE.md); por ora o
// jsonb `conteudo` só é usado quando a org já sobrescreveu manualmente.
export function conteudoOuPadrao(config: SiteConfig, chave: string, padrao: string): string {
  const conteudo = (config.conteudo ?? {}) as Record<string, unknown>
  const valor = conteudo[chave]
  return typeof valor === 'string' && valor.trim() ? valor : padrao
}

export function formatarBRL(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatarDataCurta(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export interface DadosInteresse {
  nome:      string
  telefone:  string
  email?:    string
  mensagem?: string
  perfil?:   string
  honeypot?: string // campo escondido — se vier preenchido, é bot
}

export interface ValidacaoInteresse {
  ok: boolean
  erro?: string
}

// Validação básica do formulário "Quero ser cooperado" — roda tanto no
// cliente (feedback imediato) quanto no servidor (fonte da verdade).
export function validarInteresse(dados: DadosInteresse): ValidacaoInteresse {
  if (dados.honeypot && dados.honeypot.trim() !== '') {
    return { ok: false, erro: 'Requisição inválida.' }
  }
  if (!dados.nome || dados.nome.trim().length < 3) {
    return { ok: false, erro: 'Informe o nome completo.' }
  }
  const telefoneDigitos = (dados.telefone ?? '').replace(/\D/g, '')
  if (telefoneDigitos.length < 10) {
    return { ok: false, erro: 'Informe um telefone válido com DDD.' }
  }
  if (dados.email && dados.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.email.trim())) {
    return { ok: false, erro: 'E-mail inválido.' }
  }
  return { ok: true }
}

// Domínios reservados que NUNCA viram site de org (checado pelo middleware).
export const SUBDOMINIOS_RESERVADOS = new Set(['www', 'app', 'api'])

// Extrai o slug do host (ex.: "coopaibi.nexcoop.com.br" → "coopaibi").
// Retorna null quando o host não é um subdomínio de site (domínio raiz,
// reservado ou domínio custom ainda não suportado nesta fase).
export function extrairSlugDoHost(hostname: string, dominioBase: string): string | null {
  const host = hostname.toLowerCase()
  const base = dominioBase.toLowerCase()
  if (host === base || host === `www.${base}`) return null
  if (!host.endsWith(`.${base}`)) return null
  const sub = host.slice(0, -(`.${base}`.length))
  if (!sub || sub.includes('.') || SUBDOMINIOS_RESERVADOS.has(sub)) return null
  return sub
}
