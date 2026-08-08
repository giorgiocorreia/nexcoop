// Parte pura dos formulários do site — sem I/O, para poder ser testada sem
// banco nem SMTP (regra 5 do CLAUDE.md: `feature.ts` faz I/O,
// `feature-utils.ts` é função pura).
//
// O que vive aqui é o que traduz o formulário HTML cru, herdado do cPanel,
// para o formato de `site_leads`: qual campo do HTML vira coluna, o que
// sobra para o jsonb, e a higienização do que o visitante digitou.

export type TipoFormulario = 'cooperado' | 'parceria' | 'agendamento_cacau'

// Campos que viram coluna, por formulário. O resto vai para `dados`.
// Os nomes à direita são os do HTML original ('tel', 'msg', 'contato') e não
// podem ser renomeados sem editar as páginas capturadas.
export const MAPA_CAMPOS: Record<
  TipoFormulario,
  { nome: string; email?: string; telefone?: string; mensagem?: string }
> = {
  cooperado:         { nome: 'nome',    email: 'email', telefone: 'tel', mensagem: 'msg' },
  parceria:          { nome: 'contato', email: 'email', telefone: 'tel', mensagem: 'msg' },
  agendamento_cacau: { nome: 'nome',    telefone: 'telefone', mensagem: 'observacoes' },
}

export const ASSUNTO: Record<TipoFormulario, (d: Record<string, string>) => string> = {
  cooperado:         (d) => `Novo Cooperado — ${d.nome ?? ''}`,
  parceria:          (d) => `Interesse em Parceria — ${d.cota ?? ''} — ${d.empresa ?? ''}`,
  agendamento_cacau: (d) => `Agendamento de entrega de cacau — ${d.nome ?? ''}`,
}

export const TITULO: Record<TipoFormulario, string> = {
  cooperado:         'NOVA SOLICITAÇÃO DE ADESÃO — COOPAIBI',
  parceria:          'NOVO INTERESSE DE PARCERIA — PROJETO CACAU QUE REFLORESTA',
  agendamento_cacau: 'NOVO AGENDAMENTO DE ENTREGA DE CACAU',
}

// Rótulos legíveis no e-mail, no lugar dos nomes crus dos campos do HTML.
export const ROTULOS: Record<string, string> = {
  nome: 'Nome completo', cpf: 'CPF / CNPJ', tel: 'Telefone/WhatsApp',
  telefone: 'Telefone/WhatsApp', email: 'E-mail', local: 'Localidade',
  area: 'Área disponível', perfil: 'Perfil', ativ: 'Atividade', msg: 'Mensagem',
  empresa: 'Empresa / Instituição', contato: 'Nome do contato', cargo: 'Cargo / Função',
  cota: 'Cota de interesse', segmento: 'Segmento de atuação',
  municipio: 'Município', quantidade: 'Quantidade estimada',
  data_preferencial: 'Data preferencial', cooperado: 'É cooperado?',
  observacoes: 'Observações',
}

// Limite por campo. O PHP não tinha nenhum: um POST com megabytes num campo
// entrava inteiro no corpo do e-mail. Aqui o excedente é cortado.
export const LIMITE_CAMPO = 2000

/**
 * Higieniza um valor vindo do formulário: remove tags (o corpo do e-mail é
 * montado com o texto do visitante), apara e corta no limite.
 */
export function limpar(v: unknown): string {
  return String(v ?? '')
    .replace(/<[^>]*>/g, '')
    .trim()
    .slice(0, LIMITE_CAMPO)
}

/**
 * `enviarEmail` só manda HTML. O corpo continua sendo o texto alinhado do
 * PHP original, embrulhado em <pre> — por isso o escape: o valor já vem sem
 * tags por `limpar`, mas & e < de um campo qualquer quebrariam a renderização.
 */
export function escaparHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/** Aplica `limpar` em tudo e descarta o que ficou vazio. */
export function limparCampos(bruto: Record<string, unknown>): Record<string, string> {
  const dados: Record<string, string> = {}
  for (const [k, v] of Object.entries(bruto)) {
    const limpo = limpar(v)
    if (limpo) dados[k] = limpo
  }
  return dados
}

/**
 * Separa os campos já limpos nas colunas de `site_leads`. `nome` é o único
 * obrigatório — sem ele não há a quem responder, e o PHP também recusava.
 */
export function montarLead(
  tipo: TipoFormulario,
  dados: Record<string, string>
): { nome: string; email: string | null; telefone: string | null; mensagem: string | null } | null {
  const mapa = MAPA_CAMPOS[tipo]
  const nome = dados[mapa.nome]
  if (!nome) return null
  return {
    nome,
    email:    mapa.email    ? dados[mapa.email]    ?? null : null,
    telefone: mapa.telefone ? dados[mapa.telefone] ?? null : null,
    mensagem: mapa.mensagem ? dados[mapa.mensagem] ?? null : null,
  }
}

/** Corpo do e-mail de aviso, no mesmo formato alinhado que o PHP mandava. */
export function montarCorpoEmail(
  tipo: TipoFormulario,
  dados: Record<string, string>,
  ip?: string
): string {
  const linhas = Object.entries(dados)
    .map(([k, v]) => `${(ROTULOS[k] ?? k).padEnd(22)}: ${v}`)
    .join('\n')
  return [
    TITULO[tipo],
    '='.repeat(55),
    '',
    linhas,
    '',
    '-'.repeat(55),
    `Enviado em: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Bahia' })}`,
    ip ? `IP: ${ip}` : '',
    '',
    'Este contato também foi registrado no NexCoop.',
  ].join('\n')
}
