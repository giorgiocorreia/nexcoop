'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getUsuarioLogado } from '@/lib/auth'
import type { TipoContaProdutorConta, TipoProdutorVinculo, TipoPosseProdutor } from '@/types/database'

export async function listarProdutores() {
  try {
    const usuario = await getUsuarioLogado()
    if (!usuario?.organizacao_id) return []
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('produtores')
      .select(`
        id, nome, cpf, telefone, tipo, cooperado_id,
        area_total_ha, area_cacau_ha, tem_certificacao, tipo_certificacao,
        banco, agencia, conta_bancaria, tipo_conta, chave_pix,
        ativo, municipio, endereco, email,
        nome_propriedade, tipo_posse, percentual_posse, ie_produtor_rural,
        conjuge_nome, conjuge_cpf, conjuge_ie_produtor_rural
      `)
      .eq('organizacao_id', usuario.organizacao_id)
      .order('nome')
    if (error) throw new Error(error.message)
    return data ?? []
  } catch (e: any) {
    console.error('[listarProdutores] erro:', e?.message ?? e)
    throw e
  }
}

export async function getProdutorCompleto(id: string) {
  const usuario = await getUsuarioLogado()
  if (!usuario?.organizacao_id) throw new Error('Usuário sem organização')
  const supabase = createAdminClient()

  const { data: produtor, error: eProd } = await supabase
    .from('produtores')
    .select(`
      id, nome, cpf, telefone, email, municipio, endereco, tipo,
      cooperado_id, area_total_ha, area_cacau_ha, tem_certificacao,
      tipo_certificacao, banco, agencia, conta_bancaria, tipo_conta,
      chave_pix, ativo, nome_propriedade, tipo_posse, percentual_posse,
      ie_produtor_rural, conjuge_nome, conjuge_cpf, conjuge_ie_produtor_rural
    `)
    .eq('id', id)
    .eq('organizacao_id', usuario.organizacao_id)
    .single()
  if (eProd) throw new Error(eProd.message)

  const { data: conta, error: eConta } = await supabase
    .from('contas_produtor')
    .select(`
      id, saldo_financeiro,
      saldos_produto(quantidade, produtos(id, nome, unidade))
    `)
    .eq('produtor_id', id)
    .maybeSingle()
  if (eConta) throw new Error(eConta.message)

  const { data: extrato, error: eExt } = await supabase
    .from('movimentacoes_conta')
    .select('*, produtos(nome, unidade)')
    .eq('conta_id', conta?.id ?? '')
    .order('created_at', { ascending: false })
    .limit(100)
  if (eExt && conta?.id) throw new Error(eExt.message)

  const { data: sessao } = await supabase
    .from('sessoes_caixa')
    .select('id, status')
    .eq('organizacao_id', usuario.organizacao_id)
    .eq('usuario_id', usuario.id)
    .eq('status', 'aberta')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return {
    produtor,
    conta: conta ?? null,
    extrato: extrato ?? [],
    sessaoAberta: sessao ?? null,
  }
}

export async function criarProdutor(form: {
  nome: string
  cpf?: string
  telefone?: string
  email?: string
  municipio?: string
  endereco?: string
  tipo: 'externo' | 'cooperado'
  cooperado_id?: string
  area_total_ha?: number
  area_cacau_ha?: number
  tem_certificacao: boolean
  tipo_certificacao?: string
  banco?: string
  agencia?: string
  conta_bancaria?: string
  tipo_conta?: string
  chave_pix?: string
  nome_propriedade?: string
  tipo_posse?: string
  percentual_posse?: number
  ie_produtor_rural?: string
  conjuge_nome?: string
  conjuge_cpf?: string
  conjuge_ie_produtor_rural?: string
}) {
  try {
    const usuario = await getUsuarioLogado()
    const orgId = usuario.organizacao_id
    if (!orgId) throw new Error('Usuário sem organização')
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('produtores')
      .insert({
        ...form,
        tipo: form.tipo as TipoProdutorVinculo,
        tipo_conta: (form.tipo_conta as TipoContaProdutorConta) ?? null,
        tipo_posse: (form.tipo_posse as TipoPosseProdutor) ?? null,
        organizacao_id: orgId,
      })
    if (error) throw new Error(error.message)
  } catch (e: any) {
    console.error('[criarProdutor] FALHA:', e?.message ?? e)
    throw e
  }
}

export async function editarProdutor(id: string, form: Partial<{
  nome: string
  cpf: string
  telefone: string
  email: string
  municipio: string
  endereco: string
  tipo: 'externo' | 'cooperado'
  cooperado_id: string
  area_total_ha: number
  area_cacau_ha: number
  tem_certificacao: boolean
  tipo_certificacao: string
  banco: string
  agencia: string
  conta_bancaria: string
  tipo_conta: string
  chave_pix: string
  ativo: boolean
  nome_propriedade: string
  tipo_posse: string
  percentual_posse: number
  ie_produtor_rural: string
  conjuge_nome: string
  conjuge_cpf: string
  conjuge_ie_produtor_rural: string
}>) {
  try {
    const supabase = createAdminClient()
    const { tipo_conta, tipo, tipo_posse, ...rest } = form
    const { error } = await supabase
      .from('produtores')
      .update({
        ...rest,
        ...(tipo !== undefined ? { tipo: tipo as TipoProdutorVinculo } : {}),
        ...(tipo_conta !== undefined ? { tipo_conta: tipo_conta as TipoContaProdutorConta | null } : {}),
        ...(tipo_posse !== undefined ? { tipo_posse: tipo_posse as TipoPosseProdutor | null } : {}),
      })
      .eq('id', id)
    if (error) throw new Error(error.message)
  } catch (e: any) {
    console.error('[editarProdutor] FALHA:', e?.message ?? e)
    throw e
  }
}

/**
 * Chamada automaticamente ao cadastrar um cooperado.
 * Cenário 1: já existe produtor com o CPF → vincula cooperado_id + atualiza tipo
 * Cenário 2: não existe → cria produtor + conta_produtor
 */
export async function vincularCooperadoComoProdutor(params: {
  cooperado_id: string
  organizacao_id: string
  nome: string
  cpf: string | null
  telefone: string | null
  email: string | null
  municipio: string | null
  endereco: string | null
  nome_propriedade: string | null
  conjuge_nome?: string | null
  conjuge_cpf?: string | null
}) {
  const supabase = createAdminClient()

  // Tenta encontrar produtor pelo CPF
  let produtorId: string | null = null

  if (params.cpf) {
    const { data: existente } = await supabase
      .from('produtores')
      .select('id')
      .eq('organizacao_id', params.organizacao_id)
      .eq('cpf', params.cpf)
      .maybeSingle()

    if (existente) {
      // Cenário 1: vincula cooperado ao produtor existente
      const { error } = await supabase
        .from('produtores')
        .update({
          cooperado_id: params.cooperado_id,
          tipo: 'cooperado' as TipoProdutorVinculo,
          ...(params.conjuge_nome !== undefined ? { conjuge_nome: params.conjuge_nome } : {}),
          ...(params.conjuge_cpf !== undefined ? { conjuge_cpf: params.conjuge_cpf } : {}),
        })
        .eq('id', existente.id)
      if (error) throw new Error(`[vincular] update produtor: ${error.message}`)
      produtorId = existente.id
    }
  }

  if (!produtorId) {
    // Cenário 2: cria produtor novo
    const { data: novo, error: eCriar } = await supabase
      .from('produtores')
      .insert({
        organizacao_id: params.organizacao_id,
        cooperado_id: params.cooperado_id,
        nome: params.nome,
        cpf: params.cpf,
        telefone: params.telefone,
        email: params.email,
        municipio: params.municipio,
        endereco: params.endereco,
        nome_propriedade: params.nome_propriedade,
        conjuge_nome: params.conjuge_nome ?? null,
        conjuge_cpf: params.conjuge_cpf ?? null,
        tipo: 'cooperado' as TipoProdutorVinculo,
        tem_certificacao: false,
        ativo: true,
      })
      .select('id')
      .single()
    if (eCriar) throw new Error(`[vincular] insert produtor: ${eCriar.message}`)
    produtorId = novo.id

    // Cria conta_produtor para o novo produtor
    const { error: eConta } = await supabase
      .from('contas_produtor')
      .insert({
        organizacao_id: params.organizacao_id,
        produtor_id: produtorId,
        saldo_financeiro: 0,
      })
    if (eConta) throw new Error(`[vincular] insert conta_produtor: ${eConta.message}`)
  }

  return produtorId
}

export async function listarCooperadosSemProdutor() {
  try {
    const usuario = await getUsuarioLogado()
    const orgId = usuario.organizacao_id
    if (!orgId) throw new Error('Usuário sem organização')
    const supabase = createAdminClient()
    const { data: produtoresExistentes } = await supabase
      .from('produtores')
      .select('cooperado_id')
      .eq('organizacao_id', orgId)
      .not('cooperado_id', 'is', null)
    const idsVinculados = (produtoresExistentes ?? [])
      .map((p: any) => p.cooperado_id)
      .filter(Boolean)
    const { data, error } = await supabase
      .from('cooperados')
      .select('id, nome_completo')
      .eq('organizacao_id', orgId)
    if (error) throw new Error(error.message)
    return (data ?? [])
      .filter((c: any) => !idsVinculados.includes(c.id))
      .map((c: any) => ({ id: c.id as string, nome: c.nome_completo as string }))
  } catch (e: any) {
    console.error('[listarCooperadosSemProdutor] FALHA:', e?.message ?? e)
    throw e
  }
}
