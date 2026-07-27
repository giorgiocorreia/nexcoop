import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { gerarZipLote, gerarZipEEnviarEmail } from '@/lib/comercializacao/zip-lote'

/**
 * ZIP fiscal do lote — rota HTTP estável (não depende de hash de Server Action).
 *
 * POST body:
 *  - loteId: string
 *  - modo: 'download' | 'email'
 *  - email?: string  (obrigatório se modo=email)
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
    const loteId = typeof body.loteId === 'string' ? body.loteId : ''
    const modo = body.modo === 'email' ? 'email' : 'download'
    const email = typeof body.email === 'string' ? body.email.trim() : ''

    if (!loteId) {
      return NextResponse.json({ sucesso: false, erro: 'loteId obrigatório' }, { status: 400 })
    }

    // Garante que o lote pertence à org do usuário
    const { data: lote } = await admin
      .from('lotes')
      .select('id, organizacao_id')
      .eq('id', loteId)
      .eq('organizacao_id', usuario.organizacao_id)
      .maybeSingle()

    if (!lote) {
      return NextResponse.json({ sucesso: false, erro: 'Lote não encontrado' }, { status: 404 })
    }

    if (modo === 'email') {
      if (!email || !email.includes('@')) {
        return NextResponse.json({ sucesso: false, erro: 'E-mail do destinatário inválido' }, { status: 400 })
      }
      const res = await gerarZipEEnviarEmail(loteId, email)
      const status = res.sucesso ? 200 : 400
      return NextResponse.json(res, { status })
    }

    const res = await gerarZipLote(loteId)
    const status = res.sucesso ? 200 : 400
    return NextResponse.json(res, { status })
  } catch (e: any) {
    console.error('[api/lote-zip]', e)
    return NextResponse.json(
      { sucesso: false, erro: e?.message ?? 'Erro ao processar ZIP do lote' },
      { status: 500 }
    )
  }
}
