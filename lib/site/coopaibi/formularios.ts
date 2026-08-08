import { createAdminClient } from '@/lib/supabase/admin'
import { enviarEmail, smtpConfigured } from '@/lib/email'
import {
  MAPA_CAMPOS, ASSUNTO, escaparHtml, limparCampos, montarLead, montarCorpoEmail,
  type TipoFormulario,
} from './formularios-utils'

// Formulários do site — substituem os enviar-*.php que rodavam no cPanel.
//
// Este arquivo é a parte com I/O (banco + SMTP). O que é decisão pura —
// qual campo vira coluna, higienização, montagem do corpo do e-mail — está
// em `formularios-utils.ts`, que é onde a suíte de testes bate (regra 5 do
// CLAUDE.md).
//
// Diferença de comportamento em relação ao PHP: além de enviar o e-mail,
// o lead é GRAVADO em `site_leads`. No cPanel ele virava só uma mensagem em
// contato@coopaibi.com.br e morria na caixa de entrada; ninguém conseguia
// dizer quantos interessados chegaram no mês nem quais foram respondidos.
//
// A gravação vem primeiro e o e-mail depois, de propósito: se o SMTP
// falhar, o lead já está salvo e a pessoa não precisa preencher de novo.
// O caminho inverso perderia o contato justamente quando o e-mail falha.

export type { TipoFormulario }

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
  const dados = limparCampos(bruto)

  const colunas = montarLead(tipo, dados)
  if (!colunas) return { ok: false, erro: 'Preencha todos os campos obrigatórios.' }

  const supabase = createAdminClient()
  const { error } = await supabase.from('site_leads').insert({
    organizacao_id: orgId,
    tipo,
    ...colunas,
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
    const corpo = montarCorpoEmail(tipo, dados, contexto.ip)
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

// Reexportado porque a rota valida o tipo antes de chamar registrarLead.
export { MAPA_CAMPOS }
