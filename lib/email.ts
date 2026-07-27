import nodemailer from 'nodemailer'
import type SMTPTransport from 'nodemailer/lib/smtp-transport'

/**
 * SMTP via Zoho (ou host customizado).
 *
 * Env:
 *  - SMTP_USER  — e-mail completo (ex.: suporte@nexcoop.com.br)
 *  - SMTP_PASS  — senha do e-mail ou App Password do Zoho (se 2FA)
 *  - SMTP_HOST  — opcional; default: smtppro.zoho.com (conta org/domínio próprio)
 *                 alternativas: smtp.zoho.com | smtp.zoho.com.br | smtppro.zoho.com.br
 *  - SMTP_PORT  — opcional; default 465
 *  - SMTP_SECURE — opcional; default true (SSL). Use false com porta 587 (STARTTLS)
 *  - SMTP_FROM  — opcional; default = SMTP_USER
 *
 * Contas Zoho Mail com domínio próprio costumam exigir smtppro.zoho.com, não smtp.zoho.com.
 */

function envBool(v: string | undefined, defaultValue: boolean): boolean {
  if (v === undefined || v === '') return defaultValue
  return !['0', 'false', 'no', 'off'].includes(v.toLowerCase())
}

export function getSmtpConfig(): {
  host: string
  port: number
  secure: boolean
  user: string
  pass: string
  from: string
} {
  const user = (process.env.SMTP_USER ?? '').trim()
  const pass = (process.env.SMTP_PASS ?? '').trim()
  const host = (process.env.SMTP_HOST ?? 'smtppro.zoho.com').trim()
  const port = Number(process.env.SMTP_PORT ?? '465') || 465
  // Porta 465 = SSL implícito; 587 = STARTTLS
  const secure = envBool(process.env.SMTP_SECURE, port === 465)
  const from = (process.env.SMTP_FROM ?? (user || 'suporte@nexcoop.com.br')).trim()
  return { host, port, secure, user, pass, from }
}

export function smtpConfigured(): boolean {
  const { user, pass } = getSmtpConfig()
  return Boolean(user && pass)
}

function getTransporter() {
  const { host, port, secure, user, pass } = getSmtpConfig()
  if (!user || !pass) {
    throw new Error('SMTP não configurado: defina SMTP_USER e SMTP_PASS no ambiente.')
  }
  const options: SMTPTransport.Options = {
    host,
    port,
    secure,
    auth: { user, pass },
    // Zoho costuma recusar se o hostname não bater; connectionTimeout evita hang
    connectionTimeout: 20_000,
    greetingTimeout: 20_000,
    socketTimeout: 30_000,
  }
  // Porta 587: STARTTLS explícito
  if (!secure && port === 587) {
    options.requireTLS = true
  }
  return nodemailer.createTransport(options)
}

export function formatSmtpError(err: unknown): string {
  const e = err as {
    message?: string
    code?: string
    response?: string
    responseCode?: number
    command?: string
  }
  const msg = e?.message ?? String(err)
  const code = e?.code ?? ''
  const responseCode = e?.responseCode
  const response = e?.response ?? ''

  if (code === 'EAUTH' || /auth|invalid login|authentication failed|535/i.test(msg + response)) {
    const { host, user } = getSmtpConfig()
    return [
      'Falha de autenticação SMTP.',
      `Host: ${host} · Usuário: ${user || '(vazio)'}.`,
      'No Zoho Mail (domínio próprio) use smtppro.zoho.com e senha de app se houver 2FA.',
      'Atualize SMTP_USER/SMTP_PASS (e opcionalmente SMTP_HOST) na Vercel → Production.',
    ].join(' ')
  }
  if (code === 'ESOCKET' || code === 'ECONNECTION' || /ENOTFOUND|ECONNREFUSED|ETIMEDOUT|certificate/i.test(msg)) {
    const { host, port } = getSmtpConfig()
    return `Falha de conexão SMTP com ${host}:${port} (${code || 'rede'}). ${msg}`
  }
  if (responseCode) {
    return `SMTP ${responseCode}: ${response || msg}`
  }
  return msg
}

export async function enviarEmail({
  to,
  subject,
  html,
  attachments,
}: {
  to: string
  subject: string
  html: string
  attachments?: { filename: string; content: Buffer }[]
}): Promise<void> {
  const { from } = getSmtpConfig()
  const transporter = getTransporter()
  try {
    await transporter.sendMail({
      from: `"NexCoop" <${from}>`,
      to,
      subject,
      html,
      attachments,
    })
  } catch (err) {
    throw new Error(formatSmtpError(err))
  }
}

/** Testa login SMTP (útil em script/diagnóstico). Não envia e-mail. */
export async function verificarSmtp(): Promise<{ ok: boolean; detalhe: string }> {
  if (!smtpConfigured()) {
    return { ok: false, detalhe: 'SMTP_USER ou SMTP_PASS ausentes' }
  }
  const { host, port, user } = getSmtpConfig()
  try {
    await getTransporter().verify()
    return { ok: true, detalhe: `OK em ${host}:${port} como ${user}` }
  } catch (err) {
    return { ok: false, detalhe: formatSmtpError(err) }
  }
}
