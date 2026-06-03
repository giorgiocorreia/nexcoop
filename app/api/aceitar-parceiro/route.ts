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

    // Salvar nome na tabela usuarios
    const { data: profData } = await supabase
      .from('profissionais_parceiros')
      .select('nome, email')
      .eq('id', prof.id)
      .single()

    const { data: usuarioExistente } = await supabase
      .from('usuarios')
      .select('id')
      .eq('id', userId)
      .maybeSingle()

    if (!usuarioExistente) {
      await supabase.from('usuarios').insert({
        id: userId,
        email: email,
        nome_completo: profData?.nome || email,
        role: 'parceiro',
        ativo: true,
      })
    } else {
      await supabase.from('usuarios').update({
        nome_completo: profData?.nome || email,
      }).eq('id', userId)
    }

    return NextResponse.json({ isParceiro: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { nome, cargo, crc, userId } = await request.json()

    if (!userId || !nome) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    await supabase
      .from('profissionais_parceiros')
      .update({ nome, cargo, crc })
      .eq('usuario_id', userId)

    await supabase
      .from('usuarios')
      .update({ nome_completo: nome })
      .eq('id', userId)

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
