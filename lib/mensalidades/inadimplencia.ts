// Fonte ÚNICA de inadimplência por mensalidade (associação): associados com pelo
// menos uma mensalidade vencida (não paga e com vencimento no passado). Usada
// no dashboard e na lista de associados para o MESMO número — sem duplicar/
// divergir. Módulo server-only (I/O) — não é função pura nem server action.
import { createAdminClient } from '@/lib/supabase/admin'

// Retorna os cooperado_id (associados) com mensalidade vencida na org.
export async function buscarInadimplentesMensalidade(orgId: string): Promise<string[]> {
  const hoje = new Date().toISOString().slice(0, 10)
  const admin = createAdminClient()
  const { data } = await admin
    .from('mensalidades')
    .select('cooperado_id')
    .eq('organizacao_id', orgId)
    .neq('status', 'pago')
    .lt('data_vencimento', hoje)
  return [...new Set((data ?? []).map(m => m.cooperado_id as string))]
}
