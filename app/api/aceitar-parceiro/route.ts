import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const { userId, email } = await request.json()
    const supabase = createAdminClient()

    const { data: prof } = await supabase
      .from('profissionais_parceiros')
      .select('id, empresa_id')
      .eq('email', email)
      .is('aceito_em', null)
      .maybeSingle()

    if (!prof) {
      return NextResponse.json({ isParceiro: false })
    }

    await supabase
      .from('profissionais_parceiros')
      .update({ usuario_id: userId, aceito_em: new Date().toISOString() })
      .eq('id', prof.id)

    await supabase
      .from('empresas_parceiras')
      .update({ status: 'ativo', aceito_em: new Date().toISOString() })
      .eq('id', prof.empresa_id)

    return NextResponse.json({ isParceiro: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
