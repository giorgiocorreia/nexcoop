import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('loja_vendas')
    .select(`
      id, total, status, org_id,
      loja_caixas ( usuario_id, usuarios ( nome_completo ) )
    `)
    .eq('org_id', '3ad97dc2-f87f-4e67-950e-387854d5bccc')
    .eq('status', 'concluida')
  return NextResponse.json({ data, error })
}
