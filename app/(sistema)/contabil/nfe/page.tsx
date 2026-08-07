import { createClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/supabase/impersonation'
import { redirect } from 'next/navigation'
import ContabilNfeHub from './ContabilNfeHub'

export const metadata = { title: 'NF-e — Contábil — NexCoop' }

/**
 * Módulo Contábil — NF-e (consulta).
 * Código 100% em app/(sistema)/contabil/nfe/* — não importa
 * comercializacao/fiscal/* (páginas independentes).
 */
export default async function ContabilNfePage() {
  const supabaseAuth = await createClient()
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser()
  if (!user) redirect('/login')

  const ctx = await getOrgContext()
  if (!ctx) redirect('/escritorio')

  return <ContabilNfeHub orgId={ctx.orgId} />
}
