'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { registrarLog } from '@/lib/audit/logger'
import { isAdmin } from '@/lib/permissoes'
import { randomBytes } from 'crypto'
import { enviarEmail } from '@/lib/email'
import { traduzirErro } from '@/lib/utils/erros'
import { tipoProdutorPorStatusCooperado } from '@/lib/cooperados/produtor-utils'
import type { RoleUsuario, StatusCooperado, VinculoUsuario } from '@/types/database'

// ── Criar cooperado (chamado pela página /cooperados/novo) ────────────────────

export async function inserirCooperado(payload: {
  tipo: 'pessoa_fisica' | 'pessoa_juridica'
  nome_completo: string
  cpf: string | null
  rg: string | null
  data_nascimento: string | null
  sexo: 'M' | 'F' | 'outro' | null
  cnpj_pj: string | null
  representante_nome: string | null
  representante_cpf: string | null
  conjuge_nome: string | null
  conjuge_cpf: string | null
  email: string | null
  telefone: string | null
  whatsapp: string | null
  cep: string | null
  logradouro: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  cidade: string | null
  estado: string | null
  nome_propriedade: string | null
  area_total_ha: number | null
  latitude: number | null
  longitude: number | null
  caf_numero: string | null
  caf_situacao: string | null
  caf_validade: string | null
  dap_numero: string | null
  status: StatusCooperado
  data_admissao: string | null
  numero_matricula: string | null
  motivo_saida: string | null
}): Promise<{ data?: { id: string }; error?: string }> {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const admin = createAdminClient()
  const { data: usuario } = await admin
    .from('usuarios')
    .select('organizacao_id')
    .eq('id', user.id)
    .single()
  if (!usuario?.organizacao_id) return { error: 'Usuário sem organização vinculada.' }

  const { data, error } = await admin
    .from('cooperados')
    .insert({ ...payload, organizacao_id: usuario.organizacao_id })
    .select()
    .single()

  if (error) return { error: traduzirErro(error.message) }
  revalidatePath('/cooperados')
  return { data: { id: data.id } }
}

function gerarSenhaTemporaria(): string {
  return randomBytes(6).toString('hex') // 12 chars hex
}

async function verificarAdmin() {
  const serverClient = await createClient()
  const { data: { user }, error } = await serverClient.auth.getUser()
  if (error || !user) throw new Error('Não autenticado')

  const { data: usuarioAtual } = await serverClient
    .from('usuarios')
    .select('role, funcoes, organizacao_id, email')
    .eq('id', user.id)
    .single()
  if (!usuarioAtual) throw new Error('Usuário não encontrado')
  if (!isAdmin(usuarioAtual)) throw new Error('Sem permissão: requer role admin')

  return { userId: user.id, usuarioAtual }
}

// ── Fluxo 1: Criar usuário com cooperado opcional ─────────────────────────────

interface DadosCooperadoOpcional {
  nome_completo?: string
  rg?: string
  data_nascimento?: string
  sexo?: 'M' | 'F' | 'outro'
  conjuge_nome?: string
  conjuge_cpf?: string
  cep?: string
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  cidade?: string
  estado?: string
  nome_propriedade?: string
  area_total_ha?: number
  caf_numero?: string
  caf_situacao?: string
  caf_validade?: string
  dap_numero?: string
  numero_matricula?: string
  data_admissao?: string
  quota_parte?: number
  tipo?: 'pessoa_fisica' | 'pessoa_juridica'
}

interface DadosProdutorOpcional {
  municipio?: string
  endereco?: string
  area_cacau_ha?: number
  tipo?: string
}

interface CriarUsuarioComCooperadoInput {
  nome: string
  email: string
  cpf: string
  funcoes: string[]
  vinculo: string
  ehCooperado: boolean
  dadosCooperado?: DadosCooperadoOpcional
  dadosProdutor?: DadosProdutorOpcional
}

export async function criarUsuarioComCooperadoOpcional(
  organizacaoId: string,
  input: CriarUsuarioComCooperadoInput
) {
  const { userId: adminId, usuarioAtual } = await verificarAdmin()
  const admin = createAdminClient()

  // 1. Criar usuário no Supabase Auth
  const senhaTemporaria = gerarSenhaTemporaria()
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: input.email,
    password: senhaTemporaria,
    email_confirm: true,
  })
  if (authError || !authData.user) {
    if (
      authError?.message?.toLowerCase().includes('already registered') ||
      authError?.message?.toLowerCase().includes('already exists') ||
      (authError as any)?.status === 422
    ) {
      return { success: false as const, error: 'Este e-mail já está cadastrado no sistema. Informe um e-mail diferente.' }
    }
    return { success: false as const, error: `Erro ao criar acesso: ${authError?.message}` }
  }
  const authUserId = authData.user.id

  // 2. Inserir na tabela usuarios
  const { error: usuarioError } = await admin.from('usuarios').insert({
    id: authUserId,
    organizacao_id: organizacaoId,
    nome_completo: input.nome,
    cpf: input.cpf ?? null,
    email: input.email,
    role: 'cooperado' as RoleUsuario,
    funcoes: input.funcoes,
    vinculo: input.vinculo as VinculoUsuario,
    ativo: true,
  })
  if (usuarioError) {
    await admin.auth.admin.deleteUser(authUserId).catch(() => null)
    return { success: false as const, error: `Erro ao criar usuário: ${usuarioError.message}` }
  }

  let cooperadoId: string | undefined
  let produtorId: string | undefined

  // 3. Se ehCooperado, criar cooperado + produtor espelho vinculado
  if (input.ehCooperado) {
    const dc = input.dadosCooperado ?? {}

    const { data: cooperado, error: cooperadoError } = await admin
      .from('cooperados')
      .insert({
        organizacao_id: organizacaoId,
        usuario_id: authUserId,
        nome_completo: dc.nome_completo ?? input.nome,
        cpf: input.cpf ?? null,
        rg: dc.rg ?? null,
        data_nascimento: dc.data_nascimento ?? null,
        sexo: dc.sexo ?? null,
        conjuge_nome: dc.conjuge_nome ?? null,
        conjuge_cpf: dc.conjuge_cpf ?? null,
        email: input.email,
        cep: dc.cep ?? null,
        logradouro: dc.logradouro ?? null,
        numero: dc.numero ?? null,
        complemento: dc.complemento ?? null,
        bairro: dc.bairro ?? null,
        cidade: dc.cidade ?? null,
        estado: dc.estado ?? null,
        nome_propriedade: dc.nome_propriedade ?? null,
        area_total_ha: dc.area_total_ha ?? null,
        caf_numero: dc.caf_numero ?? null,
        caf_situacao: dc.caf_situacao ?? null,
        caf_validade: dc.caf_validade ?? null,
        dap_numero: dc.dap_numero ?? null,
        numero_matricula: dc.numero_matricula ?? null,
        data_admissao: dc.data_admissao ?? null,
        quota_parte: dc.quota_parte ?? null,
        tipo: dc.tipo ?? 'pessoa_fisica',
        status: 'ativo',
      })
      .select('id')
      .single()
    if (cooperadoError || !cooperado) {
      return { success: false as const, error: `Erro ao criar cooperado: ${cooperadoError?.message}` }
    }
    cooperadoId = cooperado.id

    const dp = input.dadosProdutor ?? {}
    const { data: produtor, error: produtorError } = await admin
      .from('produtores')
      .insert({
        organizacao_id: organizacaoId,
        nome: input.nome,
        cpf: input.cpf ?? null,
        email: input.email,
        usuario_id: authUserId,
        cooperado_id: cooperadoId,
        tipo: 'cooperado',
        municipio: dp.municipio ?? null,
        endereco: dp.endereco ?? null,
        area_cacau_ha: dp.area_cacau_ha ?? null,
        conjuge_nome: dc.conjuge_nome ?? null,
        conjuge_cpf: dc.conjuge_cpf ?? null,
        ativo: true,
      } as any)
      .select('id')
      .single()
    if (produtorError || !produtor) {
      return { success: false as const, error: `Erro ao criar produtor: ${produtorError?.message}` }
    }
    produtorId = produtor.id
  }

  // 4. Log (non-blocking)
  registrarLog({
    org_id: organizacaoId,
    usuario_id: adminId,
    usuario_email: usuarioAtual.email,
    acao: 'criar',
    modulo: 'usuarios',
    descricao: `Usuário criado: ${input.nome} (${input.email})${input.ehCooperado ? ' + cooperado' : ''}`,
    dados_depois: { usuarioId: authUserId, cooperadoId, produtorId, ehCooperado: input.ehCooperado },
  }).catch(e => console.error('[audit]', e))

  revalidatePath('/usuarios')
  revalidatePath('/cooperados')
  revalidatePath('/dashboard')

  return { success: true, usuarioId: authUserId, cooperadoId, produtorId, senhaTemporaria }
}

// ── Fluxo 2: Criar cooperado (sempre cria usuario + cooperado + produtor) ──────

interface CriarCooperadoInput {
  nome: string
  cpf: string
  email: string
  rg?: string
  data_nascimento?: string
  sexo?: 'M' | 'F' | 'outro'
  conjuge_nome?: string
  conjuge_cpf?: string
  telefone?: string
  whatsapp?: string
  cep?: string
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  cidade?: string
  estado?: string
  nome_propriedade?: string
  area_total_ha?: number
  caf_numero?: string
  caf_situacao?: string
  caf_validade?: string
  dap_numero?: string
  numero_matricula?: string
  data_admissao?: string
  quota_parte?: number
  tipo?: 'pessoa_fisica' | 'pessoa_juridica'
}

export async function criarCooperado(
  organizacaoId: string,
  input: CriarCooperadoInput
) {
  const { userId: adminId, usuarioAtual } = await verificarAdmin()
  const admin = createAdminClient()

  // 1. Criar usuário no Supabase Auth com senha temporária
  const senhaTemporaria = gerarSenhaTemporaria()
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: input.email,
    password: senhaTemporaria,
    email_confirm: true,
  })
  if (authError || !authData.user) {
    if (
      authError?.message?.toLowerCase().includes('already registered') ||
      authError?.message?.toLowerCase().includes('already exists') ||
      (authError as any)?.status === 422
    ) {
      return { success: false as const, error: 'Este e-mail já está cadastrado no sistema. Informe um e-mail diferente.' }
    }
    return { success: false as const, error: `Erro ao criar acesso: ${authError?.message}` }
  }
  const authUserId = authData.user.id

  // 2. Inserir na tabela usuarios
  // TODO: terminologia dinâmica via tipos_org para vinculo ('cooperado')
  const { error: usuarioError } = await admin.from('usuarios').insert({
    id: authUserId,
    organizacao_id: organizacaoId,
    nome_completo: input.nome,
    cpf: input.cpf ?? null,
    email: input.email,
    role: 'cooperado' as RoleUsuario,
    funcoes: [],
    vinculo: 'cooperado' as VinculoUsuario,
    ativo: true,
    // TODO: marcar troca_senha_obrigatoria: true quando coluna existir
  })
  if (usuarioError) {
    await admin.auth.admin.deleteUser(authUserId).catch(() => null)
    return { success: false as const, error: `Erro ao criar usuário: ${usuarioError.message}` }
  }

  // 3. Criar cooperado (colunas estruturadas 1:1 com a tabela)
  const { data: cooperado, error: cooperadoError } = await admin
    .from('cooperados')
    .insert({
      organizacao_id: organizacaoId,
      usuario_id: authUserId,
      nome_completo: input.nome,
      cpf: input.cpf ?? null,
      rg: input.rg ?? null,
      data_nascimento: input.data_nascimento ?? null,
      sexo: input.sexo ?? null,
      conjuge_nome: input.conjuge_nome ?? null,
      conjuge_cpf: input.conjuge_cpf ?? null,
      email: input.email,
      telefone: input.telefone ?? null,
      whatsapp: input.whatsapp ?? null,
      cep: input.cep ?? null,
      logradouro: input.logradouro ?? null,
      numero: input.numero ?? null,
      complemento: input.complemento ?? null,
      bairro: input.bairro ?? null,
      cidade: input.cidade ?? null,
      estado: input.estado ?? null,
      nome_propriedade: input.nome_propriedade ?? null,
      area_total_ha: input.area_total_ha ?? null,
      caf_numero: input.caf_numero ?? null,
      caf_situacao: input.caf_situacao ?? null,
      caf_validade: input.caf_validade ?? null,
      dap_numero: input.dap_numero ?? null,
      numero_matricula: input.numero_matricula ?? null,
      data_admissao: input.data_admissao ?? null,
      quota_parte: input.quota_parte ?? null,
      tipo: input.tipo ?? 'pessoa_fisica',
      status: 'ativo',
    })
    .select('id')
    .single()
  if (cooperadoError || !cooperado) {
    await admin.auth.admin.deleteUser(authUserId).catch(() => null)
    return { success: false as const, error: `Erro ao criar cooperado: ${cooperadoError?.message}` }
  }

  // 4. Criar produtor espelho vinculado ao cooperado
  const { data: produtor, error: produtorError } = await admin
    .from('produtores')
    .insert({
      organizacao_id: organizacaoId,
      nome: input.nome,
      cpf: input.cpf ?? null,
      email: input.email,
      telefone: input.telefone ?? null,
      usuario_id: authUserId,
      cooperado_id: cooperado.id,
      tipo: 'cooperado',
      nome_propriedade: input.nome_propriedade ?? null,
      area_total_ha: input.area_total_ha ?? null,
      conjuge_nome: input.conjuge_nome ?? null,
      conjuge_cpf: input.conjuge_cpf ?? null,
      ativo: true,
    } as any)
    .select('id')
    .single()
  if (produtorError || !produtor) {
    return { success: false as const, error: `Erro ao criar produtor: ${produtorError?.message}` }
  }

  // 5. Log (non-blocking)
  registrarLog({
    org_id: organizacaoId,
    usuario_id: adminId,
    usuario_email: usuarioAtual.email,
    acao: 'criar',
    modulo: 'cooperados',
    descricao: `Cooperado criado: ${input.nome} (${input.email})`,
    dados_depois: { usuarioId: authUserId, cooperadoId: cooperado.id, produtorId: produtor.id },
  }).catch(e => console.error('[audit]', e))

  revalidatePath('/cooperados')
  revalidatePath('/usuarios')
  revalidatePath('/comercializacao/produtores')
  revalidatePath('/dashboard')

  return {
    success: true,
    usuarioId: authUserId,
    cooperadoId: cooperado.id,
    produtorId: produtor.id,
    senhaTemporaria,
  }
}

// ── Fluxo 3: Promover produtor existente a cooperado ──────────────────────────

interface DadosCooperadoPromocao {
  status?: StatusCooperado
  rg?: string
  data_nascimento?: string
  sexo?: 'M' | 'F' | 'outro'
  conjuge_nome?: string
  conjuge_cpf?: string
  cep?: string
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  cidade?: string
  estado?: string
  caf_numero?: string
  caf_situacao?: string
  caf_validade?: string
  dap_numero?: string
  numero_matricula?: string
  data_admissao?: string
  quota_parte?: number
  tipo?: 'pessoa_fisica' | 'pessoa_juridica'
}

interface PromoverProdutorInput {
  produtorId: string
  /** E-mail de contato do cooperado (opcional). A promoção NÃO cria acesso ao
   *  sistema — isso é feito separadamente via `gerarAcessoCooperado`. */
  email?: string
  dadosCooperado: DadosCooperadoPromocao
  nomeAtualizado?: string
}

export async function promoverProdutorACooperado(
  organizacaoId: string,
  input: PromoverProdutorInput
) {
  const { userId: adminId, usuarioAtual } = await verificarAdmin()
  const admin = createAdminClient()

  // 1. Buscar produtor e validar org + ausência de vínculo
  const { data: produtor, error: produtorError } = await admin
    .from('produtores')
    .select('id, nome, cpf, email, telefone, nome_propriedade, area_total_ha, usuario_id, cooperado_id, organizacao_id')
    .eq('id', input.produtorId)
    .single()
  if (produtorError || !produtor) {
    return { success: false as const, error: 'Produtor não encontrado.' }
  }
  if ((produtor as any).organizacao_id !== organizacaoId) {
    return { success: false as const, error: 'Produtor não pertence a esta organização.' }
  }
  if ((produtor as any).cooperado_id) {
    return { success: false as const, error: 'Este produtor já é cooperado. Não é possível promover novamente.' }
  }

  // Promoção NÃO cria conta de acesso. O cooperado herda o usuario_id do
  // produtor caso já exista (raro); o acesso ao sistema é gerado depois, sob
  // demanda, via `gerarAcessoCooperado` na ficha do cooperado.
  const usuarioId: string | null = (produtor as any).usuario_id ?? null
  const emailCooperado = input.email?.trim() || (produtor as any).email || null

  // 3. Criar cooperado com colunas estruturadas
  const dc = input.dadosCooperado
  const statusCooperado = dc.status ?? 'ativo'
  const { data: cooperado, error: cooperadoError } = await admin
    .from('cooperados')
    .insert({
      organizacao_id: organizacaoId,
      usuario_id: usuarioId,
      nome_completo: input.nomeAtualizado ?? (produtor as any).nome,
      cpf: (produtor as any).cpf ?? null,
      email: emailCooperado,
      telefone: (produtor as any).telefone ?? null,
      rg: dc.rg ?? null,
      data_nascimento: dc.data_nascimento ?? null,
      sexo: dc.sexo ?? null,
      conjuge_nome: dc.conjuge_nome ?? null,
      conjuge_cpf: dc.conjuge_cpf ?? null,
      nome_propriedade: (produtor as any).nome_propriedade ?? null,
      area_total_ha: (produtor as any).area_total_ha ?? null,
      cep: dc.cep ?? null,
      logradouro: dc.logradouro ?? null,
      numero: dc.numero ?? null,
      complemento: dc.complemento ?? null,
      bairro: dc.bairro ?? null,
      cidade: dc.cidade ?? null,
      estado: dc.estado ?? null,
      caf_numero: dc.caf_numero ?? null,
      caf_situacao: dc.caf_situacao ?? null,
      caf_validade: dc.caf_validade ?? null,
      dap_numero: dc.dap_numero ?? null,
      numero_matricula: dc.numero_matricula ?? null,
      data_admissao: dc.data_admissao ?? null,
      quota_parte: dc.quota_parte ?? null,
      tipo: dc.tipo ?? 'pessoa_fisica',
      status: statusCooperado,
    })
    .select('id')
    .single()
  if (cooperadoError || !cooperado) {
    return { success: false as const, error: `Erro ao criar cooperado: ${cooperadoError?.message}` }
  }

  // 4. Atualizar produtor: vincular cooperado_id + usuario_id + tipo.
  // O trigger trg_sincronizar_tipo_produtor (053) só roda em UPDATE de status
  // do cooperado — na promoção o cooperado é INSERT, então o tipo precisa ser
  // derivado aqui, senão o produtor segue 'externo' (e recebe preço de não
  // membro na cotação) até alguém mudar o status do cooperado depois.
  const { error: updateError } = await admin
    .from('produtores')
    .update({
      cooperado_id: cooperado.id,
      usuario_id: usuarioId,
      tipo: tipoProdutorPorStatusCooperado(statusCooperado),
      ...(input.nomeAtualizado ? { nome: input.nomeAtualizado } : {}),
      ...(dc.conjuge_nome !== undefined ? { conjuge_nome: dc.conjuge_nome ?? null } : {}),
      ...(dc.conjuge_cpf !== undefined ? { conjuge_cpf: dc.conjuge_cpf ?? null } : {}),
    } as any)
    .eq('id', input.produtorId)
  if (updateError) {
    return { success: false as const, error: `Erro ao atualizar produtor: ${updateError.message}` }
  }

  // 5. Log (non-blocking)
  registrarLog({
    org_id: organizacaoId,
    usuario_id: adminId,
    usuario_email: usuarioAtual.email,
    acao: 'promover_produtor_cooperado',
    modulo: 'cooperados',
    descricao: `Produtor promovido a cooperado: ${(produtor as any).nome}`,
    dados_depois: { produtorId: input.produtorId, cooperadoId: cooperado.id, usuarioId },
  }).catch(e => console.error('[audit]', e))

  revalidatePath('/cooperados')
  revalidatePath('/comercializacao/produtores')
  revalidatePath('/dashboard')

  return { success: true as const, cooperadoId: cooperado.id, usuarioId }
}

// ── Gerar acesso ao sistema para um cooperado existente ───────────────────────

interface GerarAcessoCooperadoResult {
  success: boolean
  error?: string
  usuarioId?: string
  email?: string
  senhaTemporaria?: string
}

/**
 * Cria a conta de acesso (login) para um cooperado que ainda não possui usuário.
 * Chamado sob demanda pelo administrador na ficha do cooperado.
 */
export async function gerarAcessoCooperado(
  cooperadoId: string,
  emailInput?: string
): Promise<GerarAcessoCooperadoResult> {
  const { userId: adminId, usuarioAtual } = await verificarAdmin()
  const admin = createAdminClient()

  // 1. Buscar cooperado e validar org + ausência de acesso
  const { data: cooperado, error: cooperadoError } = await admin
    .from('cooperados')
    .select('id, nome_completo, cpf, email, usuario_id, organizacao_id')
    .eq('id', cooperadoId)
    .single()
  if (cooperadoError || !cooperado) {
    return { success: false, error: 'Cooperado não encontrado.' }
  }
  if ((cooperado as any).organizacao_id !== (usuarioAtual as any).organizacao_id) {
    return { success: false, error: 'Cooperado não pertence a esta organização.' }
  }
  if ((cooperado as any).usuario_id) {
    return { success: false, error: 'Este cooperado já possui acesso ao sistema.' }
  }

  const email = (emailInput?.trim() || (cooperado as any).email || '').trim()
  if (!email) {
    return { success: false, error: 'Informe um e-mail para criar o acesso.' }
  }

  const organizacaoId = (cooperado as any).organizacao_id as string

  // 2. Criar usuário no Auth
  const senhaTemporaria = gerarSenhaTemporaria()
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password: senhaTemporaria,
    email_confirm: true,
  })
  if (authError || !authData.user) {
    if (
      authError?.message?.toLowerCase().includes('already registered') ||
      authError?.message?.toLowerCase().includes('already exists') ||
      (authError as any)?.status === 422
    ) {
      return { success: false, error: 'Este e-mail já está cadastrado no sistema. Informe um e-mail diferente.' }
    }
    return { success: false, error: `Erro ao criar acesso: ${authError?.message}` }
  }
  const usuarioId = authData.user.id

  // 3. Criar registro em usuarios
  const { error: usuarioInsertError } = await admin.from('usuarios').insert({
    id: usuarioId,
    organizacao_id: organizacaoId,
    nome_completo: (cooperado as any).nome_completo,
    cpf: (cooperado as any).cpf ?? null,
    email,
    role: 'cooperado' as RoleUsuario,
    funcoes: [],
    vinculo: 'cooperado' as VinculoUsuario,
    ativo: true,
  })
  if (usuarioInsertError) {
    await admin.auth.admin.deleteUser(usuarioId).catch(() => null)
    return { success: false, error: `Erro ao criar usuário: ${usuarioInsertError.message}` }
  }

  // 4. Vincular usuario_id no cooperado (+ e-mail, se informado)
  const { error: updateCoopError } = await admin
    .from('cooperados')
    .update({ usuario_id: usuarioId, email } as any)
    .eq('id', cooperadoId)
  if (updateCoopError) {
    return { success: false, error: `Erro ao vincular acesso ao cooperado: ${updateCoopError.message}` }
  }

  // 5. Vincular usuario_id em produtores ligados a este cooperado (se houver)
  await admin
    .from('produtores')
    .update({ usuario_id: usuarioId } as any)
    .eq('cooperado_id', cooperadoId)
    .is('usuario_id', null)

  // 6. Log (non-blocking)
  registrarLog({
    org_id: organizacaoId,
    usuario_id: adminId,
    usuario_email: usuarioAtual.email,
    acao: 'gerar_acesso_cooperado',
    modulo: 'cooperados',
    descricao: `Acesso ao sistema gerado para cooperado: ${(cooperado as any).nome_completo}`,
    dados_depois: { cooperadoId, usuarioId, email },
  }).catch(e => console.error('[audit]', e))

  revalidatePath('/cooperados')
  revalidatePath(`/cooperados/${cooperadoId}`)

  return { success: true, usuarioId, email, senhaTemporaria }
}

// ── Fluxo 4: Vincular usuário existente como cooperado ────────────────────────

interface VincularUsuarioComoCooperadoInput {
  usuarioId: string
  nome: string
  cpf?: string
  email: string
  telefone?: string
  numero_matricula?: string
  data_admissao?: string
  quota_parte?: number
  caf_numero?: string
  dap_numero?: string
  status?: StatusCooperado
  conjuge_nome?: string
  conjuge_cpf?: string
}

export async function vincularUsuarioComoCooperado(
  organizacaoId: string,
  input: VincularUsuarioComoCooperadoInput
) {
  const { userId: adminId, usuarioAtual } = await verificarAdmin()
  const admin = createAdminClient()

  // Verificar se usuário existe e pertence à org
  const { data: usuario, error: usuarioError } = await admin
    .from('usuarios')
    .select('id, nome_completo, cpf, email, telefone, organizacao_id')
    .eq('id', input.usuarioId)
    .single()
  if (usuarioError || !usuario) {
    return { success: false as const, error: 'Usuário não encontrado.' }
  }
  if ((usuario as any).organizacao_id !== organizacaoId) {
    return { success: false as const, error: 'Usuário não pertence a esta organização.' }
  }

  // Verificar se já tem cooperado vinculado
  const { data: cooperadoExistente } = await admin
    .from('cooperados')
    .select('id')
    .eq('usuario_id', input.usuarioId)
    .eq('organizacao_id', organizacaoId)
    .maybeSingle()
  if (cooperadoExistente) {
    return { success: false as const, error: 'Este usuário já possui vínculo de cooperado.' }
  }

  const statusCooperado = input.status ?? 'ativo'

  // Gerar matrícula automática se não informada
  let numeroMatricula = input.numero_matricula
  if (!numeroMatricula) {
    const ano = new Date().getFullYear().toString().slice(-2)
    const { data: ultimaMatricula } = await admin
      .from('cooperados')
      .select('numero_matricula')
      .eq('organizacao_id', organizacaoId)
      .not('numero_matricula', 'is', null)
      .order('numero_matricula', { ascending: false })
      .limit(1)
      .maybeSingle()
    let proximoSeq = 50
    if (ultimaMatricula?.numero_matricula) {
      const seq = parseInt((ultimaMatricula.numero_matricula as string).slice(-4), 10)
      if (!isNaN(seq)) proximoSeq = seq + 1
    }
    numeroMatricula = `${ano}${String(proximoSeq).padStart(4, '0')}`
  }

  // Criar cooperado
  const { data: cooperado, error: cooperadoError } = await admin
    .from('cooperados')
    .insert({
      organizacao_id: organizacaoId,
      usuario_id: input.usuarioId,
      nome_completo: input.nome,
      cpf: input.cpf ?? null,
      email: input.email,
      telefone: input.telefone ?? null,
      numero_matricula: numeroMatricula,
      data_admissao: input.data_admissao ?? null,
      quota_parte: input.quota_parte ?? null,
      caf_numero: input.caf_numero ?? null,
      dap_numero: input.dap_numero ?? null,
      status: statusCooperado,
      tipo: 'pessoa_fisica',
      conjuge_nome: input.conjuge_nome ?? null,
      conjuge_cpf: input.conjuge_cpf ?? null,
    })
    .select('id')
    .single()
  if (cooperadoError || !cooperado) {
    return { success: false as const, error: `Erro ao criar cooperado: ${cooperadoError?.message}` }
  }

  // Verificar se já tem produtor vinculado ao usuário
  const { data: produtorExistente } = await admin
    .from('produtores')
    .select('id')
    .eq('usuario_id', input.usuarioId)
    .eq('organizacao_id', organizacaoId)
    .maybeSingle()

  // Tipo derivado do status do cooperado (mesma regra do trigger 053, que não
  // cobre INSERT) — 'cooperado' fixo aqui deixava produtor com preço de membro
  // enquanto o cooperado ainda estava em proposta.
  const tipoProdutor = tipoProdutorPorStatusCooperado(statusCooperado)

  if (!produtorExistente) {
    await admin.from('produtores').insert({
      organizacao_id: organizacaoId,
      nome: input.nome,
      cpf: input.cpf ?? null,
      email: input.email,
      telefone: input.telefone ?? null,
      usuario_id: input.usuarioId,
      cooperado_id: cooperado.id,
      tipo: tipoProdutor,
      conjuge_nome: input.conjuge_nome ?? null,
      conjuge_cpf: input.conjuge_cpf ?? null,
      ativo: true,
    } as any)
  } else {
    await admin.from('produtores').update({
      cooperado_id: cooperado.id,
      tipo: tipoProdutor,
      ...(input.conjuge_nome !== undefined ? { conjuge_nome: input.conjuge_nome ?? null } : {}),
      ...(input.conjuge_cpf !== undefined ? { conjuge_cpf: input.conjuge_cpf ?? null } : {}),
    } as any).eq('id', produtorExistente.id)
  }

  registrarLog({
    org_id: organizacaoId,
    usuario_id: adminId,
    usuario_email: usuarioAtual.email,
    acao: 'vincular_cooperado',
    modulo: 'cooperados',
    descricao: `Usuário vinculado como cooperado: ${input.nome} (matrícula ${numeroMatricula})`,
    dados_depois: { usuarioId: input.usuarioId, cooperadoId: cooperado.id, numeroMatricula },
  }).catch(e => console.error('[audit]', e))

  revalidatePath('/cooperados')
  revalidatePath('/configuracoes/usuarios')
  revalidatePath('/dashboard')

  return { success: true as const, cooperadoId: cooperado.id, numeroMatricula }
}

// ── Utilitário: contexto do usuário atual (para client components) ─────────────

export async function getContextoUsuario(): Promise<{ ehAdmin: boolean; organizacaoId: string | null; nomeOrg: string | null }> {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return { ehAdmin: false, organizacaoId: null, nomeOrg: null }
    const { data } = await serverClient
      .from('usuarios')
      .select('role, funcoes, organizacao_id, organizacoes(nome)')
      .eq('id', user.id)
      .single()
    if (!data) return { ehAdmin: false, organizacaoId: null, nomeOrg: null }
    return {
      ehAdmin: isAdmin(data as any),
      organizacaoId: (data as any).organizacao_id as string | null,
      nomeOrg: ((data as any).organizacoes as any)?.nome as string | null ?? null,
    }
  } catch {
    return { ehAdmin: false, organizacaoId: null, nomeOrg: null }
  }
}

// ── Envio de e-mail de boas-vindas ────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

interface EnviarEmailBoasVindasInput {
  nomeCooperado: string
  emailCooperado: string
  senhaTemporaria: string
  nomeOrg: string
  tipoMembro: string
}

export async function enviarEmailBoasVindas(
  input: EnviarEmailBoasVindasInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const nome  = escapeHtml(input.nomeCooperado)
    const org   = escapeHtml(input.nomeOrg)
    const tipo  = escapeHtml(input.tipoMembro)
    const email = escapeHtml(input.emailCooperado)
    const senha = escapeHtml(input.senhaTemporaria)

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f8f7f4;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f7f4;padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;border:1px solid #e5e3dc;overflow:hidden;">
        <tr>
          <td style="background:#0D2B5E;padding:28px 40px;text-align:center;">
            <img src="https://nexcoop.com.br/images/logo-nexcoop-horizontal.png" alt="NexCoop" style="height:36px;width:auto;display:inline-block;" />
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            <h2 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#0D2B5E;">Bem-vindo(a) à ${org}!</h2>
            <p style="margin:0 0 8px;font-size:15px;color:#444;line-height:1.6;">Olá, ${nome}!</p>
            <p style="margin:0 0 28px;font-size:15px;color:#444;line-height:1.6;">Você foi cadastrado(a) como <strong>${tipo}</strong> da <strong>${org}</strong>. Abaixo estão suas credenciais de acesso à plataforma NexCoop:</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
              <tr>
                <td style="background:#f8f7f4;border:1px solid #e5e3dc;border-radius:12px;padding:20px 24px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding-bottom:14px;border-bottom:1px solid #e5e3dc;">
                        <div style="font-size:11px;font-weight:600;color:#9a9a9a;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">E-mail de acesso</div>
                        <div style="font-size:14px;font-weight:600;color:#1a1a1a;">${email}</div>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding-top:14px;">
                        <div style="font-size:11px;font-weight:600;color:#9a9a9a;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Senha temporária</div>
                        <div style="display:inline-block;background:#FFF8E1;border:1px solid #FDE68A;border-radius:8px;padding:10px 18px;font-size:17px;font-weight:700;color:#1a1a1a;font-family:Courier New,monospace;letter-spacing:0.12em;">${senha}</div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td style="background:#FFF8E1;border:1px solid #FDE68A;border-radius:8px;padding:12px 16px;">
                  <p style="margin:0;font-size:13px;color:#92400e;line-height:1.5;">⚠️ Por segurança, você será solicitado(a) a trocar sua senha no primeiro acesso.</p>
                </td>
              </tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center" style="padding-bottom:8px;">
                <a href="https://nexcoop.com.br/login" style="display:inline-block;background:linear-gradient(135deg,#1565C0,#06B6D4);color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:10px;">Acessar minha área</a>
              </td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="background:#f8f7f4;padding:20px 40px;border-top:1px solid #e5e3dc;text-align:center;">
            <p style="margin:0;font-size:12px;color:#aaa;">© 2026 NexCoop · nexcoop.com.br</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

    await enviarEmail({
      to: input.emailCooperado,
      subject: `Bem-vindo(a) à ${input.nomeOrg} — Suas credenciais de acesso`,
      html,
    })

    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message ?? 'Erro ao enviar e-mail.' }
  }
}
