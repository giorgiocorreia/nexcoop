'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function sairDaOrgParceiro() {
  const cookieStore = await cookies()
  cookieStore.delete('parceiro_org_id')
  redirect('/escritorio')
}
