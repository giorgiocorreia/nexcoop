import { createAdminClient } from '@/lib/supabase/admin'
import { enviarEmail, smtpConfigured } from '@/lib/email'

// Formulários do site — substituem os enviar-*.php que rodavam no cPanel.
//
// Diferença de comportamento em relação ao PHP: além de enviar o e-mail,
// o lead é GRAVADO em `site_leads`. No cPanel ele virava só uma mensagem em
// contato@coopaibi.com.br e morria na caixa de entrada; ninguém conseguia
// dizer quantos interessados chegaram no mês nem quais foram respondidos.
//
// A gravação vem primeiro e o e-mail depois, de propósito: se o SMTP
// falhar, o lead já está salvo e a pessoa não precisa preencher de novo.
// O caminho inverso perderia o contato justamente quando o e-mail falha.

export type TipoFormulario = 'cooperado' | 'parceria' | 'agendamento_cacau'

// Campos que viram coluna, por formulário. O resto vai para `dados`.
const MAPA_CAMPOS: Record<TipoFormulario, { nome: string; email?: string; telefone?: string; mensagem?: string }> = {
  cooperado:         { nome: 'nome',    email: 'email', telefone: 'tel', mensagem: 'msg' },
  parceria:          { nome: 'contato', email: 'email', telefone: 'tel', mensagem: 'msg' },
  agendamento_cacau: { nome: 'nome',    telefone: 'telefone', mensagem: 'observacoes' },
}

const ASSUNTO: Record<TipoFormulario, (d: Record<string, string>) => string> = {
  cooperado:         (d) => `Novo Cooperado — ${d.nome ?? ''}`,
  parceria:          (d) => `Interesse em Parceria — ${d.cota ?? ''} — ${d.empresa ?? ''}`,
  agendamento_cacau: (d) => `Agendamento de entrega de cacau — ${d.nome ?? ''}`,
}

const TITULO: Record<TipoFormulario, string> = {
  cooperado:         'NOVA SOLICITAÇÃO DE ADESÃO — COOPAIBI',
  parceria:          'NOVO INTERESSE DE PARCERIA — PROJETO CACAU QUE REFLORESTA',
  agendamento_cacau: 'NOVO AGENDAMENTO DE ENTREGA DE CACAU',
}

// Rótulos legíveis no e-mail, no lugar dos nomes crus dos campos do HTML.
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

// Limite por campo. O PHP não tinha nenhum: um POST com megabytes num campo
// entrava inteiro no corpo do e-mail. Aqui o excedente é cortado.
const LIMITE_CAMPO = 2000

// `enviarEmail` só manda HTML. O corpo continua sendo o texto alinhado do
// PHP original (mais legível pra quem lê o aviso), embrulhado em <pre> —
// por isso o escape: o valor já vem sem tags por `limpar`, mas & e < de um
// campo qualquer quebrariam a renderização.
function escaparHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function limpar(v: unknown): string {
  return String(v ?? '')
    .replace(/<[^>]*>/g, '')
    .trim()
    .slice(0, LIMITE_CAMPO)
}

export interface ResultadoFormulario {
  ok: boolean
  erro?: string
}

export async function registrarLead(
  orgId: string,
  tipo: TipoFormulario,
  bruto: Record<string, string>,
  contexto: { origem?: string; ip?: string; userAgent?: string },
  emailDestino: string
): Promise<ResultadoFormulario> {
  const dados: Record<string, string> = {}
  for (const [k, v] of Object.entries(bruto)) {
    const limpo = limpar(v)
    if (limpo) dados[k] = limpo
  }

  const mapa = MAPA_CAMPOS[tipo]
  const nome = dados[mapa.nome]
  if (!nome) return { ok: false, erro: 'Preencha todos os campos obrigatórios.' }

  const supabase = createAdminClient()
  const { error } = await supabase.from('site_leads').insert({
    organizacao_id: orgId,
    tipo,
    nome,
    email:    mapa.email    ? dados[mapa.email]    ?? null : null,
    telefone: mapa.telefone ? dados[mapa.telefone] ?? null : null,
    mensagem: mapa.mensagem ? dados[mapa.mensagem] ?? null : null,
    dados,
    origem:     contexto.origem ?? null,
    ip:         contexto.ip ?? null,
    user_agent: contexto.userAgent ?? null,
  })

  if (error) {
    console.error('[site_leads] falha ao gravar lead', { tipo, erro: error.message })
    return { ok: false, erro: 'Não foi possível registrar seu contato. Tente novamente.' }
  }

  // E-mail é notificação, não o registro: se falhar, o lead já está salvo e
  // a pessoa não é mandada preencher de novo. A falha fica no log para a
  // org perceber que parou de receber aviso.
  if (smtpConfigured()) {
    const linhas = Object.entries(dados)
      .map(([k, v]) => `${(ROTULOS[k] ?? k).padEnd(22)}: ${v}`)
      .join('\n')
    const corpo = [
      TITULO[tipo],
      '='.repeat(55),
      '',
      linhas,
      '',
      '-'.repeat(55),
      `Enviado em: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Bahia' })}`,
      contexto.ip ? `IP: ${contexto.ip}` : '',
      '',
      'Este contato também foi registrado no NexCoop.',
    ].join('\n')

    try {
      await enviarEmail({
        to: emailDestino,
        subject: ASSUNTO[tipo](dados),
        html: `<pre style="font-family:monospace;font-size:14px">${escaparHtml(corpo)}</pre>`,
      })
    } catch (e) {
      console.error('[site_leads] lead gravado, mas e-mail falhou', e)
    }
  }

  return { ok: true }
}

// Aceita tanto multipart/FormData (cooperado e parceria usam fetch com
// FormData) quanto urlencoded (o agendamento de cacau é <form method=POST>
// nativo). Os dois contratos vêm do HTML original e não vou tocá-lo.
export async function lerCampos(request: Request): Promise<Record<string, string>> {
  const form = await request.formData()
  const campos: Record<string, string> = {}
  // `forEach` em vez de `entries()`: o tsconfig usa lib "DOM" sem
  // "DOM.Iterable", então iterar o FormData não compila.
  form.forEach((v, k) => {
    if (typeof v === 'string') campos[k] = v
  })
  return campos
}
