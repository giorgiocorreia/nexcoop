'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export async function buscarEmailPorCPF(cpf: string): Promise<{ email: string } | { error: string }> {
  const cpfLimpo = cpf.replace(/\D/g, '')
  if (cpfLimpo.length !== 11) {
    return { error: 'CPF invalido.' }
  }

  const admin = createAdminClient()
  const { data: cooperado } = await admin
    .from('cooperados')
    .select('usuario_id, status')
    .eq('cpf', cpfLimpo)
    .eq('status', 'ativo')
    .not('usuario_id', 'is', null)
    .limit(1)
    .maybeSingle()

  if (!cooperado?.usuario_id) {
    return { error: 'Cooperado nao encontrado ou sem acesso ao portal.' }
  }

  const { data: usuario } = await admin
    .from('usuarios')
    .select('email, ativo')
    .eq('id', cooperado.usuario_id)
    .single()

  if (!usuario?.email || !usuario.ativo) {
    return { error: 'Usuario nao encontrado ou inativo.' }
  }

  return { email: usuario.email }
}