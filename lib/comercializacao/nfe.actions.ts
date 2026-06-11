'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getUsuarioLogado } from '@/lib/auth'
import { emitirNfeEntrada } from '@/lib/focusnfe/emitir-nfe-entrada'

export async function emitirNfeEntradaAction(movimentacao_id: string) {
  const usuario = await getUsuarioLogado()
  const resultado = await emitirNfeEntrada({
    movimentacao_id,
    organizacao_id: usuario.organizacao_id as string,
  })
  return resultado
}

export async function getNfeStatus(movimentacao_id: string) {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('notas_entrega')
    .select('id, status, chave_nfe, numero_nfe, danfe_url, motivo_rejeicao, referencia')
    .eq('movimentacao_id', movimentacao_id)
    .neq('status', 'cancelada')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data
}
