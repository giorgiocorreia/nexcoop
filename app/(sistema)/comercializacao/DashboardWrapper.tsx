import { getDashboardComercializacao } from '@/lib/comercializacao/dashboard'
import { getOrganizacaoId } from '@/lib/auth'
import DashboardComercializacao from './DashboardClient'

export default async function DashboardWrapper() {
  const organizacaoId = await getOrganizacaoId()
  const data = await getDashboardComercializacao(organizacaoId)
  return <DashboardComercializacao data={data} organizacaoId={organizacaoId} />
}
