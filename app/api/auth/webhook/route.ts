import { NextRequest, NextResponse } from 'next/server'
import { registrarLog } from '@/lib/audit/logger'

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()
    const { event, user } = payload

    if (!['SIGNED_IN', 'SIGNED_OUT'].includes(event)) {
      return NextResponse.json({ ok: true })
    }

    await registrarLog({
      usuario_id: user?.id || null,
      usuario_email: user?.email || null,
      acao: event === 'SIGNED_IN' ? 'login' : 'logout',
      modulo: 'auth',
      descricao: event === 'SIGNED_IN'
        ? `Login realizado: ${user?.email}`
        : `Logout: ${user?.email}`,
    })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
