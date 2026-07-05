'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { classificarLancamento } from '@/lib/contabil/actions'
import type { TipoLancamento } from '@/types/database'

interface ContaPlano {
  id: string
  codigo: string
  nome: string
}

const COD_CAIXA = '1.1.1.01'
const COD_BANCO = '1.1.1.02'

type Regra = {
  test: (texto: string) => boolean
  contaCodigo: string
}

const REGRAS: Regra[] = [
  { test: t => /mensalidade|contribuiç|taxa de associação/i.test(t), contaCodigo: '4.1.1' },
  { test: t => /integraliza|cota cooperativa|cota —/i.test(t), contaCodigo: '3.1.1' },
  { test: t => /compra loja/i.test(t), contaCodigo: '5.1.2' },
  { test: t => /venda loja/i.test(t), contaCodigo: '4.2.1' },
  { test: t => /nf-e|recebimento venda|venda coletiva/i.test(t), contaCodigo: '4.1.1' },
  { test: t => /pagamento produtor|distribuição/i.test(t), contaCodigo: '5.1.2' },
  { test: t => /ajuste devolução|estorno devolução/i.test(t), contaCodigo: '4.2.1' },
  { test: t => /aluguel|saque produtor|saída avulsa|material de escritório/i.test(t), contaCodigo: '5.2.1' },
]

function encontrarConta(contas: ContaPlano[], codigo: string): ContaPlano | undefined {
  return contas.find(c => c.codigo === codigo)
    ?? contas.find(c => c.codigo.startsWith(codigo + '.'))
}

function resolverContaResultado(texto: string, tipo: TipoLancamento, contas: ContaPlano[]): ContaPlano | undefined {
  for (const regra of REGRAS) {
    if (regra.test(texto)) {
      const conta = encontrarConta(contas, regra.contaCodigo)
      if (conta) return conta
    }
  }
  const fallback = tipo === 'receita' ? '4.2.1' : '5.2.1'
  return encontrarConta(contas, fallback)
}

function resolverDisponibilidade(texto: string, contas: ContaPlano[]): ContaPlano | undefined {
  if (/pix|transferência/i.test(texto)) {
    return encontrarConta(contas, COD_BANCO) ?? encontrarConta(contas, COD_CAIXA)
  }
  return encontrarConta(contas, COD_CAIXA) ?? encontrarConta(contas, COD_BANCO)
}

async function classificacaoHabilitada(orgId: string): Promise<boolean> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('configuracoes_contabeis')
    .select('classificacao_automatica')
    .eq('org_id', orgId)
    .maybeSingle()
  if (!data) return true
  return data.classificacao_automatica !== false
}

export async function tentarClassificarAutomaticamente(params: {
  org_id: string
  lancamento_id: string
  tipo: TipoLancamento
  status: string
  descricao: string
  valor: number
  data_competencia: string
  observacoes?: string | null
  usuario_id: string
}): Promise<{ classificado: boolean }> {
  if (params.tipo === 'transferencia') return { classificado: false }
  if (params.status === 'cancelado') return { classificado: false }
  if (!(await classificacaoHabilitada(params.org_id))) return { classificado: false }

  const supabase = createAdminClient()

  const { data: existente } = await supabase
    .from('partidas')
    .select('id')
    .eq('lancamento_id', params.lancamento_id)
    .maybeSingle()
  if (existente) return { classificado: false }

  const { data: contas } = await supabase
    .from('plano_contas')
    .select('id, codigo, nome')
    .eq('org_id', params.org_id)
    .eq('aceita_lancamento', true)
    .eq('ativo', true)

  if (!contas?.length) return { classificado: false }

  const texto = `${params.descricao} ${params.observacoes ?? ''}`.trim()
  const disponibilidade = resolverDisponibilidade(texto, contas)
  const resultado = resolverContaResultado(texto, params.tipo, contas)

  if (!disponibilidade || !resultado) return { classificado: false }

  const contaDebito = params.tipo === 'receita' ? disponibilidade : resultado
  const contaCredito = params.tipo === 'receita' ? resultado : disponibilidade

  const ano = new Date(params.data_competencia + 'T12:00:00').getFullYear()
  const { data: exercicio } = await supabase
    .from('exercicios_contabeis')
    .select('id')
    .eq('org_id', params.org_id)
    .eq('ano', ano)
    .eq('status', 'ABERTO')
    .maybeSingle()
  const exercicioId = exercicio?.id

  try {
    await classificarLancamento({
      org_id: params.org_id,
      lancamento_id: params.lancamento_id,
      conta_debito_id: contaDebito.id,
      conta_credito_id: contaCredito.id,
      valor: params.valor,
      historico: `[Auto] ${params.descricao}`,
      exercicio_id: exercicioId,
      classificado_por: params.usuario_id,
    })
    return { classificado: true }
  } catch (e) {
    console.error('[contabil] Classificação automática falhou:', e)
    return { classificado: false }
  }
}