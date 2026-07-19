import { notFound } from 'next/navigation'
import { buscarSiteConfigPorSlug } from '@/lib/site/queries'
import { temCustomizacao } from '@/lib/site/custom'
import CoopaibiLoja from '@/components/site/custom/coopaibi/pages/CoopaibiLoja'

export const revalidate = 300
export const metadata = { title: 'Loja' }

// Rota só existe hoje pra orgs com customização "porte fiel" (ver
// lib/site/custom.ts) — o template padrão do módulo Site ainda não tem uma
// página de loja própria, então 404 pra qualquer outro slug.
export default async function LojaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (!temCustomizacao(slug)) notFound()

  const config = await buscarSiteConfigPorSlug(slug)
  if (!config) notFound()

  return <CoopaibiLoja orgId={config.organizacao_id} />
}
