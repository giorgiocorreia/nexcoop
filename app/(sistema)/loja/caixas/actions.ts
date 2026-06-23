'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getOrganizacaoId, getUsuarioLogado } from '@/lib/auth'
import { fecharCaixaLoja } from '@/lib/loja/actions'

export async function listarCaixasAbertos() {
  const orgId = await getOrganizacaoId()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('loja_caixas')
    .select(`
      id, status, valor_abertura, aberto_em,
      usuario_id,
      usuarios!loja_caixas_usuario_id_fkey(nome_completo)
    `)
    .eq('org_id', orgId)
    .eq('status', 'aberto')
    .order('aberto_em', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function listarCaixasFechados() {
  const orgId = await getOrganizacaoId()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('loja_caixas')
    .select(`
      id, status, valor_abertura, aberto_em, fechado_em,
      total_especie, total_pix, total_cartao, valor_fechamento,
      status_conferencia, usuario_id,
      usuarios!loja_caixas_usuario_id_fkey(nome_completo)
    `)
    .eq('org_id', orgId)
    .eq('status', 'fechado')
    .order('fechado_em', { ascending: false })
    .limit(30)

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function forcarFechamentoCaixa(caixaId: string) {
  const usuario = await getUsuarioLogado()
  const funcoes = (usuario.funcoes ?? []) as string[]
  if (!funcoes.includes('admin')) {
    return { error: 'Sem permissão.' }
  }
  return fecharCaixaLoja(usuario.organizacao_id!, caixaId, usuario.id, true)
}
