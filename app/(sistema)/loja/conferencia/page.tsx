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
      id, aberto_em, fechado_em, valor_abertura, valor_fechamento,
      total_especie, total_pix, total_cartao,
      valor_fisico_especie, valor_fisico_debito, valor_fisico_credito,
      status_conferencia, observacao_conferencia, conferido_em,
      usuarios ( nome_completo )
    `)
    .eq('org_id', orgId)
    .eq('status', 'fechado')
    .order('fechado_em', { ascending: false })
    .limit(30)

  return (
    <ConferenciaClient
      orgId={orgId}
      usuarioId={user.id}
      caixas={(caixas ?? []) as any[]}
    />
  )
}
