import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { registrarLog } from '@/lib/audit/logger'

export async function POST(request: NextRequest) {
  try {
    const { orgId } = await request.json()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const admin = createAdminClient()

    const { data: vinculo } = await admin
      .from('profissionais_parceiros')
      .select('empresa:empresa_id(org_id, status, modulos_acesso)')
      .eq('usuario_id', user.id)
      .eq('ativo', true)

    const temAcesso = vinculo?.some((v: any) =>
      v.empresa?.org_id === orgId &&
      v.empresa?.status === 'ativo' &&
      v.empresa?.modulos_acesso?.includes('contabil')
    )

    if (!temAcesso) {
      return NextResponse.json({ error: 'Sem acesso a esta organização' }, { status: 403 })
    }

    const cookieStore = await cookies()
    cookieStore.set('parceiro_org_id', orgId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8,
      path: '/',
    })

    const { data: orgData } = await admin.from('organizacoes').select('nome').eq('id', orgId).single()
    registrarLog({
      usuario_id: user.id,
      usuario_email: user.email,
      org_id: orgId,
      acao: 'acessar_org',
      modulo: 'parceiro',
      descricao: `Contador acessou a organização ${orgData?.nome ?? orgId}`,
    }).catch(e => console.error('[audit]', e))

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest) {
  const cookieStore = await cookies()
  cookieStore.delete('parceiro_org_id')
  return NextResponse.json({ ok: true })
}
