'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { registrarLog } from '@/lib/audit/logger'
import { isAdmin } from '@/lib/permissoes'
import { randomBytes } from 'crypto'
import type { RoleUsuario, VinculoUsuario } from '@/types/database'

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

// ── Fluxo 1: Criar usuário com membro opcional ────────────────────────────────

interface CriarUsuarioComMembroInput {
  nome: string
  email: string
  cpf: string
  funcoes: string[]
  vinculo: string
  ehMembro: boolean
  dadosProducao?: Record<string, unknown>
  dadosSocietarios?: Record<string, unknown>
  enderecoId?: string
}

export async function criarUsuarioComMembroOpcional(
  organizacaoId: string,
  input: CriarUsuarioComMembroInput
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

  let produtorId: string | undefined
  let membroId: string | undefined

  // 3. Se ehMembro, criar produtor espelho + membro
  if (input.ehMembro) {
    const { data: produtor, error: produtorError } = await admin
      .from('produtores')
      .insert({
        organizacao_id: organizacaoId,
        nome: input.nome,
        cpf: input.cpf ?? null,
        usuario_id: authUserId,
        tipo: 'cooperado',
        endereco: input.enderecoId ?? null,
        dados_fiscais: {},
        is_consumidor_final: false,
        ativo: true,
        dados_producao: input.dadosProducao ?? {},
      } as any)
      .select('id')
      .single()
    if (produtorError || !produtor) {
      throw new Error(`Erro ao criar produtor: ${produtorError?.message}`)
    }
    produtorId = produtor.id

    const { data: membro, error: membroError } = await admin
      .from('membros')
      .insert({
        organizacao_id: organizacaoId,
        produtor_id: produtorId,
        usuario_id: authUserId,
        status: 'ativo',
        dados_societarios: input.dadosSocietarios ?? {},
      })
      .select('id')
      .single()
    if (membroError || !membro) {
      throw new Error(`Erro ao criar membro: ${membroError?.message}`)
    }
    membroId = membro.id
  }

  // 4. Log (non-blocking)
  registrarLog({
    org_id: organizacaoId,
    usuario_id: adminId,
    usuario_email: usuarioAtual.email,
    acao: 'criar',
    modulo: 'usuarios',
    descricao: `Usuário criado: ${input.nome} (${input.email})${input.ehMembro ? ' + membro' : ''}`,
    dados_depois: { usuarioId: authUserId, produtorId, membroId, ehMembro: input.ehMembro },
  }).catch(e => console.error('[audit]', e))

  revalidatePath('/usuarios')
  revalidatePath('/membros')

  return { success: true, usuarioId: authUserId, produtorId, membroId }
}

// ── Fluxo 2: Criar membro (sempre cria usuario + produtor + membro) ───────────

interface CriarMembroInput {
  nome: string
  cpf: string
  email: string
  enderecoId?: string
  dadosProducao?: Record<string, unknown>
  dadosSocietarios?: Record<string, unknown>
  numeroMatricula?: string
  dataAdmissao?: string
}

export async function criarMembro(
  organizacaoId: string,
  input: CriarMembroInput
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

  // 3. Criar produtor espelho
  const { data: produtor, error: produtorError } = await admin
    .from('produtores')
    .insert({
      organizacao_id: organizacaoId,
      nome: input.nome,
      cpf: input.cpf ?? null,
      usuario_id: authUserId,
      tipo: 'cooperado',
      endereco: input.enderecoId ?? null,
      dados_fiscais: {},
      is_consumidor_final: false,
      ativo: true,
      dados_producao: input.dadosProducao ?? {},
    } as any)
    .select('id')
    .single()
  if (produtorError || !produtor) {
    throw new Error(`Erro ao criar produtor: ${produtorError?.message}`)
  }

  // 4. Criar membro
  const { data: membro, error: membroError } = await admin
    .from('membros')
    .insert({
      organizacao_id: organizacaoId,
      produtor_id: produtor.id,
      usuario_id: authUserId,
      numero_matricula: input.numeroMatricula ?? null,
      data_admissao: input.dataAdmissao ?? null,
      status: 'ativo',
      dados_societarios: input.dadosSocietarios ?? {},
    })
    .select('id')
    .single()
  if (membroError || !membro) {
    throw new Error(`Erro ao criar membro: ${membroError?.message}`)
  }

  // 5. Log (non-blocking)
  registrarLog({
    org_id: organizacaoId,
    usuario_id: adminId,
    usuario_email: usuarioAtual.email,
    acao: 'criar',
    modulo: 'membros',
    descricao: `Membro criado: ${input.nome} (${input.email})`,
    dados_depois: { usuarioId: authUserId, produtorId: produtor.id, membroId: membro.id },
  }).catch(e => console.error('[audit]', e))

  revalidatePath('/membros')
  revalidatePath('/usuarios')
  revalidatePath('/produtores')

  return {
    success: true,
    usuarioId: authUserId,
    produtorId: produtor.id,
    membroId: membro.id,
    senhaTemporaria,
  }
}

// ── Fluxo 3: Promover produtor existente a membro ─────────────────────────────

interface PromoverProdutorInput {
  produtorId: string
  email: string
  dadosSocietarios: Record<string, unknown>
  numeroMatricula?: string
  dataAdmissao?: string
  nomeAtualizado?: string
  enderecoIdAtualizado?: string
}

export async function promoverProdutorAMembro(
  organizacaoId: string,
  input: PromoverProdutorInput
) {
  const { userId: adminId, usuarioAtual } = await verificarAdmin()
  const admin = createAdminClient()

  // 1. Buscar produtor e validar org + ausência de membro
  const { data: produtor, error: produtorError } = await admin
    .from('produtores')
    .select('id, nome, cpf, usuario_id, organizacao_id')
    .eq('id', input.produtorId)
    .single()
  if (produtorError || !produtor) {
    throw new Error('Produtor não encontrado')
  }
  if ((produtor as any).organizacao_id !== organizacaoId) {
    throw new Error('Produtor não pertence a esta organização')
  }

  const { data: membroExistente } = await admin
    .from('membros')
    .select('id')
    .eq('produtor_id', input.produtorId)
    .maybeSingle()
  if (membroExistente) {
    throw new Error('Este produtor já é membro. Não é possível promover novamente.')
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

    // Vincular usuario_id ao produtor
    await admin
      .from('produtores')
      .update({ usuario_id: usuarioId } as any)
      .eq('id', input.produtorId)
  }

  // 3. Atualizar dados opcionais do produtor
  if (input.nomeAtualizado || input.enderecoIdAtualizado) {
    await admin
      .from('produtores')
      .update({
        ...(input.nomeAtualizado        ? { nome: input.nomeAtualizado }                : {}),
        ...(input.enderecoIdAtualizado  ? { endereco: input.enderecoIdAtualizado }      : {}),
      } as any)
      .eq('id', input.produtorId)
  }

  // 4. Criar membro
  const { data: membro, error: membroError } = await admin
    .from('membros')
    .insert({
      organizacao_id: organizacaoId,
      produtor_id: input.produtorId,
      usuario_id: usuarioId,
      numero_matricula: input.numeroMatricula ?? null,
      data_admissao: input.dataAdmissao ?? null,
      status: 'ativo',
      dados_societarios: input.dadosSocietarios,
    })
    .select('id')
    .single()
  if (membroError || !membro) {
    throw new Error(`Erro ao criar membro: ${membroError?.message}`)
  }

  // 5. Log (non-blocking)
  registrarLog({
    org_id: organizacaoId,
    usuario_id: adminId,
    usuario_email: usuarioAtual.email,
    acao: 'promover_produtor_membro',
    modulo: 'membros',
    descricao: `Produtor promovido a membro: ${(produtor as any).nome}`,
    dados_depois: { produtorId: input.produtorId, membroId: membro.id, usuarioId },
  }).catch(e => console.error('[audit]', e))

  revalidatePath('/membros')
  revalidatePath('/produtores')

  return { success: true, membroId: membro.id, usuarioId, senhaTemporaria }
}
