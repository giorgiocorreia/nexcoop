import { createClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/supabase/impersonation'
import { redirect } from 'next/navigation'
import FiscalHubClient from '@/app/(sistema)/comercializacao/fiscal/FiscalHubClient'
import { MODULO_CONTABIL } from '@/components/nexcoop/ui'

export const metadata = { title: 'NF-e — NexCoop' }

export default async function NFePage() {
  const supabaseAuth = await createClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) redirect('/login')

  const ctx = await getOrgContext()
  if (!ctx) redirect('/escritorio')

  // Mesma listagem de NF-e emitidas da Comercialização (vendas_externas /
  // notas_entrega), não só XMLs manuais em nfe_importadas.
  return (
    <FiscalHubClient
      orgId={ctx.orgId}
      modulo={MODULO_CONTABIL}
      breadcrumbLabel="NF-e"
      titulo="NF-e — Notas Fiscais"
      subtitulo="Notas emitidas na comercialização (saídas, entradas e devoluções)"
    />
  )
}
