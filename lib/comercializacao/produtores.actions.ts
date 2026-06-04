'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getUsuarioLogado } from '@/lib/auth'
import type { TipoContaProdutorConta, TipoProdutorVinculo } from '@/types/database'

export async function listarProdutores() {
  const usuario = await getUsuarioLogado()
  const orgId = usuario.organizacao_id
  if (!orgId) throw new Error('Usuário sem organização')
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('produtores')
    .select('*, cooperados(nome_completo)')
    .eq('organizacao_id', orgId)
    .order('nome')
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
      organizacao_id: orgId,
    })
  if (error) throw new Error(error.message)
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
  const supabase = createAdminClient()
  const { tipo_conta, tipo, ...rest } = form
  const { error } = await supabase
    .from('produtores')
    .update({
      ...rest,
      ...(tipo    ? { tipo: tipo as TipoProdutorVinculo }                          : {}),
      ...(tipo_conta !== undefined ? { tipo_conta: tipo_conta as TipoContaProdutorConta | null } : {}),
    })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function listarCooperadosSemProdutor() {
  const usuario = await getUsuarioLogado()
  const orgId = usuario.organizacao_id
  if (!orgId) throw new Error('Usuário sem organização')
  const supabase = createAdminClient()
  // Cooperados que ainda não têm registro em produtores
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
    .eq('ativo', true)
  if (error) throw new Error(error.message)
  return (data ?? [])
    .filter((c: any) => !idsVinculados.includes(c.id))
    .map((c: any) => ({ id: c.id as string, nome: c.nome_completo as string }))
}
