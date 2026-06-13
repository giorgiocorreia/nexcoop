'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { registrarLog } from '@/lib/audit/logger'
import { isAdmin } from '@/lib/permissoes'
import { randomBytes } from 'crypto'
import type { RoleUsuario, StatusCooperado, VinculoUsuario } from '@/types/database'

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
    throw new Error(`Erro ao criar usuário no Auth: ${authError?.message}`)
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
    throw new Error(`Erro ao inserir usuário: ${usuarioError.message}`)
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
      throw new Error(`Erro ao criar cooperado: ${cooperadoError?.message}`)
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
        ativo: true,
      } as any)
      .select('id')
      .single()
    if (produtorError || !produtor) {
      throw new Error(`Erro ao criar produtor: ${produtorError?.message}`)
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
    throw new Error(`Erro ao criar usuário no Auth: ${authError?.message}`)
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
    throw new Error(`Erro ao inserir usuário: ${usuarioError.message}`)
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
    throw new Error(`Erro ao criar cooperado: ${cooperadoError?.message}`)
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
      ativo: true,
    } as any)
    .select('id')
    .single()
  if (produtorError || !produtor) {
    throw new Error(`Erro ao criar produtor: ${produtorError?.message}`)
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
  email: string
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
    throw new Error('Produtor não encontrado')
  }
  if ((produtor as any).organizacao_id !== organizacaoId) {
    throw new Error('Produtor não pertence a esta organização')
  }
  if ((produtor as any).cooperado_id) {
    throw new Error('Este produtor já é cooperado. Não é possível promover novamente.')
  }

  let usuarioId: string = (produtor as any).usuario_id
  let senhaTemporaria: string | undefined

  // 2. Se produtor não tem usuario_id, criar usuário
  if (!usuarioId) {
    senhaTemporaria = gerarSenhaTemporaria()
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: input.email,
      password: senhaTemporaria,
      email_confirm: true,
    })
    if (authError || !authData.user) {
      throw new Error(`Erro ao criar usuário no Auth: ${authError?.message}`)
    }
    usuarioId = authData.user.id

    // TODO: terminologia dinâmica via tipos_org para vinculo
    const { error: usuarioInsertError } = await admin.from('usuarios').insert({
      id: usuarioId,
      organizacao_id: organizacaoId,
      nome_completo: input.nomeAtualizado ?? (produtor as any).nome,
      cpf: (produtor as any).cpf ?? null,
      email: input.email,
      role: 'cooperado' as RoleUsuario,
      funcoes: [],
      vinculo: 'cooperado' as VinculoUsuario,
      ativo: true,
      // TODO: marcar troca_senha_obrigatoria: true quando coluna existir
    })
    if (usuarioInsertError) {
      await admin.auth.admin.deleteUser(usuarioId).catch(() => null)
      throw new Error(`Erro ao inserir usuário: ${usuarioInsertError.message}`)
    }
  }

  // 3. Criar cooperado com colunas estruturadas
  const dc = input.dadosCooperado
  const { data: cooperado, error: cooperadoError } = await admin
    .from('cooperados')
    .insert({
      organizacao_id: organizacaoId,
      usuario_id: usuarioId,
      nome_completo: input.nomeAtualizado ?? (produtor as any).nome,
      cpf: (produtor as any).cpf ?? null,
      email: input.email,
      telefone: (produtor as any).telefone ?? null,
      rg: dc.rg ?? null,
      data_nascimento: dc.data_nascimento ?? null,
      sexo: dc.sexo ?? null,
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
      status: dc.status ?? 'ativo',
    })
    .select('id')
    .single()
  if (cooperadoError || !cooperado) {
    throw new Error(`Erro ao criar cooperado: ${cooperadoError?.message}`)
  }

  // 4. Atualizar produtor: vincular cooperado_id + usuario_id
  const { error: updateError } = await admin
    .from('produtores')
    .update({
      cooperado_id: cooperado.id,
      usuario_id: usuarioId,
      ...(input.nomeAtualizado ? { nome: input.nomeAtualizado } : {}),
    } as any)
    .eq('id', input.produtorId)
  if (updateError) {
    throw new Error(`Erro ao atualizar produtor: ${updateError.message}`)
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

  return { success: true, cooperadoId: cooperado.id, usuarioId, senhaTemporaria }
}

// ── Utilitário: contexto do usuário atual (para client components) ─────────────

export async function getContextoUsuario(): Promise<{ ehAdmin: boolean; organizacaoId: string | null }> {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return { ehAdmin: false, organizacaoId: null }
    const { data } = await serverClient
      .from('usuarios')
      .select('role, funcoes, organizacao_id')
      .eq('id', user.id)
      .single()
    if (!data) return { ehAdmin: false, organizacaoId: null }
    return {
      ehAdmin: isAdmin(data as any),
      organizacaoId: (data as any).organizacao_id as string | null,
    }
  } catch {
    return { ehAdmin: false, organizacaoId: null }
  }
}
