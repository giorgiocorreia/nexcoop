import { createClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/supabase/impersonation'
import { redirect } from 'next/navigation'
import ContabilNfeClient from './ContabilNfeClient'

export const metadata = { title: 'NF-e — NexCoop' }

/**
 * Módulo Contábil — consulta de NF-e emitidas.
 * Página própria (não reutiliza o hub operacional de /comercializacao/fiscal):
 * sem Cancelar, sem CC-e, sem ações de lote/caixa.
 */
export default async function NFePage() {
  const supabaseAuth = await createClient()
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser()
  if (!user) redirect('/login')

  const ctx = await getOrgContext()
  if (!ctx) redirect('/escritorio')

  return <ContabilNfeClient orgId={ctx.orgId} />
}
