import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET() {
  const secret = process.env.CRON_SECRET ?? ''
  return NextResponse.json({
    cron_secret_length: secret.length,
    cron_secret_first_char: secret.length > 0 ? secret[0] : null,
    cron_secret_last_char: secret.length > 0 ? secret[secret.length - 1] : null,
    cron_secret_has_whitespace: /\s/.test(secret),
  })
}
