'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getUsuarioLogado } from '@/lib/auth'
import {
  calcularIntervaloMes,
  agregarPagamentos,
  type PagamentoProdutorLinha,
} from './pagamentos-produtores-utils'

export type { PagamentoProdutorLinha } from './pagamentos-produtores-utils'

// Fonte de dados escolhida pra "pagamento ao produtor": movimentacoes_conta
// com tipo 'saque_especie' ou 'saque_pix' — é o único ponto do fluxo em que
// dinheiro de fato sai da cooperativa pra mão/conta do produtor (ver
// registrarConversaoESaque, registrarSaqueFinanceiro e registrarSaquePorValor
// em caixa.actions.ts). Créditos de distribuição de resultado
// (tipo 'ajuste_financeiro', ver distribuicao.actions.ts::pagarDistribuicao)
// só aumentam o saldo em conta do produtor — viram pagamento de fato só
// quando ele saca, então não entram aqui (evita contar duas vezes: uma no
// crédito e outra no saque).
const TIPOS_PAGAMENTO = ['saque_especie', 'saque_pix'] as const

export async function listarPagamentosProdutores(mes: number, ano: number) {
  const usuario = await getUsuarioLogado()
  const supabase = createAdminClient()
  const orgId = usuario.organizacao_id as string
  const { inicioIso, fimIso } = calcularIntervaloMes(mes, ano)

  const { data: movs, error } = await supabase
    .from('movimentacoes_conta')
    .select(`
      id,
      valor_financeiro,
      forma_pagamento,
      observacoes,
      created_at,
      contas_produtor!inner(produtor_id, produtores(nome, cpf))
    `)
    .eq('organizacao_id', orgId)
    .in('tipo', TIPOS_PAGAMENTO)
    .gte('created_at', inicioIso)
    .lt('created_at', fimIso)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)

  const linhas: PagamentoProdutorLinha[] = (movs ?? []).map((m: any) => ({
    id: m.id,
    data: m.created_at,
    produtor_nome: m.contas_produtor?.produtores?.nome ?? '—',
    produtor_cpf: m.contas_produtor?.produtores?.cpf ?? null,
    forma_pagamento: (m.forma_pagamento ?? 'especie') as 'especie' | 'pix',
    valor: Math.abs(Number(m.valor_financeiro ?? 0)),
    observacoes: m.observacoes ?? null,
  }))

  const { data: org } = await supabase
    .from('organizacoes')
    .select('nome, cnpj')
    .eq('id', orgId)
    .maybeSingle()

  return {
    linhas,
    ...agregarPagamentos(linhas),
    orgNome: org?.nome ?? '',
    orgCnpj: org?.cnpj ?? '',
  }
}

// Resumo pro KPI do dashboard — mesmo critério de "pagamento ao produtor"
// acima (saques), só que sem detalhar linha a linha nem buscar produtor/org.
export async function getResumoPagamentosMes(organizacaoId: string, mes: number, ano: number) {
  const supabase = createAdminClient()
  const { inicioIso, fimIso } = calcularIntervaloMes(mes, ano)

  const { data: movs, error } = await supabase
    .from('movimentacoes_conta')
    .select('valor_financeiro, forma_pagamento')
    .eq('organizacao_id', organizacaoId)
    .in('tipo', TIPOS_PAGAMENTO)
    .gte('created_at', inicioIso)
    .lt('created_at', fimIso)
  if (error) throw new Error(error.message)

  const linhas: PagamentoProdutorLinha[] = (movs ?? []).map((m: any) => ({
    id: '',
    data: '',
    produtor_nome: '',
    produtor_cpf: null,
    forma_pagamento: (m.forma_pagamento ?? 'especie') as 'especie' | 'pix',
    valor: Math.abs(Number(m.valor_financeiro ?? 0)),
    observacoes: null,
  }))

  return agregarPagamentos(linhas)
}
