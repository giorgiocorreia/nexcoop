import { notFound } from 'next/navigation'
import { buscarSiteConfigPorSlug } from '@/lib/site/queries'
import { temCustomizacao } from '@/lib/site/custom'
import CoopaibiVideos from '@/components/site/custom/coopaibi/pages/CoopaibiVideos'

export const revalidate = 300
export const metadata = { title: 'Vídeos' }

export default async function VideosPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (!temCustomizacao(slug)) notFound()

  const config = await buscarSiteConfigPorSlug(slug)
  if (!config) notFound()

  return <CoopaibiVideos orgId={config.organizacao_id} />
}
