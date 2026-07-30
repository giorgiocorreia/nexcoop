import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { enviarCartaCorrecaoEmail } from '@/lib/comercializacao/cce-email'

/**
 * Envia a CC-e por e-mail — rota HTTP estável (não depende de hash de Server
 * Action, que quebra na página aberta durante um deploy; mesmo motivo do
 * /api/comercializacao/lote-zip).
 *
 * POST body:
 *  - eventoId: string  (id em nfe_eventos)
 *  - email?: string    (sobrepõe o e-mail cadastrado do comprador)
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ sucesso: false, erro: 'Não autenticado' }, { status: 401 })
    }

    const admin = createAdminClient()
    const { data: usuario } = await admin
      .from('usuarios')
      .select('organizacao_id')
      .eq('id', user.id)
      .single()

    if (!usuario?.organizacao_id) {
      return NextResponse.json({ sucesso: false, erro: 'Não autenticado' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const eventoId = typeof body.eventoId === 'string' ? body.eventoId : ''
    const email = typeof body.email === 'string' ? body.email.trim() : ''

    if (!eventoId) {
      return NextResponse.json({ sucesso: false, erro: 'eventoId obrigatório' }, { status: 400 })
    }

    // A checagem de org vive dentro de enviarCartaCorrecaoEmail: o evento é
    // buscado filtrando por organizacao_id, então carta de outra org nao existe.
    const res = await enviarCartaCorrecaoEmail({
      eventoId,
      organizacaoId: usuario.organizacao_id as string,
      emailOverride: email || undefined,
    })

    return NextResponse.json(res, { status: res.sucesso ? 200 : 400 })
  } catch (e: any) {
    console.error('[api/cce-email]', e)
    return NextResponse.json(
      { sucesso: false, erro: e?.message ?? 'Erro ao enviar a carta por e-mail' },
      { status: 500 }
    )
  }
}
