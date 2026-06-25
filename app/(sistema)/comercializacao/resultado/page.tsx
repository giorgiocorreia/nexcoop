import { createAdminClient } from '@/lib/supabase/admin'
import { getUsuarioLogado } from '@/lib/auth'
import ResultadoClient from './ResultadoClient'

export default async function ResultadoPage() {
  const usuario = await getUsuarioLogado()
  const supabase = createAdminClient()
  const orgId = usuario.organizacao_id as string

  const { data: safras } = await supabase
    .from('safras')
    .select('id, ano, descricao, status')
    .eq('organizacao_id', orgId)
    .order('ano', { ascending: false })

  const { data: resultados } = await (supabase as any)
    .from('vw_resultado_safra')
    .select('*')
    .eq('organizacao_id', orgId)
    .order('safra_ano', { ascending: false })

  const { data: saldos } = await (supabase as any)
    .from('vw_saldos_produtor')
    .select('*')
    .eq('organizacao_id', orgId)

  return (
    <ResultadoClient
      safras={safras ?? []}
      resultados={resultados ?? []}
      saldos={saldos ?? []}
    />
  )
}
