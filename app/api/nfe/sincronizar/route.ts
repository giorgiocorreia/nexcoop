import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { focusGet, urlCompleta } from '@/lib/focusnfe/client'

export async function POST(req: NextRequest) {
  const { referencia, nota_id } = await req.json()
  const supabase = createAdminClient()

  try {
    const resposta = await focusGet<any>(`/v2/nfe/${referencia}`)

    if (resposta.status === 'autorizado') {
      await supabase
        .from('notas_entrega')
        .update({
          status: 'emitida',
          chave_nfe: resposta.chave_nfe,
          numero_nfe: resposta.numero,
          xml_url: urlCompleta(resposta.caminho_xml_nota_fiscal),
          danfe_url: urlCompleta(resposta.caminho_danfe),
        })
        .eq('id', nota_id)

      return NextResponse.json({ sucesso: true, chave_nfe: resposta.chave_nfe })
    }

    return NextResponse.json({ sucesso: false, status: resposta.status })
  } catch (e: any) {
    return NextResponse.json({ sucesso: false, erro: e.message })
  }
}
