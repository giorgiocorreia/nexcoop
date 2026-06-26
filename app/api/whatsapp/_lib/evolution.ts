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
  console.log('[Evolution] status:', response.status, 'body:', JSON.stringify(responseBody))
}

export async function configurarWebhook(webhookUrl: string): Promise<void> {
  const url = `${EVOLUTION_API_URL}/webhook/set/${EVOLUTION_INSTANCE_NAME}`

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
      },
    }),
  })
}
