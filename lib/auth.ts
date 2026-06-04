'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function getUsuarioLogado() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario, error } = await supabase
    .from('usuarios')
    .select('id, organizacao_id, role, funcoes, nome_completo, email')
    .eq('id', user.id)
    .single()

  if (error || !usuario) redirect('/login')
  return usuario
}
