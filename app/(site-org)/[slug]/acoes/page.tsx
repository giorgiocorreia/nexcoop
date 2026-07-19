import { notFound } from 'next/navigation'
import { buscarSiteConfigPorSlug, buscarOrganizacao } from '@/lib/site/queries'
import { resolverTema } from '@/lib/site/site-utils'
import { temCustomizacao } from '@/lib/site/custom'
import { SecTag, SecTitle, SecSub, Section, BtnPrimary } from '@/components/site/SiteUi'
import ConteudosWidget from '@/components/site/ConteudosWidget'
import CoopaibiAcoes from '@/components/site/custom/coopaibi/pages/CoopaibiAcoes'

export const revalidate = 300

export default async function AcoesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const config = await buscarSiteConfigPorSlug(slug)
  if (!config) notFound()
  const org = await buscarOrganizacao(config.organizacao_id)
  if (!org) notFound()
  const tema = resolverTema(config, org.nome)

  if (temCustomizacao(slug)) {
    return <CoopaibiAcoes />
  }

  return (
    <>
      <section className="text-white" style={{ background: `linear-gradient(135deg, ${tema.corPrimaria}, ${tema.corSecundaria})` }}>
        <div className="max-w-6xl mx-auto px-6 py-16 text-center">
          <div className="text-xs font-bold uppercase tracking-widest text-white/80 mb-4">📋 Ações da {tema.nomeExibicao}</div>
          <h1 className="text-3xl md:text-4xl font-black mb-4">Projetos, eventos e parcerias que movem o campo</h1>
          <p className="text-white/85 max-w-2xl mx-auto">
            Acompanhe aqui tudo o que a cooperativa realiza — da organização de eventos regionais ao
            fortalecimento da cadeia produtiva.
          </p>
        </div>
      </section>

      <ConteudosWidget orgId={config.organizacao_id} tipo="evento" tema={tema} />
      <ConteudosWidget orgId={config.organizacao_id} tipo="noticia" tema={tema} className="bg-gray-50" />
      <ConteudosWidget orgId={config.organizacao_id} tipo="video" tema={tema} />
      <ConteudosWidget orgId={config.organizacao_id} tipo="promocao" tema={tema} className="bg-gray-50" />

      <Section>
        <div className="text-center">
          <SecTag tema={tema}>Participe</SecTag>
          <SecTitle>Quer participar das nossas ações?</SecTitle>
          <SecSub>
            Eventos, capacitações e parcerias são anunciados aqui assim que confirmados. Fale com a
            cooperativa ou acompanhe as novidades.
          </SecSub>
          <div className="mt-6">
            <BtnPrimary href={`/${slug}/cooperado`} tema={tema}>Seja Cooperado →</BtnPrimary>
          </div>
        </div>
      </Section>
    </>
  )
}
