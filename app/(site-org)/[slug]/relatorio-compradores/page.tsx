import { notFound } from 'next/navigation'
import { temCustomizacao } from '@/lib/site/custom'
import CoopaibiRelatorio from '@/components/site/custom/coopaibi/pages/CoopaibiRelatorio'

export const metadata = { title: 'Compradores Mundiais de Cacau' }

// Página só existe pra orgs customizadas (ver lib/site/custom.ts) — não faz
// parte do template padrão do módulo Site.
export default async function RelatorioCompradoresPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (!temCustomizacao(slug)) notFound()

  return <CoopaibiRelatorio />
}
