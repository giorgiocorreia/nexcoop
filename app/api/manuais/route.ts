import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const chave = searchParams.get('chave')
  if (!chave) return NextResponse.json({ url: null })

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('configuracoes_sistema')
    .select('valor')
    .eq('chave', chave)
    .single()

  return NextResponse.json({ url: data?.valor || null })
}
