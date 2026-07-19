import { notFound } from 'next/navigation'
import { buscarSiteConfigPorSlug, buscarOrganizacao } from '@/lib/site/queries'
import { resolverTema } from '@/lib/site/site-utils'
import { SecTag, SecTitle, Section, BtnPrimary } from '@/components/site/SiteUi'

export const metadata = { title: 'Na Casa dos Homens de Barro' }

// Experiência "Casa dos Homens de Barro" (ateliê Cores da Terra, com Selma
// Calheira) — página autoral do site atual, portada em versão mais simples
// (sem as animações CSS originais) pra caber no template do módulo Site.
const ETAPAS = [
  { titulo: 'Chegar', texto: 'Você é recebido no ateliê, longe da pressa do cotidiano — o primeiro passo pra desacelerar.' },
  { titulo: 'Mergulhar', texto: 'Três dias de convivência, mãos no barro e criação coletiva — o processo é tão importante quanto a peça.' },
  { titulo: 'Fechar', texto: 'A experiência se encerra com o que foi criado — e com o que ficou em cada participante.' },
]

export default async function HomensDeBarroPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const config = await buscarSiteConfigPorSlug(slug)
  if (!config) notFound()
  const org = await buscarOrganizacao(config.organizacao_id)
  if (!org) notFound()
  const tema = resolverTema(config, org.nome)

  return (
    <>
      <section className="text-white" style={{ background: `linear-gradient(135deg, ${tema.corEscura}, ${tema.corDourada})` }}>
        <div className="max-w-3xl mx-auto px-6 py-20 text-center">
          <div className="text-xs font-bold uppercase tracking-[0.3em] text-white/70 mb-4">Na Casa dos Homens de Barro</div>
          <h1 className="text-3xl md:text-5xl font-black mb-4">Três dias fora do tempo comum</h1>
          <p className="text-white/85 italic">Arte, convivência e criação coletiva — uma imersão sem preocupações.</p>
        </div>
      </section>

      <Section>
        <SecTag tema={tema}>A Experiência</SecTag>
        <SecTitle>Arte, convivência e criação coletiva</SecTitle>
        <p className="text-sm text-gray-500 leading-relaxed max-w-2xl">
          A Cores da Terra não é apenas um ateliê. É um território onde histórias são moldadas pelas
          mãos, onde a arte nasce do cotidiano e onde cada peça carrega a energia de quem a criou.
          Estar na Casa dos Homens de Barro é atravessar um portal entre arte e vida, participando do
          processo onde tudo acontece. O barro ensina algo que o mundo moderno quase esqueceu: o tempo
          da pausa.
        </p>
      </Section>

      <Section className="bg-gray-50">
        <div className="text-center mb-8">
          <SecTag tema={tema}>Três dias que moldam a alma</SecTag>
          <SecTitle>Como funciona a imersão</SecTitle>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {ETAPAS.map((e) => (
            <div key={e.titulo} className="bg-white rounded-xl border border-gray-200 p-6 text-center">
              <h3 className="font-bold mb-2 text-gray-800">{e.titulo}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{e.texto}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <div className="text-center max-w-xl mx-auto">
          <SecTag tema={tema}>Esta experiência é para você</SecTag>
          <SecTitle>Uma imersão sem preocupações</SecTitle>
          <p className="text-sm text-gray-500 leading-relaxed mb-6">
            Esta experiência foi pensada para que você não precise se preocupar com nada. Durante os
            três dias, tudo é cuidadosamente preparado para que os participantes possam apenas chegar,
            viver e criar.
          </p>
          <BtnPrimary href={`/${slug}/cooperado#formulario`} tema={tema}>Quero saber mais →</BtnPrimary>
        </div>
      </Section>
    </>
  )
}
