const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL!
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY!
const EVOLUTION_INSTANCE_NAME = process.env.EVOLUTION_INSTANCE_NAME!

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Antes não checava response.ok — falha de envio virava só um log que ninguém
// lia, e o cooperado ficava sem resposta sem ninguém saber. Retry com backoff
// cobre falha transitória (rede, 5xx); erro 4xx (número inválido etc) não
// adianta retentar, loga e desiste. Nunca lança — o webhook não trata falha
// de envio, então lançar quebraria o fluxo; loga alto o suficiente pra
// aparecer nos logs do Vercel. Não logar telefone + texto juntos (PII).
async function enviarTextoUnico(telefone: string, texto: string, tentativa = 1): Promise<void> {
  const url = `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE_NAME}`
  const MAX_TENTATIVAS = 3

  let response: Response
  try {
    response = await fetch(url, {
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
  } catch (err) {
    console.error(`[Evolution] Falha de rede no envio (tentativa ${tentativa}/${MAX_TENTATIVAS}):`, err)
    if (tentativa < MAX_TENTATIVAS) {
      await sleep(tentativa * 800)
      return enviarTextoUnico(telefone, texto, tentativa + 1)
    }
    console.error('[Evolution] Envio desistido após falhas de rede repetidas — mensagem NÃO entregue')
    return
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const responseBody: any = await response.json().catch(() => null)
  void responseBody
  // Não logar o corpo completo — pode ecoar telefone/texto da mensagem enviada (PII)

  // 5xx é falha do lado da Evolution, vale retentar. 4xx (número inválido,
  // instância desconectada etc) não melhora tentando de novo.
  if (!response.ok && response.status >= 500 && tentativa < MAX_TENTATIVAS) {
    await sleep(tentativa * 800)
    return enviarTextoUnico(telefone, texto, tentativa + 1)
  }
  if (!response.ok) {
    console.error('[Evolution] Envio falhou (não retentável ou tentativas esgotadas), status:', response.status)
    return
  }
}

// "Digitando..." — best-effort, nunca derruba o fluxo se a Evolution recusar
// ou falhar a presença. Chamado antes de cada parte do envio, pra cobrir o
// intervalo entre mensagens quebradas em parágrafo.
export async function enviarPresencaComposing(telefone: string): Promise<void> {
  try {
    await fetch(`${EVOLUTION_API_URL}/chat/sendPresence/${EVOLUTION_INSTANCE_NAME}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY,
      },
      body: JSON.stringify({ number: telefone, presence: 'composing', delay: 8000 }),
    })
  } catch (err) {
    console.error('[Evolution] Falha ao enviar presença "digitando":', err)
  }
}

// Tempo de "digitação" humano pro texto: proporcional ao tamanho, com jitter
// de ±30% pra nunca ser constante. Resposta instantânea e intervalos fixos
// são assinatura de bot pros classificadores do WhatsApp.
function tempoDigitacaoMs(texto: string): number {
  const base = 900 + texto.length * 35
  const comTeto = Math.min(base, 6000)
  const jitter = 0.7 + Math.random() * 0.6
  return Math.round(comTeto * jitter)
}

// Gente de verdade manda várias mensagens curtas no WhatsApp, não um texto só
// com linha em branco no meio (isso lê como e-mail formatado, não conversa).
// Quebra em parágrafos (linha em branco) e manda cada um como mensagem
// separada, "digitando" antes de cada uma por um tempo proporcional ao texto.
// Travessão/meia-risca nunca saem pro WhatsApp — ninguém escreve assim, entrega
// o tom de IA. Proibição absoluta se garante em código, no ponto único de
// saída, não em instrução probabilística no prompt.
function removerTravessao(texto: string): string {
  return texto.replace(/\s*[—–]\s*/g, ', ')
}

export async function enviarMensagem(telefone: string, texto: string): Promise<void> {
  const partes = removerTravessao(texto).split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)
  if (partes.length === 0) return

  for (let i = 0; i < partes.length; i++) {
    await enviarPresencaComposing(telefone)
    await sleep(tempoDigitacaoMs(partes[i]))
    await enviarTextoUnico(telefone, partes[i])
    if (i < partes.length - 1) await sleep(1000 + Math.random() * 2000)
  }
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
