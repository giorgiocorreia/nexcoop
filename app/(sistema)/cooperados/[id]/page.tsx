import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import { isAdmin, temAlgumaFuncao } from '@/lib/permissoes'
import CooperadoPerfil from './CooperadoPerfil'

export type AcessoCooperado =
  | { temAcesso: false }
  | { temAcesso: true; email: string | null; ativo: boolean }

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('cooperados')
    .select('nome_completo')
    .eq('id', id)
    .single()
  return { title: data ? `${data.nome_completo} — NexCoop` : 'Cooperado — NexCoop' }
}

export default async function CooperadoPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Mesmo guard da lista (/cooperados): admin ou tecnico — antes de carregar
  // qualquer dado do cooperado, pra URL direta não vazar ficha de terceiro.
  const { data: usuarioAtual } = await supabase
    .from('usuarios')
    .select('role, funcoes')
    .eq('id', user.id)
    .single()
  if (!usuarioAtual || !temAlgumaFuncao(usuarioAtual as any, ['admin', 'tecnico'])) redirect('/dashboard')

  const { data: cooperado, error } = await supabase
    .from('cooperados')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !cooperado) notFound()

  const { data: org } = await supabase
    .from('organizacoes')
    .select('nome, tipo')
    .eq('id', cooperado.organizacao_id)
    .single()

  const { data: propriedades } = await supabase
    .from('propriedades_rurais' as any)
    .select('*')
    .eq('cooperado_id', id)
    .order('criado_em', { ascending: true })

  // Permissão de admin do usuário logado (já carregado no guard acima)
  const ehAdmin = isAdmin(usuarioAtual as any)

  // Estado do acesso ao sistema (login) deste cooperado
  let acesso: AcessoCooperado = { temAcesso: false }
  if (cooperado.usuario_id) {
    const admin = createAdminClient()
    const { data: usuario } = await admin
      .from('usuarios')
      .select('email, ativo')
      .eq('id', cooperado.usuario_id)
      .single()
    acesso = {
      temAcesso: true,
      email: usuario?.email ?? cooperado.email ?? null,
      ativo: usuario?.ativo ?? false,
    }
  }

  return (
    <CooperadoPerfil
      cooperado={cooperado}
      propriedades={(propriedades ?? []) as any}
      orgTipo={org?.tipo ?? null}
      orgNome={org?.nome ?? null}
      usuarioId={user.id}
      ehAdmin={ehAdmin}
      acesso={acesso}
    />
  )
}
