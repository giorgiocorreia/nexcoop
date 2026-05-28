import { createClient } from '@/lib/supabase/client'
import { getLimiteFiliados } from '@/lib/planos'

export interface ResultadoLimite {
  permitido: boolean
  totalAtual: number
  limite: number | null
  plano: string
}

export async function verificarLimiteFiliados(
  organizacaoId: string
): Promise<ResultadoLimite> {
  const supabase = createClient()

  const [{ data: org }, { count }] = await Promise.all([
    supabase
      .from('organizacoes')
      .select('plano')
      .eq('id', organizacaoId)
      .single(),
    supabase
      .from('cooperados')
      .select('*', { count: 'exact', head: true })
      .eq('organizacao_id', organizacaoId),
  ])

  const plano = org?.plano ?? 'gratuito'
  const limite = getLimiteFiliados(plano)
  const totalAtual = count ?? 0

  return {
    permitido: limite === null || totalAtual < limite,
    totalAtual,
    limite,
    plano,
  }
}