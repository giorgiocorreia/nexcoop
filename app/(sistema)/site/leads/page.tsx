import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOrgContext } from '@/lib/supabase/impersonation'
import { redirect } from 'next/navigation'
import { isAdmin } from '@/lib/permissoes'
import { temModulo } from '@/lib/org'
import LeadsClient from './LeadsClient'
import type { SiteLead } from '@/types/database'

export const metadata = { title: 'Leads do site — NexCoop' }

// Teto de leitura. A tela é de acompanhamento do que chegou recentemente, não
// arquivo histórico — sem limite, uma org com anos de formulário mandaria a
// tabela inteira para o browser.
const LIMITE = 500

export default async function SiteLeadsPage() {
  const supabaseAuth = await createClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) redirect('/login')

  const ctx = await getOrgContext()
  if (!ctx) redirect('/login')

  // Permissão e módulo: o lead traz telefone, e-mail e CPF de quem se
  // candidatou — leitura restrita a admin, como o resto do cadastro.
  const admin = createAdminClient()
  const { data: usuario } = await admin
    .from('usuarios')
    .select('role, funcoes')
    .eq('id', user.id)
    .single()
  if (!usuario || !isAdmin(usuario)) redirect('/dashboard')

  // Gate de módulo vale SÓ para associação — mesma regra da Sidebar
  // (components/Sidebar.tsx, `enforcaModulo`): cooperativa e central nunca
  // perdem acesso por `modulos_ativos` incompleto. A COOPAIBI, por exemplo,
  // tem só ["loja"] gravado e usa o sistema inteiro.
  const { data: org } = await admin
    .from('organizacoes')
    .select('tipo, modulos_ativos')
    .eq('id', ctx.orgId)
    .single()
  const enforcaModulo = org?.tipo === 'associacao'
  if (enforcaModulo && !temModulo(org?.modulos_ativos, 'site')) redirect('/dashboard')

  const { data: leads } = await ctx.supabase
    .from('site_leads')
    .select('*')
    .eq('organizacao_id', ctx.orgId)
    .order('criado_em', { ascending: false })
    .limit(LIMITE)

  return <LeadsClient leads={(leads ?? []) as SiteLead[]} limite={LIMITE} />
}
