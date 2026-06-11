import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const adminClient = createAdminClient()
  const nota_id = 'd580a56f-6312-4fb7-a791-cbbbb8ef8cf4'

  try {
    const { data: nota, error: e1 } = await adminClient
      .from('notas_entrega')
      .select('id, numero_sequencial, emitida_em, status, snapshot, emitida_por, movimentacao_id, organizacao_id')
      .eq('id', nota_id)
      .single()
    if (e1) return NextResponse.json({ step: 'nota', error: e1 })

    const { data: org, error: e2 } = await adminClient
      .from('organizacoes')
      .select('nome, cnpj, endereco, municipio')
      .eq('id', nota.organizacao_id)
      .single()
    if (e2) return NextResponse.json({ step: 'org', error: e2 })

    const { data: operador, error: e3 } = nota.emitida_por
      ? await adminClient.from('usuarios').select('nome_completo').eq('id', nota.emitida_por).maybeSingle()
      : { data: null, error: null }
    if (e3) return NextResponse.json({ step: 'operador', error: e3 })

    const { data: mov, error: e4 } = await adminClient
      .from('movimentacoes_conta')
      .select(`id, quantidade_produto, observacoes, created_at, contas_produtor!inner(produtores!inner(nome, cpf, municipio)), produtos!inner(nome, unidade)`)
      .eq('id', nota.movimentacao_id)
      .single()
    if (e4) return NextResponse.json({ step: 'mov', error: e4 })

    const { data: rateio, error: e5 } = await adminClient
      .from('rateio_entrega')
      .select('percentual, quantidade_rateada, produtores!inner(nome, cpf)')
      .eq('movimentacao_id', nota.movimentacao_id)
    if (e5) return NextResponse.json({ step: 'rateio', error: e5 })

    return NextResponse.json({ ok: true, nota, org, operador, mov, rateio })
  } catch (err: any) {
    return NextResponse.json({ step: 'catch', message: err.message, stack: err.stack })
  }
}
