import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { focusGet, urlCompleta } from '@/lib/focusnfe/client'

export async function POST(req: NextRequest) {
  const supabaseUser = await createClient()
  const { data: { user } } = await supabaseUser.auth.getUser()
  if (!user) {
    return NextResponse.json({ sucesso: false, erro: 'Não autenticado' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('organizacao_id')
    .eq('id', user.id)
    .single()
  if (!usuario?.organizacao_id) {
    return NextResponse.json({ sucesso: false, erro: 'Não autenticado' }, { status: 401 })
  }

  const { nota_id } = await req.json()

  // Confirma que a nota pertence à org do usuário logado antes de sincronizar
  // ou atualizar qualquer coisa — sem isso, qualquer usuário autenticado
  // conseguia forçar sincronização/alteração de notas de outra cooperativa.
  // A referência da Focus vem da própria nota, nunca do payload: aceitar a
  // referência do cliente permitiria gravar a chave de uma NF-e de outra org
  // nesta nota (e ler os dados dela na resposta).
  const { data: nota } = await supabase
    .from('notas_entrega')
    .select('id, referencia')
    .eq('id', nota_id)
    .eq('organizacao_id', usuario.organizacao_id)
    .maybeSingle()
  if (!nota) {
    return NextResponse.json({ sucesso: false, erro: 'Nota não encontrada' }, { status: 404 })
  }
  if (!nota.referencia) {
    return NextResponse.json({ sucesso: false, erro: 'Nota sem referência de emissão' }, { status: 400 })
  }

  try {
    const resposta = await focusGet<any>(`/v2/nfe/${nota.referencia}`, 'comercializacao')

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
        .eq('organizacao_id', usuario.organizacao_id)

      return NextResponse.json({ sucesso: true, chave_nfe: resposta.chave_nfe })
    }

    return NextResponse.json({ sucesso: false, status: resposta.status })
  } catch (e: any) {
    return NextResponse.json({ sucesso: false, erro: e.message })
  }
}
