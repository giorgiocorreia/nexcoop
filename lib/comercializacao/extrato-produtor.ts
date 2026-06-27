'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export interface MovimentacaoExtrato {
  id: string
  tipo: string
  quantidade_produto: number | null
  valor_financeiro: number | null
  forma_pagamento: string | null
  created_at: string
  observacoes: string | null
  produto_nome: string | null
  produto_unidade: string | null
}

export interface DadosExtratoProdutor {
  produtor: {
    nome: string
    cpf: string | null
    tipo: string
    municipio: string | null
    ie_produtor_rural: string | null
    cooperado_id: string | null
  }
  organizacao: {
    nome: string
    cnpj: string
  }
  periodo: {
    inicio: string | null
    fim: string | null
    tipo: 'total' | 'periodo'
  }
  movimentacoes: MovimentacaoExtrato[]
  saldo_atual_produto: number
  saldo_atual_financeiro: number
  produto_nome: string | null
}

export async function buscarDadosExtratoProdutor(
  produtor_id: string,
  tipo: 'total' | 'periodo',
  data_inicio?: string,
  data_fim?: string
): Promise<DadosExtratoProdutor> {
  const admin = createAdminClient()

  const { data: produtor, error: prodErr } = await admin
    .from('produtores')
    .select('id, nome, cpf, tipo, municipio, ie_produtor_rural, cooperado_id, organizacao_id')
    .eq('id', produtor_id)
    .single()

  if (prodErr || !produtor) throw new Error('Produtor não encontrado')

  const { data: org } = await admin
    .from('organizacoes')
    .select('nome, cnpj')
    .eq('id', (produtor as any).organizacao_id)
    .single()

  const { data: conta } = await admin
    .from('contas_produtor')
    .select('id, saldo_financeiro, saldos_produto(quantidade, produtos(nome, unidade))')
    .eq('produtor_id', produtor_id)
    .maybeSingle()

  let query = admin
    .from('movimentacoes_conta')
    .select(`
      id, tipo, quantidade_produto, valor_financeiro,
      forma_pagamento, created_at, observacoes, produto_id,
      produtos(nome, unidade)
    `)
    .eq('conta_id', (conta as any)?.id ?? '')
    .not('tipo', 'eq', 'conversao')
    .order('created_at', { ascending: true })

  if (tipo === 'periodo' && data_inicio) {
    query = query.gte('created_at', `${data_inicio}T00:00:00-03:00`)
  }
  if (tipo === 'periodo' && data_fim) {
    query = query.lte('created_at', `${data_fim}T23:59:59-03:00`)
  }

  const { data: movs } = await query

  const movimentacoes: MovimentacaoExtrato[] = (movs ?? []).map((m: any) => ({
    id: m.id,
    tipo: m.tipo,
    quantidade_produto: m.quantidade_produto,
    valor_financeiro: m.valor_financeiro,
    forma_pagamento: m.forma_pagamento,
    created_at: m.created_at,
    observacoes: m.observacoes,
    produto_nome: m.produtos?.nome ?? null,
    produto_unidade: m.produtos?.unidade ?? null,
  }))

  const saldos = (conta as any)?.saldos_produto ?? []
  const mainSaldo = saldos.length > 0
    ? saldos.reduce((max: any, s: any) => s.quantidade > max.quantidade ? s : max, saldos[0])
    : null

  return {
    produtor: {
      nome: (produtor as any).nome,
      cpf: (produtor as any).cpf,
      tipo: (produtor as any).tipo,
      municipio: (produtor as any).municipio,
      ie_produtor_rural: (produtor as any).ie_produtor_rural,
      cooperado_id: (produtor as any).cooperado_id,
    },
    organizacao: {
      nome: (org as any)?.nome ?? '',
      cnpj: (org as any)?.cnpj ?? '',
    },
    periodo: {
      inicio: data_inicio ?? null,
      fim: data_fim ?? null,
      tipo,
    },
    movimentacoes,
    saldo_atual_produto: mainSaldo?.quantidade ?? 0,
    saldo_atual_financeiro: (conta as any)?.saldo_financeiro ?? 0,
    produto_nome: mainSaldo?.produtos?.nome ?? null,
  }
}
