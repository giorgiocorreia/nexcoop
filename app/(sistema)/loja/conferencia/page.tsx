import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { podeGerenciarLoja } from '@/lib/permissoes'
import ConferenciaClient from './ConferenciaClient'

export default async function ConferenciaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('organizacao_id, role, funcoes')
    .eq('id', user.id)
    .single()

  if (!usuario?.organizacao_id) redirect('/login')
  if (!podeGerenciarLoja({ role: usuario.role, funcoes: (usuario.funcoes ?? []) as string[] })) {
    redirect('/loja')
  }

  const admin = createAdminClient()
  const orgId = usuario.organizacao_id as string

  const { data: caixas } = await admin
    .from('loja_caixas')
    .select(`
      id, aberto_em, fechado_em, valor_abertura,
      total_especie, total_pix, total_cartao,
      valor_fisico_especie, valor_fisico_debito, valor_fisico_credito,
      status_conferencia, observacao_conferencia, conferido_em,
      usuario_id
    `)
    .eq('org_id', orgId)
    .eq('status', 'fechado')
    .order('fechado_em', { ascending: false })
    .limit(30)

  const usuarioIds = [...new Set((caixas ?? []).map(c => c.usuario_id).filter(Boolean))]
  const { data: usuarios } = usuarioIds.length > 0
    ? await admin
        .from('usuarios')
        .select('id, nome_completo')
        .in('id', usuarioIds)
    : { data: [] }

  const nomePorId = Object.fromEntries(
    (usuarios ?? []).map(u => [u.id, u.nome_completo])
  )

  const caixasComNome = (caixas ?? []).map(c => ({
    ...c,
    usuarios: c.usuario_id ? { nome_completo: nomePorId[c.usuario_id] ?? '—' } : null
  }))

  return (
    <ConferenciaClient
      orgId={orgId}
      usuarioId={user.id}
      caixas={caixasComNome as any[]}
    />
  )
}
