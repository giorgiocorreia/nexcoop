'use server'

import { createAdminClient } from '@/lib/supabase/admin'

type LogData = {
  org_id?: string | null
  usuario_id?: string | null
  usuario_email?: string | null
  role?: string | null
  acao: string
  modulo: string
  descricao?: string
  dados_antes?: Record<string, any> | null
  dados_depois?: Record<string, any> | null
}

export async function registrarLog(data: LogData): Promise<void> {
  try {
    const supabase = createAdminClient()
    await supabase.from('audit_logs').insert(data)
  } catch (e) {
    console.error('[audit] falha ao registrar log:', e)
  }
}
