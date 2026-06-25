import { createAdminClient } from '@/lib/supabase/admin'
import { getLimiteFiliados } from '@/lib/planos'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const organizacaoId = req.nextUrl.searchParams.get('org')
  if (!organizacaoId) return NextResponse.json({ error: 'org required' }, { status: 400 })

  const supabase = createAdminClient()

  const [{ data: org }, { count }] = await Promise.all([
    supabase.from('organizacoes').select('plano').eq('id', organizacaoId).single(),
    supabase.from('cooperados').select('*', { count: 'exact', head: true })
      .eq('organizacao_id', organizacaoId)
      .eq('status', 'ativo'),
  ])

  const plano = org?.plano ?? 'gratuito'
  const limite = getLimiteFiliados(plano)
  const totalAtual = count ?? 0

  return NextResponse.json({
    permitido: limite === null || totalAtual < limite,
    totalAtual,
    limite,
    plano,
  })
}
