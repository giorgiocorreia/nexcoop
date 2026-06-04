import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/supabase/impersonation'

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('role')
      .eq('id', user.id)
      .single()

    if (usuario?.role === 'parceiro') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const ctx = await getOrgContext()
    if (!ctx) return NextResponse.json({ error: 'Org não encontrada' }, { status: 404 })

    const admin = createAdminClient()
    const dados = await request.json()

    const { error } = await admin
      .from('organizacoes')
      .update(dados)
      .eq('id', ctx.orgId)

    if (error) throw new Error(error.message)
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
