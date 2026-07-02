import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { temAlgumaFuncao } from '@/lib/permissoes'
import type { Oportunidade, Usuario, RadarFonte, RadarResultado } from '@/types/database'
import KanbanBoard from '@/components/captacao/KanbanBoard'

export const metadata = { title: 'Captação de Recursos — NexCoop' }

export default async function CaptacaoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!usuario) redirect('/login')
  if (!temAlgumaFuncao(usuario, ['admin', 'captador'])) redirect('/dashboard')

  const orgId = usuario.organizacao_id!

  const [
    { data: oportunidades },
    { data: todosUsuarios },
    { data: fontes },
    { data: resultados },
  ] = await Promise.all([
    supabase
      .from('oportunidades')
      .select('*')
      .neq('status', 'arquivado')
      .order('prazo_submissao', { ascending: true, nullsFirst: false }),
    supabase
      .from('usuarios')
      .select('id, nome_completo, funcoes')
      .eq('organizacao_id', orgId)
      .eq('ativo', true),
    supabase
      .from('radar_fontes')
      .select('*')
      .eq('organizacao_id', orgId)
      .order('criado_em'),
    supabase
      .from('radar_resultados')
      .select('*')
      .eq('organizacao_id', orgId)
      .order('score', { ascending: false })
      .limit(200),
  ])

  const responsaveis = (todosUsuarios ?? []).filter(
    u => u.funcoes?.includes('admin') || u.funcoes?.includes('captador')
  ) as Pick<Usuario, 'id' | 'nome_completo'>[]

  return (
    <KanbanBoard
      oportunidades={(oportunidades ?? []) as Oportunidade[]}
      responsaveis={responsaveis}
      fontes={(fontes ?? []) as RadarFonte[]}
      resultados={(resultados ?? []) as RadarResultado[]}
      usuarioAtual={{ id: usuario.id, nome_completo: usuario.nome_completo }}
    />
  )
}
