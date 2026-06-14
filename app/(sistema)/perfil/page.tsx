import { buscarPerfilCompleto } from '@/lib/perfil/actions'
import PerfilUsuarioClient from './PerfilUsuarioClient'
import { redirect } from 'next/navigation'

export default async function PerfilPage() {
  const dados = await buscarPerfilCompleto()
  if (!dados) redirect('/login')
  return <PerfilUsuarioClient dados={dados} />
}
