import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { profissionalId, nome, cargo, crc, nivel } = await request.json()

    const { error } = await supabase
      .from('profissionais_parceiros')
      .update({ nome, cargo, crc, nivel })
      .eq('id', profissionalId)

    if (error) throw new Error(error.message)
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
