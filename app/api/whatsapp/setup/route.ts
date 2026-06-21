import { NextResponse } from 'next/server'
import { configurarWebhook } from '../_lib/evolution'

// Rota para configurar o webhook na Evolution API (chamar uma vez após deploy)
export async function POST() {
  try {
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/whatsapp/webhook`
    await configurarWebhook(webhookUrl)
    return NextResponse.json({ ok: true, webhookUrl })
  } catch (error) {
    console.error('[WhatsApp Setup] Erro:', error)
    return NextResponse.json({ error: 'Erro ao configurar webhook' }, { status: 500 })
  }
}
