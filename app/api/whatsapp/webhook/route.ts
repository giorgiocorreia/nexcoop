import { NextRequest, NextResponse } from 'next/server'
import { enviarMensagem } from '../_lib/evolution'
import { buscarOuCriarSessao, adicionarMensagemHistorico, atualizarSessao } from '../_lib/session'
import { gerarResposta } from '../_lib/agent'

const NUMERO_GIORGIO = '5573999693548'

export async function POST(request: NextRequest) {
  try {
    const headersObj: Record<string, string> = {}
    request.headers.forEach((value, key) => { headersObj[key] = value })
    console.log('[Headers]', headersObj)

    const body = await request.json()
    console.log('[Webhook] body completo:', JSON.stringify(body).slice(0, 500))

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

    console.log('[Webhook] telefone:', telefone, 'texto:', texto)

    if (!telefone || !texto.trim()) return NextResponse.json({ ok: true })

    // Busca ou cria sessão
    const sessao = await buscarOuCriarSessao(telefone, nomeContato)
    console.log('[Webhook] sessao:', sessao?.estado)

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
    console.log('[Webhook] resposta gerada:', resposta?.slice(0, 50))

    // Envia resposta
    await enviarMensagem(telefone, resposta)
    console.log('[Webhook] mensagem enviada')

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
