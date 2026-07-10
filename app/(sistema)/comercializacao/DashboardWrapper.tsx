import { getDashboardComercializacao } from '@/lib/comercializacao/dashboard'
import { getCacauAOrdem } from '@/lib/comercializacao/cacau-a-ordem'
import { getOrganizacaoId } from '@/lib/auth'
import DashboardComercializacao from './DashboardClient'

export default async function DashboardWrapper() {
  const organizacaoId = await getOrganizacaoId()
  const [data, cacauAOrdem] = await Promise.all([
    getDashboardComercializacao(organizacaoId),
    getCacauAOrdem(),
  ])
  return <DashboardComercializacao data={data} cacauAOrdem={cacauAOrdem} organizacaoId={organizacaoId} />
}
