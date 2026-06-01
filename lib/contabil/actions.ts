'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { ContaContabil, ItemBalancete, ItemDRE, TipoConta, NaturezaConta, ItemBalancoPatrimonial, ItemLivroRazao } from './types'

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

// ── ESCRITURAÇÃO ─────────────────────────────────────────────────────────────

export async function getLancamentosPendentes(orgId: string) {
  const supabase = createAdminClient()
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
  const inicioAno = `${ano}-01-01`
  const fimAno = `${ano}-12-31`

  const config = await getConfiguracaoContabil(orgId)
  const percFundoReserva = Number(config?.percentual_fundo_reserva || 10)
  const percRefac = Number(config?.percentual_refac || 5)
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
  const sobrasDistribuiveis = sobrasBrutas - fundoReserva - refac - fates

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

  revalidatePath('/contabil/sobras')
  revalidatePath('/contabil/balancete')
  return hash
}
