import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { empresaId, razao_social, cnpj, email_contato, telefone, cidade, estado, site } = await request.json()

    const { error } = await supabase
      .from('empresas_parceiras')
      .update({ razao_social, cnpj, email_contato, telefone, cidade, estado, site })
      .eq('id', empresaId)

    if (error) throw new Error(error.message)
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
