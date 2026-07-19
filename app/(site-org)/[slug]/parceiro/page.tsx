import { notFound } from 'next/navigation'
import { buscarSiteConfigPorSlug, buscarOrganizacao } from '@/lib/site/queries'
import { resolverTema } from '@/lib/site/site-utils'
import { SecTag, SecTitle, SecSub, Section, BtnPrimary, BtnOutline } from '@/components/site/SiteUi'
import FormularioInteresse from '@/components/site/FormularioInteresse'

export const metadata = { title: 'Seja Parceiro' }

const COTAS = [
  { nome: 'Ouro', icone: '🌳', valor: 'R$ 1.480.620', sub: '~USD 262.000 · Patrocinador único', destaque: true, beneficios: ['Logo na capa e em todos os materiais', 'Relatórios trimestrais auditáveis', 'Visita de campo exclusiva', 'Créditos de carbono certificáveis (Verra/VCS)', 'Naming rights do viveiro'] },
  { nome: 'Prata', icone: '🌿', valor: 'R$ 740.310', sub: '~USD 131.000 · Até 2 patrocinadores', beneficios: ['Logo em destaque nos materiais', 'Relatórios semestrais verificáveis', 'Visita de campo ao projeto', 'Relatório de impacto anual completo'] },
  { nome: 'Bronze', icone: '🍃', valor: 'R$ 296.124', sub: '~USD 52.400 · Até 5 patrocinadores', beneficios: ['Logo nos materiais do projeto', 'Relatório anual de impacto', 'Menção em comunicações institucionais'] },
  { nome: 'Apoio', icone: '🌱', valor: 'A partir de R$ 50.000', sub: '~USD 8.850 · Vagas abertas', beneficios: ['Menção como apoiador institucional', 'Relatório anual de impacto', 'Certificado de contribuição ambiental'] },
]

const BENEFICIOS = [
  { icone: '📊', titulo: 'Impacto verificável e auditável', texto: 'Hectares restaurados, espécies plantadas e carbono sequestrado — dados compatíveis com GRI, ODS e IPCC AR6.' },
  { icone: '🌿', titulo: 'Visibilidade institucional', texto: 'Associação da sua marca a um projeto de conservação com resultados mensuráveis.' },
  { icone: '🌡', titulo: 'Metas de carbono corporativo', texto: 'O sequestro de CO₂eq gerado pode ser incorporado ao balanço de carbono da empresa.' },
  { icone: '📸', titulo: 'Conteúdo autêntico para comunicação', texto: 'Visitas de campo e relatórios geram conteúdo genuíno para campanhas ESG.' },
]

export default async function ParceiroPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const config = await buscarSiteConfigPorSlug(slug)
  if (!config) notFound()
  const org = await buscarOrganizacao(config.organizacao_id)
  if (!org) notFound()
  const tema = resolverTema(config, org.nome)

  return (
    <>
      <section className="text-white" style={{ background: `linear-gradient(135deg, ${tema.corPrimaria}, ${tema.corSecundaria})` }}>
        <div className="max-w-3xl mx-auto px-6 py-16 text-center">
          <div className="inline-block text-xs font-bold uppercase tracking-widest bg-white/15 rounded-full px-4 py-1.5 mb-4">🌿 Projeto Cacau que Refloresta</div>
          <h1 className="text-3xl md:text-4xl font-black mb-4">Associe sua marca à restauração da Mata Atlântica</h1>
          <p className="text-white/85 mb-8">
            Impacto ambiental real, desenvolvimento social concreto e retorno reputacional — com
            indicadores verificáveis e governança transparente.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <BtnPrimary href="#cotas" tema={tema}>Ver cotas de parceria</BtnPrimary>
            <BtnOutline href="#formulario">Enviar proposta agora</BtnOutline>
          </div>
        </div>
      </section>

      <Section>
        <SecTag tema={tema}>Por que ser parceiro</SecTag>
        <SecTitle>O que sua empresa recebe ao investir</SecTitle>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-5">
          {BENEFICIOS.map((b) => (
            <div key={b.titulo} className="flex gap-3">
              <span className="text-xl">{b.icone}</span>
              <div>
                <h4 className="font-bold text-sm text-gray-800 mb-1">{b.titulo}</h4>
                <p className="text-xs text-gray-500 leading-relaxed">{b.texto}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section className="bg-gray-50" id="cotas">
        <div className="text-center">
          <SecTag tema={tema}>Modalidades de investimento</SecTag>
          <SecTitle>Escolha sua cota de parceria</SecTitle>
          <SecSub>Estruturadas para diferentes capacidades e objetivos. Todos os patrocinadores recebem relatórios de impacto com dados auditáveis.</SecSub>
        </div>
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {COTAS.map((c) => (
            <div
              key={c.nome}
              className="bg-white rounded-xl p-5 border"
              style={c.destaque ? { borderColor: tema.corDourada, borderWidth: 2 } : { borderColor: '#e5e7eb' }}
            >
              <span className="text-2xl">{c.icone}</span>
              <div className="font-black text-lg mt-2 text-gray-800">{c.nome}</div>
              <div className="text-lg font-black mt-1" style={{ color: tema.corPrimaria }}>{c.valor}</div>
              <div className="text-[11px] text-gray-400 mb-3">{c.sub}</div>
              <ul className="text-xs text-gray-500 space-y-1.5 list-disc list-inside">
                {c.beneficios.map((b) => <li key={b}>{b}</li>)}
              </ul>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 text-center mt-6">
          Valores de referência — recalculados na data de formalização da parceria.
        </p>
      </Section>

      <Section id="formulario">
        <div className="max-w-xl mx-auto">
          <div className="text-center mb-8">
            <SecTag tema={tema}>Vamos conversar?</SecTag>
            <SecTitle>Enviar proposta de parceria</SecTitle>
          </div>
          <FormularioInteresse slug={slug} tema={tema} />
        </div>
      </Section>
    </>
  )
}
