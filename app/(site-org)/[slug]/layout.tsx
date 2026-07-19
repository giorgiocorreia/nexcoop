import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { Montserrat, Open_Sans } from 'next/font/google'
import { buscarSiteConfigPorSlug, buscarOrganizacao } from '@/lib/site/queries'
import { resolverTema } from '@/lib/site/site-utils'
import SiteNavbar from '@/components/site/SiteNavbar'
import SiteFooter from '@/components/site/SiteFooter'
import { PreviewBanner, WhatsappFloat } from '@/components/site/SiteUi'

// Controla noindex/robots por org (site_config.indexavel) — checagem
// obrigatória (ver comentário da coluna na migration 085): evita disputa de
// SEO com o site antigo em cPanel enquanto os dois convivem.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const config = await buscarSiteConfigPorSlug(slug)
  if (!config) return {}
  const org = await buscarOrganizacao(config.organizacao_id)
  const tema = resolverTema(config, org?.nome ?? slug)
  return {
    title: { default: tema.nomeExibicao, template: `%s — ${tema.nomeExibicao}` },
    robots: config.indexavel
      ? { index: true, follow: true }
      : { index: false, follow: false },
  }
}

// Fontes do site público — Montserrat/Open Sans reproduzem a identidade do
// site atual da COOPAIBI (assets/style.css). Ficam isoladas aqui (variável
// CSS própria) sem interferir na Inter usada pelo resto do app.
const montserrat = Montserrat({ subsets: ['latin'], weight: ['400', '600', '700', '800', '900'], variable: '--font-site-heading' })
const openSans   = Open_Sans({ subsets: ['latin'], weight: ['400', '600'], variable: '--font-site-body' })

// Layout do site público — propositalmente SEM o layout/navegação do
// sistema interno (regra do plano: "layout próprio, sem o layout do
// sistema"). notFound() quando o slug não existe em site_config.
export default async function SiteOrgLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const config = await buscarSiteConfigPorSlug(slug)
  if (!config) notFound()

  const org = await buscarOrganizacao(config.organizacao_id)
  if (!org) notFound()

  const tema = resolverTema(config, org.nome)

  return (
    <div className={`${montserrat.variable} ${openSans.variable}`} style={{ fontFamily: 'var(--font-site-body)' }}>
      {!config.publicado && <PreviewBanner />}
      <SiteNavbar slug={slug} tema={tema} telefone={org.telefone} email={org.email} />
      <main style={{ fontFamily: 'var(--font-site-body)' }}>{children}</main>
      <SiteFooter tema={tema} org={org} />
      <WhatsappFloat
        numero={(org.telefone ?? '').replace(/\D/g, '') || '5573999768420'}
        mensagem={`Olá! Vim pelo site da ${tema.nomeExibicao} e gostaria de mais informações.`}
      />
      <style>{`
        main h1, main h2, main h3, main h4 { font-family: var(--font-site-heading); }
      `}</style>
    </div>
  )
}
