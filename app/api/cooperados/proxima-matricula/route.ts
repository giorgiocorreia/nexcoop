import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const org = req.nextUrl.searchParams.get('org')
  if (!org) return NextResponse.json({ error: 'org required' }, { status: 400 })

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('cooperados')
    .select('numero_matricula')
    .eq('organizacao_id', org)
    .not('numero_matricula', 'is', null)
    .order('numero_matricula', { ascending: false })
    .limit(1)
    .maybeSingle()

  const ano = new Date().getFullYear().toString().slice(-2)
  let proximoSeq = 1
  if (data?.numero_matricula) {
    const seq = parseInt((data.numero_matricula as string).slice(-4), 10)
    if (!isNaN(seq)) proximoSeq = seq + 1
  }
  const matricula = `${ano}${String(proximoSeq).padStart(4, '0')}`
  return NextResponse.json({ matricula })
}
