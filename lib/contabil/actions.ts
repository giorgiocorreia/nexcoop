'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { registrarLog } from '@/lib/audit/logger'
import { ContaContabil, ItemBalancete, ItemDRE, TipoConta, NaturezaConta, ItemBalancoPatrimonial, ItemLivroRazao, TipoOrg, getTerminologia } from './types'

export async function getTipoOrg(orgId: string): Promise<TipoOrg> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('organizacoes')
    .select('tipo')
    .eq('id', orgId)
    .single()
  return (data?.tipo as TipoOrg) || 'cooperativa'
}

// ── PLANO DE CONTAS ──────────────────────────────────────────────────────────

export async function getPlanoContas(orgId: string): Promise<ContaContabil[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('plano_contas')
    .select('*')
    .eq('org_id', orgId)
    .eq('ativo', true)
    .order('codigo')
  if (error) throw new Error(error.message)
  return buildTree(data || [])
}

function buildTree(contas: ContaContabil[]): ContaContabil[] {
  const map = new Map<string, ContaContabil>()
  const raizes: ContaContabil[] = []
  contas.forEach(c => { map.set(c.id, { ...c, filhos: [] }) })
  map.forEach(c => {
    if (c.parent_id && map.has(c.parent_id)) {
      map.get(c.parent_id)!.filhos!.push(c)
    } else {
      raizes.push(c)
    }
  })
  return raizes
}

export async function criarConta(data: {
  org_id: string
  codigo: string
  nome: string
  tipo: TipoConta
  natureza: NaturezaConta
  parent_id?: string
  nivel: number
  aceita_lancamento: boolean
}) {
  const supabase = createAdminClient()
  const { error } = await supabase.from('plano_contas').insert(data)
  if (error) throw new Error(error.message)
  revalidatePath('/contabil/plano-de-contas')
}

export async function seedPlanoContasCooperativa(orgId: string) {
  const supabase = createAdminClient()
  const contas = gerarPlanoContasPadrao(orgId)
  const { error } = await supabase.from('plano_contas').insert(contas)
  if (error) throw new Error(error.message)
  revalidatePath('/contabil/plano-de-contas')
}

export async function seedPlanoContasOrg(orgId: string, tipoOrg: TipoOrg = 'cooperativa') {
  const supabase = createAdminClient()
  const contas = tipoOrg === 'cooperativa'
    ? gerarPlanoContasPadrao(orgId)
    : gerarPlanoContasAssociacao(orgId)
  const { error } = await supabase.from('plano_contas').insert(contas)
  if (error) throw new Error(error.message)
  revalidatePath('/contabil/plano-de-contas')
}

function gerarPlanoContasPadrao(orgId: string): Array<{
  org_id: string; codigo: string; nome: string; tipo: TipoConta; natureza: NaturezaConta; nivel: number; aceita_lancamento: boolean
}> {
  return [
    { org_id: orgId, codigo: '1', nome: 'ATIVO', tipo: 'ATIVO' as TipoConta, natureza: 'DEVEDORA' as NaturezaConta, nivel: 1, aceita_lancamento: false },
    { org_id: orgId, codigo: '1.1', nome: 'Ativo Circulante', tipo: 'ATIVO', natureza: 'DEVEDORA', nivel: 2, aceita_lancamento: false },
    { org_id: orgId, codigo: '1.1.1', nome: 'Disponibilidades', tipo: 'ATIVO', natureza: 'DEVEDORA', nivel: 3, aceita_lancamento: false },
    { org_id: orgId, codigo: '1.1.1.01', nome: 'Caixa', tipo: 'ATIVO', natureza: 'DEVEDORA', nivel: 4, aceita_lancamento: true },
    { org_id: orgId, codigo: '1.1.1.02', nome: 'Banco Conta Movimento', tipo: 'ATIVO', natureza: 'DEVEDORA', nivel: 4, aceita_lancamento: true },
    { org_id: orgId, codigo: '1.1.2', nome: 'Créditos a Receber', tipo: 'ATIVO', natureza: 'DEVEDORA', nivel: 3, aceita_lancamento: false },
    { org_id: orgId, codigo: '1.1.2.01', nome: 'Mensalidades a Receber', tipo: 'ATIVO', natureza: 'DEVEDORA', nivel: 4, aceita_lancamento: true },
    { org_id: orgId, codigo: '1.1.2.02', nome: 'Duplicatas a Receber', tipo: 'ATIVO', natureza: 'DEVEDORA', nivel: 4, aceita_lancamento: true },
    { org_id: orgId, codigo: '1.2', nome: 'Ativo Não Circulante', tipo: 'ATIVO', natureza: 'DEVEDORA', nivel: 2, aceita_lancamento: false },
    { org_id: orgId, codigo: '1.2.1', nome: 'Imobilizado', tipo: 'ATIVO', natureza: 'DEVEDORA', nivel: 3, aceita_lancamento: false },
    { org_id: orgId, codigo: '1.2.1.01', nome: 'Máquinas e Equipamentos', tipo: 'ATIVO', natureza: 'DEVEDORA', nivel: 4, aceita_lancamento: true },
    { org_id: orgId, codigo: '1.2.1.02', nome: 'Veículos', tipo: 'ATIVO', natureza: 'DEVEDORA', nivel: 4, aceita_lancamento: true },
    { org_id: orgId, codigo: '2', nome: 'PASSIVO', tipo: 'PASSIVO', natureza: 'CREDORA', nivel: 1, aceita_lancamento: false },
    { org_id: orgId, codigo: '2.1', nome: 'Passivo Circulante', tipo: 'PASSIVO', natureza: 'CREDORA', nivel: 2, aceita_lancamento: false },
    { org_id: orgId, codigo: '2.1.1', nome: 'Fornecedores', tipo: 'PASSIVO', natureza: 'CREDORA', nivel: 3, aceita_lancamento: false },
    { org_id: orgId, codigo: '2.1.1.01', nome: 'Fornecedores a Pagar', tipo: 'PASSIVO', natureza: 'CREDORA', nivel: 4, aceita_lancamento: true },
    { org_id: orgId, codigo: '2.1.2', nome: 'Obrigações Sociais', tipo: 'PASSIVO', natureza: 'CREDORA', nivel: 3, aceita_lancamento: false },
    { org_id: orgId, codigo: '2.1.2.01', nome: 'INSS a Recolher', tipo: 'PASSIVO', natureza: 'CREDORA', nivel: 4, aceita_lancamento: true },
    { org_id: orgId, codigo: '2.1.2.02', nome: 'FGTS a Recolher', tipo: 'PASSIVO', natureza: 'CREDORA', nivel: 4, aceita_lancamento: true },
    { org_id: orgId, codigo: '3', nome: 'PATRIMÔNIO LÍQUIDO', tipo: 'PATRIMONIO_LIQUIDO', natureza: 'CREDORA', nivel: 1, aceita_lancamento: false },
    { org_id: orgId, codigo: '3.1', nome: 'Capital Social', tipo: 'PATRIMONIO_LIQUIDO', natureza: 'CREDORA', nivel: 2, aceita_lancamento: false },
    { org_id: orgId, codigo: '3.1.1', nome: 'Cotas de Capital', tipo: 'PATRIMONIO_LIQUIDO', natureza: 'CREDORA', nivel: 3, aceita_lancamento: true },
    { org_id: orgId, codigo: '3.2', nome: 'Reservas', tipo: 'PATRIMONIO_LIQUIDO', natureza: 'CREDORA', nivel: 2, aceita_lancamento: false },
    { org_id: orgId, codigo: '3.2.1', nome: 'Fundo de Reserva', tipo: 'PATRIMONIO_LIQUIDO', natureza: 'CREDORA', nivel: 3, aceita_lancamento: true },
    { org_id: orgId, codigo: '3.2.2', nome: 'REFAC', tipo: 'PATRIMONIO_LIQUIDO', natureza: 'CREDORA', nivel: 3, aceita_lancamento: true },
    { org_id: orgId, codigo: '3.3', nome: 'Sobras ou Perdas', tipo: 'PATRIMONIO_LIQUIDO', natureza: 'CREDORA', nivel: 2, aceita_lancamento: false },
    { org_id: orgId, codigo: '3.3.1', nome: 'Sobras do Exercício', tipo: 'PATRIMONIO_LIQUIDO', natureza: 'CREDORA', nivel: 3, aceita_lancamento: true },
    { org_id: orgId, codigo: '3.3.2', nome: 'Perdas do Exercício', tipo: 'PATRIMONIO_LIQUIDO', natureza: 'DEVEDORA', nivel: 3, aceita_lancamento: true },
    { org_id: orgId, codigo: '4', nome: 'RECEITAS', tipo: 'RECEITA', natureza: 'CREDORA', nivel: 1, aceita_lancamento: false },
    { org_id: orgId, codigo: '4.1', nome: 'Ato Cooperativo', tipo: 'RECEITA', natureza: 'CREDORA', nivel: 2, aceita_lancamento: false },
    { org_id: orgId, codigo: '4.1.1', nome: 'Receita de Ato Cooperativo', tipo: 'RECEITA', natureza: 'CREDORA', nivel: 3, aceita_lancamento: true },
    { org_id: orgId, codigo: '4.2', nome: 'Ato Não-Cooperativo', tipo: 'RECEITA', natureza: 'CREDORA', nivel: 2, aceita_lancamento: false },
    { org_id: orgId, codigo: '4.2.1', nome: 'Receita de Ato Não-Cooperativo', tipo: 'RECEITA', natureza: 'CREDORA', nivel: 3, aceita_lancamento: true },
    { org_id: orgId, codigo: '5', nome: 'DESPESAS', tipo: 'DESPESA', natureza: 'DEVEDORA', nivel: 1, aceita_lancamento: false },
    { org_id: orgId, codigo: '5.1', nome: 'Despesas Operacionais', tipo: 'DESPESA', natureza: 'DEVEDORA', nivel: 2, aceita_lancamento: false },
    { org_id: orgId, codigo: '5.1.1', nome: 'Despesas com Pessoal', tipo: 'DESPESA', natureza: 'DEVEDORA', nivel: 3, aceita_lancamento: true },
    { org_id: orgId, codigo: '5.1.2', nome: 'Despesas com Insumos', tipo: 'DESPESA', natureza: 'DEVEDORA', nivel: 3, aceita_lancamento: true },
    { org_id: orgId, codigo: '5.2', nome: 'Despesas Administrativas', tipo: 'DESPESA', natureza: 'DEVEDORA', nivel: 2, aceita_lancamento: false },
    { org_id: orgId, codigo: '5.2.1', nome: 'Despesas Gerais e Administrativas', tipo: 'DESPESA', natureza: 'DEVEDORA', nivel: 3, aceita_lancamento: true },
  ]
}

function gerarPlanoContasAssociacao(orgId: string): Array<{
  org_id: string; codigo: string; nome: string; tipo: TipoConta; natureza: NaturezaConta; nivel: number; aceita_lancamento: boolean
}> {
  return [
    { org_id: orgId, codigo: '1', nome: 'ATIVO', tipo: 'ATIVO', natureza: 'DEVEDORA', nivel: 1, aceita_lancamento: false },
    { org_id: orgId, codigo: '1.1', nome: 'Ativo Circulante', tipo: 'ATIVO', natureza: 'DEVEDORA', nivel: 2, aceita_lancamento: false },
    { org_id: orgId, codigo: '1.1.1', nome: 'Disponibilidades', tipo: 'ATIVO', natureza: 'DEVEDORA', nivel: 3, aceita_lancamento: false },
    { org_id: orgId, codigo: '1.1.1.01', nome: 'Caixa', tipo: 'ATIVO', natureza: 'DEVEDORA', nivel: 4, aceita_lancamento: true },
    { org_id: orgId, codigo: '1.1.1.02', nome: 'Banco Conta Movimento', tipo: 'ATIVO', natureza: 'DEVEDORA', nivel: 4, aceita_lancamento: true },
    { org_id: orgId, codigo: '1.1.2', nome: 'Créditos a Receber', tipo: 'ATIVO', natureza: 'DEVEDORA', nivel: 3, aceita_lancamento: false },
    { org_id: orgId, codigo: '1.1.2.01', nome: 'Mensalidades a Receber', tipo: 'ATIVO', natureza: 'DEVEDORA', nivel: 4, aceita_lancamento: true },
    { org_id: orgId, codigo: '1.1.2.02', nome: 'Contribuições a Receber', tipo: 'ATIVO', natureza: 'DEVEDORA', nivel: 4, aceita_lancamento: true },
    { org_id: orgId, codigo: '1.2', nome: 'Ativo Não Circulante', tipo: 'ATIVO', natureza: 'DEVEDORA', nivel: 2, aceita_lancamento: false },
    { org_id: orgId, codigo: '1.2.1', nome: 'Imobilizado', tipo: 'ATIVO', natureza: 'DEVEDORA', nivel: 3, aceita_lancamento: false },
    { org_id: orgId, codigo: '1.2.1.01', nome: 'Móveis e Utensílios', tipo: 'ATIVO', natureza: 'DEVEDORA', nivel: 4, aceita_lancamento: true },
    { org_id: orgId, codigo: '1.2.1.02', nome: 'Equipamentos de Informática', tipo: 'ATIVO', natureza: 'DEVEDORA', nivel: 4, aceita_lancamento: true },
    { org_id: orgId, codigo: '2', nome: 'PASSIVO', tipo: 'PASSIVO', natureza: 'CREDORA', nivel: 1, aceita_lancamento: false },
    { org_id: orgId, codigo: '2.1', nome: 'Passivo Circulante', tipo: 'PASSIVO', natureza: 'CREDORA', nivel: 2, aceita_lancamento: false },
    { org_id: orgId, codigo: '2.1.1', nome: 'Fornecedores', tipo: 'PASSIVO', natureza: 'CREDORA', nivel: 3, aceita_lancamento: false },
    { org_id: orgId, codigo: '2.1.1.01', nome: 'Fornecedores a Pagar', tipo: 'PASSIVO', natureza: 'CREDORA', nivel: 4, aceita_lancamento: true },
    { org_id: orgId, codigo: '2.1.2', nome: 'Obrigações Sociais', tipo: 'PASSIVO', natureza: 'CREDORA', nivel: 3, aceita_lancamento: false },
    { org_id: orgId, codigo: '2.1.2.01', nome: 'INSS a Recolher', tipo: 'PASSIVO', natureza: 'CREDORA', nivel: 4, aceita_lancamento: true },
    { org_id: orgId, codigo: '3', nome: 'PATRIMÔNIO SOCIAL', tipo: 'PATRIMONIO_LIQUIDO', natureza: 'CREDORA', nivel: 1, aceita_lancamento: false },
    { org_id: orgId, codigo: '3.1', nome: 'Patrimônio Social', tipo: 'PATRIMONIO_LIQUIDO', natureza: 'CREDORA', nivel: 2, aceita_lancamento: false },
    { org_id: orgId, codigo: '3.1.1', nome: 'Fundo Social', tipo: 'PATRIMONIO_LIQUIDO', natureza: 'CREDORA', nivel: 3, aceita_lancamento: true },
    { org_id: orgId, codigo: '3.2', nome: 'Reservas', tipo: 'PATRIMONIO_LIQUIDO', natureza: 'CREDORA', nivel: 2, aceita_lancamento: false },
    { org_id: orgId, codigo: '3.2.1', nome: 'Reserva Estatutária', tipo: 'PATRIMONIO_LIQUIDO', natureza: 'CREDORA', nivel: 3, aceita_lancamento: true },
    { org_id: orgId, codigo: '3.3', nome: 'Superávit ou Déficit Acumulado', tipo: 'PATRIMONIO_LIQUIDO', natureza: 'CREDORA', nivel: 2, aceita_lancamento: false },
    { org_id: orgId, codigo: '3.3.1', nome: 'Superávit do Exercício', tipo: 'PATRIMONIO_LIQUIDO', natureza: 'CREDORA', nivel: 3, aceita_lancamento: true },
    { org_id: orgId, codigo: '3.3.2', nome: 'Déficit do Exercício', tipo: 'PATRIMONIO_LIQUIDO', natureza: 'DEVEDORA', nivel: 3, aceita_lancamento: true },
    { org_id: orgId, codigo: '4', nome: 'RECEITAS', tipo: 'RECEITA', natureza: 'CREDORA', nivel: 1, aceita_lancamento: false },
    { org_id: orgId, codigo: '4.1', nome: 'Receitas de Contribuições', tipo: 'RECEITA', natureza: 'CREDORA', nivel: 2, aceita_lancamento: false },
    { org_id: orgId, codigo: '4.1.1', nome: 'Mensalidades de Associados', tipo: 'RECEITA', natureza: 'CREDORA', nivel: 3, aceita_lancamento: true },
    { org_id: orgId, codigo: '4.1.2', nome: 'Doações e Subvenções', tipo: 'RECEITA', natureza: 'CREDORA', nivel: 3, aceita_lancamento: true },
    { org_id: orgId, codigo: '4.2', nome: 'Outras Receitas', tipo: 'RECEITA', natureza: 'CREDORA', nivel: 2, aceita_lancamento: false },
    { org_id: orgId, codigo: '4.2.1', nome: 'Receitas de Projetos', tipo: 'RECEITA', natureza: 'CREDORA', nivel: 3, aceita_lancamento: true },
    { org_id: orgId, codigo: '4.2.2', nome: 'Rendimentos Financeiros', tipo: 'RECEITA', natureza: 'CREDORA', nivel: 3, aceita_lancamento: true },
    { org_id: orgId, codigo: '5', nome: 'DESPESAS', tipo: 'DESPESA', natureza: 'DEVEDORA', nivel: 1, aceita_lancamento: false },
    { org_id: orgId, codigo: '5.1', nome: 'Despesas Administrativas', tipo: 'DESPESA', natureza: 'DEVEDORA', nivel: 2, aceita_lancamento: false },
    { org_id: orgId, codigo: '5.1.1', nome: 'Despesas com Pessoal', tipo: 'DESPESA', natureza: 'DEVEDORA', nivel: 3, aceita_lancamento: true },
    { org_id: orgId, codigo: '5.1.2', nome: 'Despesas Gerais', tipo: 'DESPESA', natureza: 'DEVEDORA', nivel: 3, aceita_lancamento: true },
    { org_id: orgId, codigo: '5.2', nome: 'Despesas com Projetos', tipo: 'DESPESA', natureza: 'DEVEDORA', nivel: 2, aceita_lancamento: false },
    { org_id: orgId, codigo: '5.2.1', nome: 'Execução de Projetos', tipo: 'DESPESA', natureza: 'DEVEDORA', nivel: 3, aceita_lancamento: true },
  ]
}

// ── ESCRITURAÇÃO ─────────────────────────────────────────────────────────────

export async function getLancamentosPendentes(orgId: string) {
  const supabase = createAdminClient()
  const { data: todos, error } = await supabase
    .from('lancamentos')
    .select('*')
    .eq('organizacao_id', orgId)
    .order('data_competencia', { ascending: false })
  if (error) throw new Error(error.message)

  const { data: classificados } = await supabase
    .from('partidas')
    .select('lancamento_id')
    .eq('org_id', orgId)

  const classificadosIds = new Set((classificados || []).map((p: any) => p.lancamento_id))
  const pendentes = (todos || []).filter((l: any) => !classificadosIds.has(l.id))
  const feitos = (todos || []).filter((l: any) => classificadosIds.has(l.id))
  return { pendentes, classificados: feitos }
}

export async function classificarLancamento(data: {
  org_id: string
  lancamento_id: string
  conta_debito_id: string
  conta_credito_id: string
  valor: number
  historico?: string
  exercicio_id?: string
  classificado_por: string
}) {
  const supabase = createAdminClient()
  const { error } = await supabase.from('partidas').insert({
    ...data,
    classificado_em: new Date().toISOString(),
  })
  if (error) throw new Error(error.message)

  registrarLog({
    org_id: data.org_id,
    usuario_id: data.classificado_por,
    acao: 'criar',
    modulo: 'contabil',
    descricao: `Lançamento classificado: ${data.historico ?? ''} — R$ ${data.valor}`,
    dados_depois: { conta_debito_id: data.conta_debito_id, conta_credito_id: data.conta_credito_id, valor: data.valor, historico: data.historico },
  }).catch(e => console.error('[audit]', e))

  revalidatePath('/contabil/escrituracao')
}

// ── BALANCETE ────────────────────────────────────────────────────────────────

export async function getBalancete(orgId: string, mes: number, ano: number): Promise<ItemBalancete[]> {
  const supabase = createAdminClient()
  const inicioMes = new Date(ano, mes - 1, 1).toISOString().split('T')[0]
  const fimMes = new Date(ano, mes, 0).toISOString().split('T')[0]
  const inicioAno = new Date(ano, 0, 1).toISOString().split('T')[0]

  const { data: contas } = await supabase
    .from('plano_contas')
    .select('*')
    .eq('org_id', orgId)
    .eq('aceita_lancamento', true)
    .eq('ativo', true)
    .order('codigo')

  const { data: partidas } = await supabase
    .from('partidas')
    .select('*, lancamentos(data)')
    .eq('org_id', orgId)

  const resultado: ItemBalancete[] = []

  for (const conta of (contas || [])) {
    const anteriores = (partidas || []).filter((p: any) => {
      const d = p.lancamentos?.data
      return d && d >= inicioAno && d < inicioMes
    })
    const doMes = (partidas || []).filter((p: any) => {
      const d = p.lancamentos?.data
      return d && d >= inicioMes && d <= fimMes
    })

    const saldoAnterior = calcularSaldo(conta, anteriores)
    const debitos = doMes
      .filter((p: any) => p.conta_debito_id === conta.id)
      .reduce((s: number, p: any) => s + Number(p.valor), 0)
    const creditos = doMes
      .filter((p: any) => p.conta_credito_id === conta.id)
      .reduce((s: number, p: any) => s + Number(p.valor), 0)
    const saldoAtual = conta.natureza === 'DEVEDORA'
      ? saldoAnterior + debitos - creditos
      : saldoAnterior + creditos - debitos

    if (saldoAnterior !== 0 || debitos !== 0 || creditos !== 0) {
      resultado.push({
        conta_id: conta.id,
        codigo: conta.codigo,
        nome: conta.nome,
        nivel: conta.nivel,
        saldo_anterior: saldoAnterior,
        debitos,
        creditos,
        saldo_atual: saldoAtual,
      })
    }
  }
  return resultado
}

function calcularSaldo(conta: any, partidas: any[]): number {
  const deb = partidas
    .filter((p: any) => p.conta_debito_id === conta.id)
    .reduce((s: number, p: any) => s + Number(p.valor), 0)
  const cred = partidas
    .filter((p: any) => p.conta_credito_id === conta.id)
    .reduce((s: number, p: any) => s + Number(p.valor), 0)
  return conta.natureza === 'DEVEDORA' ? deb - cred : cred - deb
}

// ── DRE ──────────────────────────────────────────────────────────────────────

export async function getDRE(orgId: string, ano: number): Promise<ItemDRE[]> {
  const supabase = createAdminClient()
  const tipoOrg = await getTipoOrg(orgId)
  const terminologia = getTerminologia(tipoOrg)
  const inicioAno = `${ano}-01-01`
  const fimAno = `${ano}-12-31`

  const { data: contas } = await supabase
    .from('plano_contas')
    .select('*')
    .eq('org_id', orgId)
    .eq('ativo', true)
    .in('tipo', ['RECEITA', 'DESPESA'])

  const { data: partidas } = await supabase
    .from('partidas')
    .select('*, lancamentos(data)')
    .eq('org_id', orgId)

  const partidasAno = (partidas || []).filter((p: any) => {
    const d = p.lancamentos?.data
    return d && d >= inicioAno && d <= fimAno
  })

  let totalReceitas = 0
  let totalDespesas = 0
  const itens: ItemDRE[] = []

  for (const conta of (contas || [])) {
    const deb = partidasAno
      .filter((p: any) => p.conta_debito_id === conta.id)
      .reduce((s: number, p: any) => s + Number(p.valor), 0)
    const cred = partidasAno
      .filter((p: any) => p.conta_credito_id === conta.id)
      .reduce((s: number, p: any) => s + Number(p.valor), 0)
    const valor = conta.tipo === 'RECEITA' ? cred - deb : deb - cred
    if (valor !== 0) {
      itens.push({
        grupo: conta.tipo,
        descricao: conta.nome,
        valor,
        tipo: conta.tipo === 'RECEITA' ? 'receita' : 'despesa',
      })
      if (conta.tipo === 'RECEITA') totalReceitas += valor
      else totalDespesas += valor
    }
  }

  const resultado = totalReceitas - totalDespesas
  itens.push({
    grupo: 'RESULTADO',
    descricao: resultado >= 0 ? terminologia.resultadoPositivo : terminologia.resultadoNegativo,
    valor: resultado,
    tipo: 'resultado',
  })
  return itens
}

// ── EXERCÍCIOS ───────────────────────────────────────────────────────────────

export async function getExercicioAtivo(orgId: string) {
  const supabase = createAdminClient()
  const ano = new Date().getFullYear()
  const { data } = await supabase
    .from('exercicios_contabeis')
    .select('*')
    .eq('org_id', orgId)
    .eq('ano', ano)
    .single()
  return data
}

export async function abrirExercicio(orgId: string, ano: number) {
  const supabase = createAdminClient()
  const { error } = await supabase.from('exercicios_contabeis').insert({
    org_id: orgId,
    ano,
    data_abertura: new Date().toISOString().split('T')[0],
    status: 'ABERTO',
  })
  if (error) throw new Error(error.message)
  revalidatePath('/contabil')
}

// ── CONTADORES ───────────────────────────────────────────────────────────────

export async function getContadoresDaOrg(orgId: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('contador_org')
    .select('*, usuarios:usuario_id(nome, email)')
    .eq('org_id', orgId)
  if (error) throw new Error(error.message)
  return data || []
}

export async function convidarContador(orgId: string, email: string, nivel: 'contador' | 'contador_aux') {
  const supabase = createAdminClient()
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('id')
    .eq('email', email)
    .single()
  if (!usuario) throw new Error('Usuário não encontrado. O contador precisa ter uma conta no NexCoop.')
  const { error } = await supabase.from('contador_org').insert({
    org_id: orgId,
    usuario_id: usuario.id,
    nivel,
    ativo: true,
    convidado_em: new Date().toISOString(),
  })
  if (error) throw new Error(error.message)
  revalidatePath('/configuracoes')
}

export async function toggleContador(id: string, ativo: boolean) {
  const supabase = createAdminClient()
  const { error } = await supabase.from('contador_org').update({ ativo }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/configuracoes')
}

// ── ESCRITÓRIO CONTÁBIL ──────────────────────────────────────────────────────

export async function getEscritorioDoContador(usuarioId: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('contador_org')
    .select('escritorio_id, escritorios_contabeis(*)')
    .eq('usuario_id', usuarioId)
    .not('escritorio_id', 'is', null)
    .limit(1)
    .single()
  if (error) return null
  return (data as any)?.escritorios_contabeis || null
}

export async function criarOuAtualizarEscritorio(data: {
  usuario_id: string
  razao_social: string
  cnpj?: string
  crc_responsavel?: string
  email_contato: string
  telefone?: string
}) {
  const supabase = createAdminClient()

  const { data: existing } = await supabase
    .from('contador_org')
    .select('escritorio_id')
    .eq('usuario_id', data.usuario_id)
    .not('escritorio_id', 'is', null)
    .limit(1)
    .single()

  let escritorioId: string

  if (existing?.escritorio_id) {
    const { error } = await supabase
      .from('escritorios_contabeis')
      .update({
        razao_social: data.razao_social,
        cnpj: data.cnpj,
        crc_responsavel: data.crc_responsavel,
        email_contato: data.email_contato,
        telefone: data.telefone,
      })
      .eq('id', existing.escritorio_id)
    if (error) throw new Error(error.message)
    escritorioId = existing.escritorio_id
  } else {
    const { data: novo, error } = await supabase
      .from('escritorios_contabeis')
      .insert({
        razao_social: data.razao_social,
        cnpj: data.cnpj,
        crc_responsavel: data.crc_responsavel,
        email_contato: data.email_contato,
        telefone: data.telefone,
      })
      .select()
      .single()
    if (error) throw new Error(error.message)
    escritorioId = novo.id

    await supabase
      .from('contador_org')
      .update({ escritorio_id: escritorioId })
      .eq('usuario_id', data.usuario_id)
  }

  revalidatePath('/escritorio')
  return escritorioId
}

// ── PLANO DE CONTAS EXTERNO (DO ESCRITÓRIO) ──────────────────────────────────

export async function getPlanoContasExterno(escritorioId: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('plano_contas_externo')
    .select('*')
    .eq('escritorio_id', escritorioId)
    .eq('ativo', true)
    .order('codigo')
  if (error) throw new Error(error.message)
  return data || []
}

export async function criarContaExterna(data: {
  escritorio_id: string
  codigo: string
  nome: string
  tipo: TipoConta
}) {
  const supabase = createAdminClient()
  const { error } = await supabase.from('plano_contas_externo').insert(data)
  if (error) throw new Error(error.message)
  revalidatePath('/escritorio/plano-de-contas')
}

export async function importarPlanoExternoParaOrg(
  escritorioId: string,
  orgId: string,
  contadorOrgId: string
) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('plano_contas_externo')
    .select('id')
    .eq('escritorio_id', escritorioId)
    .eq('ativo', true)
  if (error) throw new Error(error.message)
  if (!data || data.length === 0) throw new Error('Nenhuma conta cadastrada no escritório. Cadastre o plano de contas antes de importar.')
  return data.length
}

// ── DE/PARA ──────────────────────────────────────────────────────────────────

export async function getDePara(orgId: string, contadorOrgId: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('de_para_contas')
    .select(`
      *,
      conta_interna:conta_interna_id(codigo, nome),
      conta_externa:conta_externa_id(codigo, nome)
    `)
    .eq('org_id', orgId)
    .eq('contador_org_id', contadorOrgId)
  if (error) throw new Error(error.message)
  return data || []
}

export async function salvarDePara(data: {
  org_id: string
  contador_org_id: string
  conta_interna_id: string
  conta_externa_id: string
}) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('de_para_contas')
    .upsert(data, { onConflict: 'org_id,contador_org_id,conta_interna_id' })
  if (error) throw new Error(error.message)
  revalidatePath('/contabil/depara')
}

export async function removerDePara(id: string) {
  const supabase = createAdminClient()
  const { error } = await supabase.from('de_para_contas').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/contabil/depara')
}

// ── NF-E ─────────────────────────────────────────────────────────────────────

export async function getNFesImportadas(orgId: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('nfe_importadas')
    .select('*, itens:nfe_itens(*)')
    .eq('org_id', orgId)
    .order('data_emissao', { ascending: false })
  if (error) throw new Error(error.message)
  return data || []
}

export async function importarXMLNFe(orgId: string, xmlString: string, importadoPor: string) {
  const { XMLParser } = await import('fast-xml-parser')
  const parser = new XMLParser({ ignoreAttributes: false })
  const json = parser.parse(xmlString)

  const nfeProc = json.nfeProc || json
  const nfe = nfeProc?.NFe?.infNFe
  if (!nfe) throw new Error('XML inválido ou formato não reconhecido.')

  const ide = nfe.ide
  const emit = nfe.emit
  const dest = nfe.dest
  const total = nfe.total?.ICMSTot
  const dets = Array.isArray(nfe.det) ? nfe.det : [nfe.det].filter(Boolean)
  const chaveAcesso = nfeProc?.protNFe?.infProt?.chNFe
    || String(nfe['@_Id'] || '').replace('NFe', '')
    || ''

  const tipo = String(ide?.tpNF) === '0' ? 'entrada' : 'saida'

  const supabase = createAdminClient()

  const { data: nfeData, error: nfeError } = await supabase
    .from('nfe_importadas')
    .insert({
      org_id: orgId,
      chave_acesso: chaveAcesso,
      tipo,
      numero: String(ide?.nNF || ''),
      serie: String(ide?.serie || ''),
      data_emissao: String(ide?.dhEmi || ide?.dEmi || '').split('T')[0],
      cnpj_emitente: String(emit?.CNPJ || ''),
      nome_emitente: String(emit?.xNome || ''),
      cnpj_destinatario: String(dest?.CNPJ || dest?.CPF || ''),
      nome_destinatario: String(dest?.xNome || ''),
      valor_total: Number(total?.vNF || 0),
      valor_icms: Number(total?.vICMS || 0),
      valor_pis: Number(total?.vPIS || 0),
      valor_cofins: Number(total?.vCOFINS || 0),
      xml_original: xmlString,
      status: 'importada',
      importado_por: importadoPor,
    })
    .select()
    .single()

  if (nfeError) throw new Error(nfeError.message)

  if (dets.length > 0) {
    const itens = dets.map((det: any, idx: number) => ({
      nfe_id: nfeData.id,
      numero_item: idx + 1,
      codigo_produto: String(det.prod?.cProd || ''),
      descricao: String(det.prod?.xProd || ''),
      ncm: String(det.prod?.NCM || ''),
      cfop: String(det.prod?.CFOP || ''),
      unidade: String(det.prod?.uCom || ''),
      quantidade: Number(det.prod?.qCom || 0),
      valor_unitario: Number(det.prod?.vUnCom || 0),
      valor_total: Number(det.prod?.vProd || 0),
    }))
    const { error: itensError } = await supabase.from('nfe_itens').insert(itens)
    if (itensError) throw new Error(itensError.message)
  }

  revalidatePath('/contabil/nfe')
  return nfeData
}

export async function vincularNFeALancamento(nfeId: string, lancamentoId: string) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('nfe_importadas')
    .update({ lancamento_id: lancamentoId, status: 'vinculada' })
    .eq('id', nfeId)
  if (error) throw new Error(error.message)
  revalidatePath('/contabil/nfe')
}

export async function ignorarNFe(nfeId: string) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('nfe_importadas')
    .update({ status: 'ignorada' })
    .eq('id', nfeId)
  if (error) throw new Error(error.message)
  revalidatePath('/contabil/nfe')
}

// ── CONFIGURAÇÕES CONTÁBEIS ──────────────────────────────────────────────────

export async function getConfiguracaoContabil(orgId: string) {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('configuracoes_contabeis')
    .select('*')
    .eq('org_id', orgId)
    .single()
  return data
}

export async function salvarConfiguracaoContabil(data: {
  org_id: string
  percentual_fundo_reserva: number
  percentual_refac: number
  percentual_fates: number
  criterio_distribuicao: string
  classificacao_automatica?: boolean
  observacoes?: string
}) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('configuracoes_contabeis')
    .upsert({ ...data, updated_at: new Date().toISOString() }, { onConflict: 'org_id' })
  if (error) throw new Error(error.message)
  revalidatePath('/contabil/sobras')
}

// ── BALANÇO PATRIMONIAL ──────────────────────────────────────────────────────

export async function getBalancoPatrimonial(orgId: string, ano: number): Promise<{
  ativos: ItemBalancoPatrimonial[]
  passivos: ItemBalancoPatrimonial[]
  patrimonio: ItemBalancoPatrimonial[]
  totalAtivo: number
  totalPassivoMaisPatrimonio: number
  equilibrado: boolean
}> {
  const supabase = createAdminClient()
  const fimAno = `${ano}-12-31`
  const inicioAno = `${ano}-01-01`

  const { data: contas } = await supabase
    .from('plano_contas')
    .select('*')
    .eq('org_id', orgId)
    .eq('aceita_lancamento', true)
    .eq('ativo', true)
    .order('codigo')

  const { data: partidas } = await supabase
    .from('partidas')
    .select('*, lancamentos(data)')
    .eq('org_id', orgId)

  const partidasAno = (partidas || []).filter((p: any) => {
    const d = p.lancamentos?.data
    return d && d >= inicioAno && d <= fimAno
  })

  const ativos: ItemBalancoPatrimonial[] = []
  const passivos: ItemBalancoPatrimonial[] = []
  const patrimonio: ItemBalancoPatrimonial[] = []

  for (const conta of (contas || [])) {
    if (!['ATIVO', 'PASSIVO', 'PATRIMONIO_LIQUIDO'].includes(conta.tipo)) continue
    const saldo = calcularSaldoConta(conta, partidasAno)
    if (saldo === 0) continue
    const item: ItemBalancoPatrimonial = {
      grupo: conta.tipo,
      tipo: conta.tipo as any,
      conta_id: conta.id,
      codigo: conta.codigo,
      nome: conta.nome,
      nivel: conta.nivel,
      saldo: Math.abs(saldo),
    }
    if (conta.tipo === 'ATIVO') ativos.push(item)
    else if (conta.tipo === 'PASSIVO') passivos.push(item)
    else patrimonio.push(item)
  }

  const totalAtivo = ativos.reduce((s, i) => s + i.saldo, 0)
  const totalPassivo = passivos.reduce((s, i) => s + i.saldo, 0)
  const totalPatrimonio = patrimonio.reduce((s, i) => s + i.saldo, 0)
  const totalPassivoMaisPatrimonio = totalPassivo + totalPatrimonio
  const equilibrado = Math.abs(totalAtivo - totalPassivoMaisPatrimonio) < 0.01

  return { ativos, passivos, patrimonio, totalAtivo, totalPassivoMaisPatrimonio, equilibrado }
}

function calcularSaldoConta(conta: any, partidas: any[]): number {
  const deb = partidas
    .filter((p: any) => p.conta_debito_id === conta.id)
    .reduce((s: number, p: any) => s + Number(p.valor), 0)
  const cred = partidas
    .filter((p: any) => p.conta_credito_id === conta.id)
    .reduce((s: number, p: any) => s + Number(p.valor), 0)
  return conta.natureza === 'DEVEDORA' ? deb - cred : cred - deb
}

// ── LIVRO RAZÃO ──────────────────────────────────────────────────────────────

export async function getLivroRazao(
  orgId: string,
  contaId: string,
  dataInicio: string,
  dataFim: string
): Promise<ItemLivroRazao[]> {
  const supabase = createAdminClient()

  const { data: conta } = await supabase
    .from('plano_contas')
    .select('*')
    .eq('id', contaId)
    .single()
  if (!conta) throw new Error('Conta não encontrada.')

  const { data: partidas } = await supabase
    .from('partidas')
    .select('*, lancamentos(data, descricao)')
    .eq('org_id', orgId)
    .or(`conta_debito_id.eq.${contaId},conta_credito_id.eq.${contaId}`)
    .order('classificado_em')

  const filtradas = (partidas || []).filter((p: any) => {
    const d = p.lancamentos?.data
    return d && d >= dataInicio && d <= dataFim
  })

  let saldo = 0
  const itens: ItemLivroRazao[] = filtradas.map((p: any) => {
    const isDebito = p.conta_debito_id === contaId
    const debito = isDebito ? Number(p.valor) : 0
    const credito = !isDebito ? Number(p.valor) : 0
    if (conta.natureza === 'DEVEDORA') saldo += debito - credito
    else saldo += credito - debito
    return {
      data: p.lancamentos?.data || '',
      lancamento_id: p.lancamento_id,
      descricao: p.lancamentos?.descricao || '',
      debito,
      credito,
      saldo_progressivo: saldo,
      historico: p.historico,
    }
  })

  return itens
}

// ── SOBRAS / REFAC ───────────────────────────────────────────────────────────

export async function calcularSobras(orgId: string, ano: number) {
  const supabase = createAdminClient()
  const tipoOrg = await getTipoOrg(orgId)
  const terminologia = getTerminologia(tipoOrg)
  const inicioAno = `${ano}-01-01`
  const fimAno = `${ano}-12-31`

  const config = await getConfiguracaoContabil(orgId)

  const percFundoReserva = terminologia.fundoObrigatorio
    ? Math.max(Number(config?.percentual_fundo_reserva || 10), 10)
    : Number(config?.percentual_fundo_reserva || 0)
  const percRefac = terminologia.refacObrigatorio
    ? Number(config?.percentual_refac || 5)
    : Number(config?.percentual_refac || 0)
  const percFates = Number(config?.percentual_fates || 0)

  const { data: contas } = await supabase
    .from('plano_contas')
    .select('*')
    .eq('org_id', orgId)
    .eq('ativo', true)
    .in('tipo', ['RECEITA', 'DESPESA'])

  const { data: partidas } = await supabase
    .from('partidas')
    .select('*, lancamentos(data)')
    .eq('org_id', orgId)

  const partidasAno = (partidas || []).filter((p: any) => {
    const d = p.lancamentos?.data
    return d && d >= inicioAno && d <= fimAno
  })

  let totalReceitas = 0
  let totalDespesas = 0

  for (const conta of (contas || [])) {
    const saldo = calcularSaldoConta(conta, partidasAno)
    if (conta.tipo === 'RECEITA') totalReceitas += Math.max(saldo, 0)
    else totalDespesas += Math.max(saldo, 0)
  }

  const sobrasBrutas = totalReceitas - totalDespesas
  const fundoReserva = sobrasBrutas > 0 ? (sobrasBrutas * percFundoReserva) / 100 : 0
  const refac = sobrasBrutas > 0 ? (sobrasBrutas * percRefac) / 100 : 0
  const fates = sobrasBrutas > 0 ? (sobrasBrutas * percFates) / 100 : 0
  const sobrasDistribuiveis = terminologia.distribuiResultado
    ? sobrasBrutas - fundoReserva - refac - fates
    : 0

  return {
    totalReceitas,
    totalDespesas,
    sobrasBrutas,
    percFundoReserva,
    fundoReserva,
    percRefac,
    refac,
    percFates,
    fates,
    sobrasDistribuiveis,
    config,
    tipoOrg,
    terminologia,
  }
}

// ── FECHAMENTO DE EXERCÍCIO ──────────────────────────────────────────────────

export async function getFechamento(orgId: string, exercicioId: string) {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('fechamentos_exercicio')
    .select('*')
    .eq('org_id', orgId)
    .eq('exercicio_id', exercicioId)
    .single()
  return data
}

export async function fecharExercicio(data: {
  org_id: string
  exercicio_id: string
  sobras_brutas: number
  fundo_reserva: number
  refac: number
  fates: number
  sobras_distribuiveis: number
  fechado_por: string
  fechado_por_perfil: 'contador' | 'admin'
  crc_contador?: string
  observacoes?: string
}) {
  const supabase = createAdminClient()
  const crypto = await import('crypto')

  const conteudo = JSON.stringify({
    org_id: data.org_id,
    exercicio_id: data.exercicio_id,
    sobras_brutas: data.sobras_brutas,
    fundo_reserva: data.fundo_reserva,
    refac: data.refac,
    sobras_distribuiveis: data.sobras_distribuiveis,
    fechado_por: data.fechado_por,
    timestamp: new Date().toISOString(),
  })
  const hash = crypto.createHash('sha256').update(conteudo).digest('hex')

  const { error: fechError } = await supabase.from('fechamentos_exercicio').insert({
    ...data,
    hash_fechamento: hash,
  })
  if (fechError) throw new Error(fechError.message)

  const { error: exError } = await supabase
    .from('exercicios_contabeis')
    .update({
      status: 'ENCERRADO',
      data_encerramento: new Date().toISOString().split('T')[0],
      encerrado_por: data.fechado_por,
      encerrado_em: new Date().toISOString(),
      hash_fechamento: hash,
    })
    .eq('id', data.exercicio_id)
  if (exError) throw new Error(exError.message)

  registrarLog({
    org_id: data.org_id,
    usuario_id: data.fechado_por,
    acao: 'fechar_exercicio',
    modulo: 'contabil',
    descricao: `Exercício fechado`,
    dados_depois: { exercicio_id: data.exercicio_id, hash_sha256: hash, fechado_por: data.fechado_por },
  }).catch(e => console.error('[audit]', e))

  revalidatePath('/contabil/sobras')
  revalidatePath('/contabil/balancete')
  return hash
}

// ── LIVRO DIÁRIO ─────────────────────────────────────────────────────────────

export async function getLivroDiario(orgId: string, exercicioId: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('partidas')
    .select(`
      *,
      lancamentos(data, descricao),
      conta_debito:conta_debito_id(codigo, nome),
      conta_credito:conta_credito_id(codigo, nome)
    `)
    .eq('org_id', orgId)
    .eq('exercicio_id', exercicioId)
    .order('classificado_em')
  if (error) throw new Error(error.message)
  return (data || []).map((p: any, idx: number) => ({
    numero: idx + 1,
    data: p.lancamentos?.data || '',
    historico: p.historico || p.lancamentos?.descricao || '',
    conta_debito_codigo: p.conta_debito?.codigo || '',
    conta_debito_nome: p.conta_debito?.nome || '',
    conta_credito_codigo: p.conta_credito?.codigo || '',
    conta_credito_nome: p.conta_credito?.nome || '',
    valor: Number(p.valor),
  }))
}

// ── DISTRIBUIÇÃO DE SOBRAS ───────────────────────────────────────────────────

export async function calcularDistribuicaoSobras(orgId: string, fechamentoId: string) {
  const supabase = createAdminClient()

  const { data: fechamento } = await supabase
    .from('fechamentos_exercicio')
    .select('*')
    .eq('id', fechamentoId)
    .single()
  if (!fechamento) throw new Error('Fechamento não encontrado.')

  const sobrasDistribuiveis = Number(fechamento.sobras_distribuiveis)
  if (sobrasDistribuiveis <= 0) throw new Error('Não há sobras distribuíveis neste exercício.')

  const config = await getConfiguracaoContabil(orgId)
  const criterio = config?.criterio_distribuicao || 'igualitario'

  const { data: cooperados } = await supabase
    .from('cooperados')
    .select('id, nome, cpf')
    .eq('organizacao_id', orgId)
    .eq('status', 'ativo')
  if (!cooperados || cooperados.length === 0) throw new Error('Nenhum cooperado ativo.')

  const total = cooperados.length
  const distribuicoes = cooperados.map((c: any) => {
    const percentual = (1 / total) * 100
    const valorSobras = (sobrasDistribuiveis * percentual) / 100
    return {
      org_id: orgId,
      fechamento_id: fechamentoId,
      cooperado_id: c.id,
      valor_operacoes: 0,
      percentual,
      valor_sobras: valorSobras,
      status: 'calculado',
    }
  })

  const { error } = await supabase
    .from('distribuicao_sobras')
    .upsert(distribuicoes, { onConflict: 'fechamento_id,cooperado_id' })
  if (error) throw new Error(error.message)

  revalidatePath('/contabil/sobras')
  return distribuicoes
}

export async function getDistribuicaoSobras(fechamentoId: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('distribuicao_sobras')
    .select('*, cooperado:cooperado_id(nome, cpf)')
    .eq('fechamento_id', fechamentoId)
    .order('valor_sobras', { ascending: false })
  if (error) throw new Error(error.message)
  return data || []
}

export async function atualizarStatusDistribuicao(id: string, status: 'pago' | 'retido') {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('distribuicao_sobras')
    .update({ status })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/contabil/sobras')
}

// ── EXPORTAÇÃO SPED ECD ──────────────────────────────────────────────────────

export async function gerarSpedECD(orgId: string, ano: number): Promise<string> {
  const supabase = createAdminClient()

  const { data: org } = await supabase
    .from('organizacoes')
    .select('*')
    .eq('id', orgId)
    .single()
  if (!org) throw new Error('Organização não encontrada.')

  const { data: contas } = await supabase
    .from('plano_contas')
    .select('*')
    .eq('org_id', orgId)
    .eq('ativo', true)
    .order('codigo')

  const { data: partidas } = await supabase
    .from('partidas')
    .select('*, lancamentos(data, descricao)')
    .eq('org_id', orgId)

  const partidasAno = (partidas || []).filter((p: any) => {
    const d = p.lancamentos?.data
    return d && d.startsWith(String(ano))
  })

  const linhas: string[] = []
  const dtIni = `0101${ano}`
  const dtFin = `3112${ano}`

  // Registro 0000 — Abertura
  linhas.push(`|0000|LECD|${dtIni}|${dtFin}|${org.nome || ''}|${(org.cnpj || '').replace(/\D/g, '')}|||||N|`)
  linhas.push(`|0001|0|`)
  linhas.push(`|0007|PLANO DE CONTAS NEXCOOP|`)

  // Bloco I
  linhas.push(`|I001|0|`)
  linhas.push(`|I010|G|${dtIni}|${dtFin}|${org.nome || ''}|${(org.cnpj || '').replace(/\D/g, '')}|||||`)

  // I050 — Plano de contas
  for (const conta of (contas || [])) {
    const tipo = conta.tipo === 'ATIVO' ? 'A'
               : conta.tipo === 'PASSIVO' ? 'P'
               : conta.tipo === 'PATRIMONIO_LIQUIDO' ? 'P'
               : conta.tipo === 'RECEITA' ? 'R' : 'D'
    const nat = conta.natureza === 'DEVEDORA' ? 'D' : 'C'
    linhas.push(`|I050|${conta.codigo}|${conta.parent_id ? '1' : '0'}|${conta.nome}|${tipo}|${nat}|${conta.aceita_lancamento ? 'S' : 'N'}|`)
  }

  // I200 — Lançamentos
  for (const partida of partidasAno) {
    const data = (partida.lancamentos?.data || '').replace(/-/g, '')
    const hist = (partida.historico || partida.lancamentos?.descricao || '').slice(0, 200)
    linhas.push(`|I200|${data}|${hist}|${Number(partida.valor).toFixed(2)}|D|`)
  }

  const blocoICount = linhas.filter(l => l.startsWith('|I')).length
  linhas.push(`|I990|${blocoICount + 1}|`)

  // Bloco 9
  linhas.push(`|9001|0|`)
  linhas.push(`|9900|0000|1|`)
  linhas.push(`|9900|I001|1|`)
  linhas.push(`|9900|I990|1|`)
  linhas.push(`|9900|9001|1|`)
  linhas.push(`|9900|9990|1|`)
  linhas.push(`|9900|9999|1|`)
  const bloco9Count = linhas.filter(l => l.startsWith('|9')).length
  linhas.push(`|9990|${bloco9Count + 1}|`)
  linhas.push(`|9999|${linhas.length + 1}|`)

  const resultado = linhas.join('\n')

  registrarLog({
    org_id: orgId,
    acao: 'exportar',
    modulo: 'contabil',
    descricao: `SPED ECD exportado — período ${ano}`,
    dados_depois: { ano, linhas: linhas.length },
  }).catch(e => console.error('[audit]', e))

  return resultado
}

// ── DADOS PARA RELATÓRIOS PDF ─────────────────────────────────────────────────

export async function getDadosRelatorioPDF(orgId: string, tipo: string, ano: number, mes?: number) {
  switch (tipo) {
    case 'balancete':
      return getBalancete(orgId, mes || new Date().getMonth() + 1, ano)
    case 'dre':
      return getDRE(orgId, ano)
    case 'balanco':
      return getBalancoPatrimonial(orgId, ano)
    default:
      throw new Error('Tipo de relatório não suportado.')
  }
}

// ── CONCILIAÇÃO BANCÁRIA ──────────────────────────────────────────────────────

export async function getExtratos(orgId: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('extratos_bancarios')
    .select('*')
    .eq('org_id', orgId)
    .order('data_inicio', { ascending: false })
  if (error) throw new Error(error.message)
  return data || []
}

export async function importarExtratoCSV(
  orgId: string,
  csvText: string,
  banco: string,
  userId: string
) {
  const supabase = createAdminClient()
  const linhas = csvText.split('\n').filter(l => l.trim())
  const itens: any[] = []
  let dataInicio: string | null = null
  let dataFim: string | null = null
  let totalCreditos = 0
  let totalDebitos = 0

  for (const linha of linhas.slice(1)) {
    const cols = linha.split(',').map(c => c.trim().replace(/"/g, ''))
    if (cols.length < 3) continue
    const dataRaw = cols[0]
    const descricao = cols[1]
    let valor = 0
    let tipo: 'credito' | 'debito' = 'credito'

    if (cols.length >= 4) {
      const debito  = parseFloat(cols[2].replace(',', '.') || '0')
      const credito = parseFloat(cols[3].replace(',', '.') || '0')
      if (debito > 0) { valor = debito; tipo = 'debito' }
      else { valor = credito; tipo = 'credito' }
    } else {
      const v = parseFloat(cols[2].replace(',', '.') || '0')
      valor = Math.abs(v)
      tipo = v < 0 ? 'debito' : 'credito'
    }
    if (valor === 0) continue

    let dataISO = dataRaw
    if (dataRaw.includes('/')) {
      const [d, m, y] = dataRaw.split('/')
      dataISO = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    }
    if (!dataInicio || dataISO < dataInicio) dataInicio = dataISO
    if (!dataFim    || dataISO > dataFim)    dataFim    = dataISO
    if (tipo === 'credito') totalCreditos += valor
    else totalDebitos += valor
    itens.push({ data: dataISO, descricao, valor, tipo, status: 'pendente' })
  }

  if (itens.length === 0) throw new Error('Nenhum item válido encontrado no arquivo CSV.')

  const { data: extrato, error } = await supabase
    .from('extratos_bancarios')
    .insert({ org_id: orgId, banco, data_inicio: dataInicio, data_fim: dataFim, total_creditos: totalCreditos, total_debitos: totalDebitos, status: 'importado', importado_por: userId })
    .select().single()
  if (error) throw new Error(error.message)

  const { error: itensError } = await supabase
    .from('extrato_itens')
    .insert(itens.map(i => ({ ...i, extrato_id: extrato.id })))
  if (itensError) throw new Error(itensError.message)

  revalidatePath('/contabil/conciliacao')
  return extrato
}

export async function getItensConciliacao(extratoId: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('extrato_itens')
    .select('*, lancamento:lancamento_id(descricao, valor, data_competencia)')
    .eq('extrato_id', extratoId)
    .order('data')
  if (error) throw new Error(error.message)
  return data || []
}

export async function conciliarItem(itemId: string, lancamentoId: string) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('extrato_itens')
    .update({ lancamento_id: lancamentoId, status: 'conciliado' })
    .eq('id', itemId)
  if (error) throw new Error(error.message)
  revalidatePath('/contabil/conciliacao')
}

export async function ignorarItemExtrato(itemId: string) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('extrato_itens')
    .update({ status: 'ignorado' })
    .eq('id', itemId)
  if (error) throw new Error(error.message)
  revalidatePath('/contabil/conciliacao')
}

export async function getLancamentosParaConciliar(orgId: string, dataInicio: string, dataFim: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('lancamentos')
    .select('*')
    .eq('organizacao_id', orgId)
    .gte('data_competencia', dataInicio)
    .lte('data_competencia', dataFim)
    .order('data_competencia')
  if (error) throw new Error(error.message)
  return data || []
}

// ── CALENDÁRIO DE OBRIGAÇÕES ──────────────────────────────────────────────────

export async function getObrigacoes(orgId: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('obrigacoes_acessorias')
    .select('*')
    .eq('org_id', orgId)
    .eq('ativo', true)
    .order('dia_vencimento')
  if (error) throw new Error(error.message)
  return data || []
}

export async function criarObrigacao(data: {
  org_id: string
  nome: string
  descricao?: string
  periodicidade: string
  dia_vencimento: number
  responsavel?: string
}) {
  const supabase = createAdminClient()
  const { error } = await supabase.from('obrigacoes_acessorias').insert(data)
  if (error) throw new Error(error.message)
  revalidatePath('/contabil/calendario')
}

export async function seedObrigacoesCooperativa(orgId: string) {
  const supabase = createAdminClient()
  const obrigacoes = [
    { org_id: orgId, nome: 'SPED ECD', descricao: 'Escrituracao Contabil Digital', periodicidade: 'anual', dia_vencimento: 31, responsavel: 'Contador' },
    { org_id: orgId, nome: 'ECF', descricao: 'Escrituracao Contabil Fiscal', periodicidade: 'anual', dia_vencimento: 31, responsavel: 'Contador' },
    { org_id: orgId, nome: 'EFD-Reinf', descricao: 'Escrituracao Fiscal Digital de Retencoes', periodicidade: 'mensal', dia_vencimento: 15, responsavel: 'Contador' },
    { org_id: orgId, nome: 'DCTF', descricao: 'Declaracao de Debitos e Creditos Tributarios Federais', periodicidade: 'mensal', dia_vencimento: 15, responsavel: 'Contador' },
    { org_id: orgId, nome: 'Folha de Pagamento', descricao: 'Fechamento e processamento da folha', periodicidade: 'mensal', dia_vencimento: 5, responsavel: 'RH/Contador' },
    { org_id: orgId, nome: 'INSS/FGTS', descricao: 'Recolhimento de encargos trabalhistas', periodicidade: 'mensal', dia_vencimento: 20, responsavel: 'Contador' },
    { org_id: orgId, nome: 'Assembleia Geral Ordinaria', descricao: 'AGO anual obrigatoria', periodicidade: 'anual', dia_vencimento: 120, responsavel: 'Diretoria' },
  ]
  const { error } = await supabase.from('obrigacoes_acessorias').insert(obrigacoes)
  if (error) throw new Error(error.message)
  revalidatePath('/contabil/calendario')
}

export async function getOcorrenciasMes(orgId: string, mes: number, ano: number) {
  const supabase = createAdminClient()
  const { data: obrigacoes } = await supabase
    .from('obrigacoes_acessorias')
    .select('*')
    .eq('org_id', orgId)
    .eq('ativo', true)

  const hoje = new Date().toISOString().split('T')[0]
  const ocorrencias: any[] = []

  for (const ob of (obrigacoes || [])) {
    const deveAparecerNoMes =
      ob.periodicidade === 'mensal' ||
      (ob.periodicidade === 'trimestral' && [1, 4, 7, 10].includes(mes)) ||
      (ob.periodicidade === 'semestral'  && [1, 7].includes(mes)) ||
      (ob.periodicidade === 'anual'      && mes === 1)

    if (!deveAparecerNoMes) continue

    const diasNoMes = new Date(ano, mes, 0).getDate()
    const dia = Math.min(ob.dia_vencimento, diasNoMes)
    const dataVenc = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`

    const { data: existente } = await supabase
      .from('obrigacoes_ocorrencias')
      .select('*')
      .eq('org_id', orgId)
      .eq('obrigacao_id', ob.id)
      .eq('data_vencimento', dataVenc)
      .single()

    ocorrencias.push({
      obrigacao: ob,
      ocorrencia: existente || null,
      data_vencimento: dataVenc,
      atrasada: !existente && dataVenc < hoje,
    })
  }

  return ocorrencias.sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento))
}

export async function marcarObrigacaoEntregue(
  orgId: string,
  obrigacaoId: string,
  dataVencimento: string,
  observacao?: string
) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('obrigacoes_ocorrencias')
    .upsert({
      org_id: orgId,
      obrigacao_id: obrigacaoId,
      data_vencimento: dataVencimento,
      status: 'entregue',
      entregue_em: new Date().toISOString(),
      observacao,
    }, { onConflict: 'org_id,obrigacao_id,data_vencimento' })
  if (error) throw new Error(error.message)
  revalidatePath('/contabil/calendario')
}
