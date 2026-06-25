import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { atualizarIndiceNex } from '@/lib/dashboard/indice-nex.actions'

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const supabase = createAdminClient()
  const { data: orgs } = await supabase
    .from('organizacoes')
    .select('id')
    .eq('tipo', 'cooperativa')

  const resultados = []
  for (const org of orgs ?? []) {
    try {
      const scores = await atualizarIndiceNex(org.id)
      resultados.push({ org: org.id, ok: true, score: scores.score_final })
    } catch (e) {
      resultados.push({ org: org.id, ok: false, erro: String(e) })
    }
  }
  return NextResponse.json({ ok: true, resultados })
}
