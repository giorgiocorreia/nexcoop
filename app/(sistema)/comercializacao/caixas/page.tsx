import { redirect } from 'next/navigation'
import { getUsuarioLogado } from '@/lib/auth'
import { listarSessoesAbertas, listarSessoesFechadas } from './actions'
import CaixasAdminClient from './CaixasAdminClient'

export default async function CaixasPage() {
  const usuario = await getUsuarioLogado()
  if (!usuario) redirect('/login')

  const funcoes = (usuario.funcoes ?? []) as string[]
  if (!funcoes.includes('admin')) redirect('/comercializacao')

  const [abertos, fechados] = await Promise.all([
    listarSessoesAbertas(),
    listarSessoesFechadas(),
  ])

  return <CaixasAdminClient abertos={abertos as any} fechados={fechados as any} />
}
