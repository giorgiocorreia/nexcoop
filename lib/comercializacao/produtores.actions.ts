'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getUsuarioLogado } from '@/lib/auth'
import type { TipoContaProdutorConta, TipoProdutorVinculo } from '@/types/database'

// getUsuarioLogado() retorna: id, organizacao_id, role, funcoes, nome_completo, email
// NÃO existe usuario.cooperado_id — cooperado_id pertence à tabela produtores

export async function listarProdutores() {
  try {
    const usuario = await getUsuarioLogado()
    const orgId = usuario.organizacao_id
    console.log('[listarProdutores] usuario:', { id: usuario.id, organizacao_id: orgId, role: usuario.role })
    if (!orgId) throw new Error('Usuário sem organização')
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('produtores')
      .select('*, cooperados(nome_completo)')
      .eq('organizacao_id', orgId)
      .order('nome')
    console.log('[listarProdutores] resultado:', data?.length ?? 0, 'registros | erro:', error?.message ?? 'nenhum')
    if (error) throw new Error(error.message)
    return data as unknown as Array<{
      id: string; nome: string; cpf: string | null; telefone: string | null
      email: string | null; municipio: string | null; endereco: string | null
      tipo: 'externo' | 'cooperado'; cooperado_id: string | null
      area_total_ha: number | null; area_cacau_ha: number | null
      tem_certificacao: boolean; tipo_certificacao: string | null
      banco: string | null; agencia: string | null
      conta_bancaria: string | null; tipo_conta: string | null
      chave_pix: string | null; ativo: boolean
      cooperados: { nome_completo: string } | null
    }>
  } catch (e: any) {
    console.error('[listarProdutores] FALHA na linha:', e?.stack ?? e?.message ?? e)
    throw e
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
}) {
  try {
    const usuario = await getUsuarioLogado()
    const orgId = usuario.organizacao_id
    console.log('[criarProdutor] orgId:', orgId, '| nome:', form.nome)
    if (!orgId) throw new Error('Usuário sem organização')
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('produtores')
      .insert({
        ...form,
        tipo: form.tipo as TipoProdutorVinculo,
        tipo_conta: (form.tipo_conta as TipoContaProdutorConta) ?? null,
        organizacao_id: orgId,
      })
    if (error) throw new Error(error.message)
  } catch (e: any) {
    console.error('[criarProdutor] FALHA:', e?.stack ?? e?.message ?? e)
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
}>) {
  try {
    console.log('[editarProdutor] id:', id)
    const supabase = createAdminClient()
    const { tipo_conta, tipo, ...rest } = form
    const { error } = await supabase
      .from('produtores')
      .update({
        ...rest,
        ...(tipo      ? { tipo: tipo as TipoProdutorVinculo }                                      : {}),
        ...(tipo_conta !== undefined ? { tipo_conta: tipo_conta as TipoContaProdutorConta | null } : {}),
      })
      .eq('id', id)
    if (error) throw new Error(error.message)
  } catch (e: any) {
    console.error('[editarProdutor] FALHA:', e?.stack ?? e?.message ?? e)
    throw e
  }
}

export async function listarCooperadosSemProdutor() {
  try {
    const usuario = await getUsuarioLogado()
    const orgId = usuario.organizacao_id
    console.log('[listarCooperadosSemProdutor] orgId:', orgId)
    // Nota: usuario NÃO tem cooperado_id. O cooperado_id abaixo é da tabela produtores.
    if (!orgId) throw new Error('Usuário sem organização')
    const supabase = createAdminClient()
    const { data: produtoresExistentes, error: eProd } = await supabase
      .from('produtores')
      .select('cooperado_id')
      .eq('organizacao_id', orgId)
      .not('cooperado_id', 'is', null)
    if (eProd) throw new Error(eProd.message)
    const idsVinculados = (produtoresExistentes ?? [])
      .map((p: any) => p.cooperado_id)
      .filter(Boolean)
    console.log('[listarCooperadosSemProdutor] cooperado_ids já vinculados:', idsVinculados)
    const { data, error } = await supabase
      .from('cooperados')
      .select('id, nome_completo')
      .eq('organizacao_id', orgId)
      .eq('ativo', true)
    if (error) throw new Error(error.message)
    const resultado = (data ?? [])
      .filter((c: any) => !idsVinculados.includes(c.id))
      .map((c: any) => ({ id: c.id as string, nome: c.nome_completo as string }))
    console.log('[listarCooperadosSemProdutor] cooperados disponíveis:', resultado.length)
    return resultado
  } catch (e: any) {
    console.error('[listarCooperadosSemProdutor] FALHA:', e?.stack ?? e?.message ?? e)
    throw e
  }
}
