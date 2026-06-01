'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { ContaContabil, ItemBalancete, ItemDRE } from './types'

// ── PLANO DE CONTAS ──────────────────────────────────────────────────────────

export async function getPlanoContas(orgId: string): Promise<ContaContabil[]> {
  const supabase = await createClient()
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
  tipo: string
  natureza: string
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

function gerarPlanoContasPadrao(orgId: string) {
  return [
    { org_id: orgId, codigo: '1', nome: 'ATIVO', tipo: 'ATIVO', natureza: 'DEVEDORA', nivel: 1, aceita_lancamento: false },
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

// ── ESCRITURAÇÃO ─────────────────────────────────────────────────────────────

export async function getLancamentosPendentes(orgId: string) {
  const supabase = await createClient()
  const { data: todos, error } = await supabase
    .from('lancamentos')
    .select('*')
    .eq('org_id', orgId)
    .order('data', { ascending: false })
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
  revalidatePath('/contabil/escrituracao')
}

// ── BALANCETE ────────────────────────────────────────────────────────────────

export async function getBalancete(orgId: string, mes: number, ano: number): Promise<ItemBalancete[]> {
  const supabase = await createClient()
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
  const supabase = await createClient()
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

  itens.push({
    grupo: 'RESULTADO',
    descricao: 'Sobras (Perdas) do Exercício',
    valor: totalReceitas - totalDespesas,
    tipo: 'resultado',
  })
  return itens
}

// ── EXERCÍCIOS ───────────────────────────────────────────────────────────────

export async function getExercicioAtivo(orgId: string) {
  const supabase = await createClient()
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
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('contador_org')
    .select('*, usuarios:usuario_id(nome, email)')
    .eq('org_id', orgId)
  if (error) throw new Error(error.message)
  return data || []
}

export async function convidarContador(orgId: string, email: string, nivel: 'contador' | 'contador_aux') {
  const supabase = createAdminClient()
  const { data: user } = await supabase.auth.admin.getUserByEmail(email)
  if (!user?.user) throw new Error('Usuário não encontrado. O contador precisa ter uma conta no NexCoop.')
  const { error } = await supabase.from('contador_org').insert({
    org_id: orgId,
    usuario_id: user.user.id,
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
