import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PerfilUsuarioClient from './PerfilUsuarioClient'

export default async function PerfilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('id, nome_completo, telefone, cpf, endereco, municipio, funcoes, vinculo, organizacao_id, ultimo_acesso, created_at')
    .eq('id', user.id)
    .single()

  const { data: org } = usuario?.organizacao_id ? await supabase
    .from('organizacoes')
    .select('nome')
    .eq('id', usuario.organizacao_id)
    .single() : { data: null }

  return <PerfilUsuarioClient usuario={usuario} email={user.email || ''} orgNome={org?.nome ?? ''} />
}
