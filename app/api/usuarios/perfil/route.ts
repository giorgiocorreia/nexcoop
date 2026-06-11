import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const admin = createAdminClient()
    const { nome_completo, telefone, cpf, endereco, municipio } = await request.json()

    const { error } = await admin
      .from('usuarios')
      .update({
        nome_completo: nome_completo?.trim() || undefined,
        telefone: telefone || null,
        cpf: cpf || null,
        endereco: endereco || null,
        municipio: municipio || null,
      })
      .eq('id', user.id)

    if (error) throw new Error(error.message)
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
