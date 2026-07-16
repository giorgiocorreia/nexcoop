import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { enviarMensagem } from '../_lib/evolution'
import { buscarOuCriarSessao, adicionarMensagemHistorico, atualizarSessao } from '../_lib/session'
import { gerarResposta } from '../_lib/agent'

const NUMERO_GIORGIO = '5573999693548'

let avisouEnvAusente = false

/**
 * Valida que o POST veio realmente da Evolution API, comparando o header
 * `x-webhook-secret` (configurado no painel da Evolution ao registrar o webhook)
 * com EVOLUTION_WEBHOOK_SECRET em tempo constante — evita timing attack e evita
 * que qualquer terceiro injete mensagens no fluxo da Mariana.
 * Fail-closed: sem a env definida, rejeita tudo (não existe um "modo aberto" seguro).
 */
function origemValida(request: NextRequest): boolean {
  const secretEsperado = process.env.EVOLUTION_WEBHOOK_SECRET
  if (!secretEsperado) {
    if (!avisouEnvAusente) {
      console.warn('[whatsapp] EVOLUTION_WEBHOOK_SECRET não configurado — rejeitando webhooks (fail-closed)')
      avisouEnvAusente = true
    }
    return false
  }

  const recebido = request.headers.get('x-webhook-secret') ?? ''
  const bufEsperado = Buffer.from(secretEsperado)
  const bufRecebido = Buffer.from(recebido)

  // timingSafeEqual exige buffers do mesmo tamanho — se o tamanho já difere, é inválido
  if (bufEsperado.length !== bufRecebido.length) return false

  return timingSafeEqual(bufEsperado, bufRecebido)
}

export async function POST(request: NextRequest) {
  try {
    if (!origemValida(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Filtra apenas mensagens recebidas (não enviadas pelo bot)
    const evento = body?.event
    if (evento !== 'messages.upsert') {
      return NextResponse.json({ ok: true })
    }

    const mensagem = body?.data
    if (!mensagem) return NextResponse.json({ ok: true })

    // Ignora mensagens do próprio bot
    if (mensagem.key?.fromMe) return NextResponse.json({ ok: true })

    // Ignora mensagens de grupos
    if (mensagem.key?.remoteJid?.includes('@g.us')) return NextResponse.json({ ok: true })

    // Extrai dados da mensagem
    const telefone = mensagem.key?.remoteJid?.replace('@s.whatsapp.net', '') || ''
    const texto = mensagem.message?.conversation ||
                  mensagem.message?.extendedTextMessage?.text ||
                  ''
    const nomeContato = mensagem.pushName || null

    if (!telefone || !texto.trim()) return NextResponse.json({ ok: true })

    // Busca ou cria sessão
    const sessao = await buscarOuCriarSessao(telefone, nomeContato)
    console.log('[whatsapp] evento recebido: messages.upsert, estado:', sessao?.estado)

    // Se já foi transferido, não responde automaticamente
    if (sessao.estado === 'transferido') {
      return NextResponse.json({ ok: true })
    }

    // Atualiza nome se disponível
    if (nomeContato && !sessao.nome) {
      await atualizarSessao(telefone, { nome: nomeContato })
    }

    // Adiciona mensagem do usuário ao histórico
    const historicoAtualizado = await adicionarMensagemHistorico(sessao, 'user', texto)

    // Gera resposta com o Nex
    const { resposta, transferir } = await gerarResposta(
      historicoAtualizado.slice(0, -1), // histórico sem a última (já é a mensagem atual)
      texto
    )

    // Envia resposta
    await enviarMensagem(telefone, resposta)

    // Adiciona resposta ao histórico
    await adicionarMensagemHistorico(
      { ...sessao, historico: historicoAtualizado },
      'assistant',
      resposta
    )

    // Se precisa transferir
    if (transferir) {
      await atualizarSessao(telefone, {
        estado: 'transferido',
        transferido_em: new Date().toISOString(),
      })

      const nomeDisplay = nomeContato || telefone
      await enviarMensagem(
        NUMERO_GIORGIO,
        `🔔 *Lead para atendimento humano*\n\n*Nome:* ${nomeDisplay}\n*Telefone:* ${telefone}\n*Última mensagem:* "${texto}"\n\nAcesse a conversa no WhatsApp.`
      )
    }

    return NextResponse.json({ ok: true })

  } catch (error) {
    console.error('[WhatsApp Webhook] Erro:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'WhatsApp webhook ativo' })
}
