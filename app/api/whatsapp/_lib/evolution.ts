const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL!
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY!
const EVOLUTION_INSTANCE_NAME = process.env.EVOLUTION_INSTANCE_NAME!

export async function enviarMensagem(telefone: string, texto: string): Promise<void> {
  const url = `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE_NAME}`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': EVOLUTION_API_KEY,
    },
    body: JSON.stringify({
      number: telefone,
      text: texto,
    }),
  })
  const responseBody = await response.json()
  // Não logar o corpo completo — pode ecoar telefone/texto da mensagem enviada (PII)
  if (!response.ok) {
    console.error('[Evolution] falha ao enviar mensagem, status:', response.status)
  }
  void responseBody
}

export async function configurarWebhook(webhookUrl: string): Promise<void> {
  const url = `${EVOLUTION_API_URL}/webhook/set/${EVOLUTION_INSTANCE_NAME}`

  // Envia EVOLUTION_WEBHOOK_SECRET como header custom — a Evolution API repassa esse
  // header em toda chamada ao nosso webhook, permitindo validar a origem no route.ts.
  // Se a versão da Evolution instalada não suportar "headers" na config do webhook,
  // configure manualmente no painel (ver PENDENCIAS.md).
  const webhookSecret = process.env.EVOLUTION_WEBHOOK_SECRET

  await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': EVOLUTION_API_KEY,
    },
    body: JSON.stringify({
      webhook: {
        enabled: true,
        url: webhookUrl,
        webhookByEvents: false,
        webhookBase64: false,
        events: ['MESSAGES_UPSERT'],
        ...(webhookSecret ? { headers: { 'x-webhook-secret': webhookSecret } } : {}),
      },
    }),
  })
}
