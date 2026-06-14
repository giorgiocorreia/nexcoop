'use server'

import { createClient } from '@/lib/supabase/server'
import { registrarLog } from '@/lib/audit/logger'

export async function buscarPerfilCompleto() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: raw } = await supabase
    .from('usuarios')
    .select(`
      id, nome_completo, cpf, email, telefone, endereco, municipio, estado,
      funcoes, vinculo, criado_em, organizacao_id,
      organizacoes (
        id, nome, tipo
      )
    `)
    .eq('id', user.id)
    .single()

  if (!raw) return null

  const r = raw as Record<string, any>

  const { data: atividades } = await supabase
    .from('audit_logs')
    .select('id, acao, descricao, created_at')
    .eq('usuario_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  const org = Array.isArray(r.organizacoes) ? r.organizacoes[0] : r.organizacoes

  return {
    usuario: {
      id:           r.id            as string,
      nome:         r.nome_completo as string,
      cpf:          r.cpf           as string | null,
      email:        r.email         as string | null,
      telefone:     r.telefone      as string | null,
      endereco:     r.endereco      as string | null,
      municipio:    r.municipio     as string | null,
      estado:       r.estado        as string | null,
      funcoes:      r.funcoes       as string[] | null,
      vinculo:      r.vinculo       as string | null,
      created_at:   r.criado_em     as string,
      organizacoes: org ? {
        id:   org.id   as string,
        nome: org.nome as string,
        tipo: org.tipo as string,
      } : null,
    },
    atividades: (atividades ?? []) as Array<{
      id:          string
      acao:        string
      descricao:   string | null
      created_at:  string
    }>,
  }
}

export async function salvarPerfil(dados: {
  nome:      string
  telefone:  string
  endereco:  string
  municipio: string
  estado:    string
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
      nome_completo: dados.nome,
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
    org_id:        usuarioAtual?.organizacao_id ?? null,
    usuario_email: user.email,
  })
}
