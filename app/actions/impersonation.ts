'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function entrarComoOrg(orgId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('role')
    .eq('id', user.id)
    .single()

  if (usuario?.role !== 'super_admin') {
    throw new Error('Acesso negado.')
  }

  const cookieStore = await cookies()
  cookieStore.set('impersonating_org', orgId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8, // 8 horas
  })

  redirect('/dashboard')
}

export async function sairDaOrg() {
  const cookieStore = await cookies()
  cookieStore.delete('impersonating_org')
  redirect('/admin')
}
