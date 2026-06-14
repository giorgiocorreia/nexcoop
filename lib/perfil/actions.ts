'use server'

import { createClient } from '@/lib/supabase/server'
import { registrarLog } from '@/lib/audit/logger'

export async function buscarPerfilCompleto() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: usuario, error } = await supabase
    .from('usuarios')
    .select(`
      id, nome_completo, cpf, email, telefone, avatar_url,
      endereco, municipio, estado,
      funcoes, vinculo, ativo, criado_em,
      organizacoes (
        id, nome, tipo
      )
    `)
    .eq('id', user.id)
    .single()

  if (error || !usuario) return null

  const { data: atividades } = await supabase
    .from('audit_logs')
    .select('id, acao, descricao, created_at')
    .eq('usuario_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  // Normaliza organizacoes (PostgREST pode retornar objeto ou array)
  const org = usuario.organizacoes as any
  const orgNorm = Array.isArray(org) ? (org[0] ?? null) : (org ?? null)

  return {
    usuario: {
      id:           usuario.id,
      nome_completo: usuario.nome_completo,
      cpf:          usuario.cpf,
      email:        usuario.email,
      telefone:     usuario.telefone,
      avatar_url:   usuario.avatar_url,
      endereco:     (usuario as any).endereco    as string | null,
      municipio:    (usuario as any).municipio   as string | null,
      estado:       (usuario as any).estado      as string | null,
      funcoes:      usuario.funcoes              as string[] | null,
      vinculo:      usuario.vinculo,
      ativo:        usuario.ativo,
      criado_em:    usuario.criado_em,
      organizacoes: orgNorm as { id: string; nome: string; tipo: string } | null,
    },
    atividades: (atividades ?? []) as Array<{
      id: string
      acao: string
      descricao: string | null
      created_at: string
    }>,
  }
}

export async function salvarPerfil(dados: {
  nome_completo: string
  cpf:           string
  telefone:      string
  endereco:      string
  municipio:     string
  estado:        string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { data: usuarioAtual } = await supabase
    .from('usuarios')
    .select('organizacao_id')
    .eq('id', user.id)
    .single()

  const { error } = await supabase
    .from('usuarios')
    .update({
      nome_completo: dados.nome_completo,
      cpf:           dados.cpf       || null,
      telefone:      dados.telefone  || null,
      endereco:      dados.endereco  || null,
      municipio:     dados.municipio || null,
      estado:        dados.estado    || null,
    } as any)
    .eq('id', user.id)

  if (error) throw new Error(error.message)

  await registrarLog({
    acao:          'perfil_atualizado',
    modulo:        'perfil',
    descricao:     'Usuário atualizou seus dados pessoais',
    usuario_id:    user.id,
    usuario_email: user.email,
    org_id:        usuarioAtual?.organizacao_id ?? null,
  })
}
