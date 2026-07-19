import { notFound } from 'next/navigation'
import { buscarSiteConfigPorSlug, buscarOrganizacao } from '@/lib/site/queries'
import { conteudoOuPadrao, resolverTema } from '@/lib/site/site-utils'
import { SecTag, SecTitle, SecSub, Section, BtnPrimary, BtnOutline } from '@/components/site/SiteUi'
import CotacaoWidget from '@/components/site/CotacaoWidget'
import ProdutosWidget from '@/components/site/ProdutosWidget'
import ConteudosWidget from '@/components/site/ConteudosWidget'

// Cotação/produtos são "dados vivos" — cachear por 5 min evita bater no
// banco a cada visita, sem deixar o preço visivelmente desatualizado
// (ver docs/PLANO_MODULO_SITE.md, seção "Cotação do dia").
export const revalidate = 300

const IMPACTO = [
  { valor: '300 ha', label: 'Pastagem degradada restaurada em 3 anos' },
  { valor: '300 famílias', label: 'Beneficiadas diretamente (77 no piloto)' },
  { valor: '21.000 t', label: 'tCO₂eq sequestrado — metodologia IPCC AR6' },
  { valor: 'R$ 90 mil', label: 'Renda adicional estimada por produtor/safra' },
]

const SISTEMA = [
  { icone: '🍫', titulo: 'Cacau clonado de alta performance', texto: '900 plantas/ha de clones certificados pela CEPLAC, com resistência à vassoura-de-bruxa e tolerância à monilíase.' },
  { icone: '🌳', titulo: '30 espécies nativas por hectare', texto: 'Cajazeira, jequitibá-branco, cedro, ipê-amarelo, mogno-baiano, aroeira e ingá — selecionadas pelo sombreamento e valor madeireiro.' },
  { icone: '🐝', titulo: 'Apicultura integrada', texto: '5 colmeias a cada grupo de 10 produtores. Aumenta até 30% a produtividade do cacau e gera renda com mel de floresta.' },
  { icone: '🏗', titulo: 'Viveiro de mudas próprio', texto: '1.200 m², capacidade de 100.000 mudas/ano. Mudas repassadas a R$ 4,00 — até 70% abaixo do mercado.' },
  { icone: '📋', titulo: 'Apenas áreas degradadas', texto: 'Elegibilidade restrita a pastagem abandonada, capoeira rala ou áreas com histórico de queimadas.' },
  { icone: '💳', titulo: 'Créditos de carbono', texto: 'Elegível a certificação Verra/VCS e Gold Standard a partir do 3º ano — 70 a 150 tCO₂eq/ha em 20 anos.' },
]

export default async function SiteHomePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const config = await buscarSiteConfigPorSlug(slug)
  if (!config) notFound()
  const org = await buscarOrganizacao(config.organizacao_id)
  if (!org) notFound()
  const tema = resolverTema(config, org.nome)

  return (
    <>
      {/* HERO */}
      <section className="text-white" style={{ background: `linear-gradient(135deg, ${tema.corPrimaria}, ${tema.corSecundaria})` }}>
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-24 grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-white/80 mb-4">
              🌿 {org.cidade}{org.estado ? `, ${org.estado}` : ''} — Brasil
            </div>
            <h1 className="text-3xl md:text-5xl font-black leading-tight mb-5">
              {conteudoOuPadrao(config, 'hero_titulo', 'Onde o cacau cresce, a Mata Atlântica fica')}
            </h1>
            <p className="text-white/90 italic mb-4">
              {conteudoOuPadrao(config, 'hero_tagline', '"O cacau como solução para parar e reverter o desmatamento da Mata Atlântica"')}
            </p>
            <p className="text-white/85 leading-relaxed mb-8">
              {conteudoOuPadrao(
                config,
                'hero_texto',
                'O Projeto Cacau que Refloresta restaura áreas degradadas por meio de sistemas agroflorestais produtivos combinando cacau clonado, espécies nativas e apicultura integrada — gerando renda para centenas de famílias e sequestro verificável de carbono.'
              )}
            </p>
            <div className="flex flex-wrap gap-3">
              <BtnPrimary href={`/${slug}/parceiro`} tema={tema}>Seja Parceiro do Projeto</BtnPrimary>
              <BtnOutline href={`/${slug}/cooperado`}>Seja Cooperado</BtnOutline>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 bg-white/10 rounded-xl p-5 backdrop-blur-sm">
              <div className="text-[11px] uppercase tracking-wide text-white/70">Investimento fase piloto</div>
              <div className="text-2xl font-black">R$ 1.470.651</div>
              <div className="text-xs text-white/70">77 produtores · 12 meses</div>
            </div>
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
              <div className="text-[11px] uppercase tracking-wide text-white/70">Área restaurada</div>
              <div className="text-xl font-black">300 ha</div>
            </div>
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
              <div className="text-[11px] uppercase tracking-wide text-white/70">CO₂ sequestrado</div>
              <div className="text-xl font-black">21.000 t</div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <div className="text-white" style={{ backgroundColor: tema.corEscura }}>
        <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {IMPACTO.map((i) => (
            <div key={i.label}>
              <div className="text-xl md:text-2xl font-black" style={{ color: tema.corDestaque }}>{i.valor}</div>
              <div className="text-[11px] text-white/60 mt-1">{i.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* SOBRE / PROBLEMA */}
      <Section>
        <SecTag tema={tema}>O problema que resolvemos</SecTag>
        <SecTitle>O ciclo do desmatamento tem solução</SecTitle>
        <SecSub>
          Quando o preço do cacau cai, produtores sem renda alternativa recorrem às árvores nativas
          remanescentes. O Projeto Cacau que Refloresta rompe esse ciclo ao tornar a floresta um ativo
          produtivo permanente.
        </SecSub>
      </Section>

      {/* SISTEMA AGROFLORESTAL */}
      <Section className="bg-gray-50">
        <div className="text-center max-w-2xl mx-auto">
          <SecTag tema={tema}>O Sistema Agroflorestal</SecTag>
          <SecTitle>Cacau-Floresta: produção e conservação juntas</SecTitle>
          <SecSub>
            O sistema cabruca é uma prática secular do sul da Bahia — cacau cultivado sob o dossel de
            árvores nativas, abrigando entre 40% e 70% das espécies originais da Mata Atlântica.
          </SecSub>
        </div>
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {SISTEMA.map((s) => (
            <div key={s.titulo} className="bg-white rounded-xl border border-gray-200 p-5">
              <span className="text-2xl">{s.icone}</span>
              <h3 className="font-bold text-sm mt-3 mb-2 text-gray-800">{s.titulo}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{s.texto}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* COTAÇÃO DO DIA — dado vivo */}
      <CotacaoWidget orgId={config.organizacao_id} tema={tema} />

      {/* PRODUTOS DA LOJA — dado vivo */}
      <ProdutosWidget orgId={config.organizacao_id} tema={tema} />

      {/* EVENTOS — só aparece se houver itens cadastrados */}
      <ConteudosWidget orgId={config.organizacao_id} tipo="evento" tema={tema} className="bg-gray-50" />

      {/* CTA FINAL */}
      <div className="py-12" style={{ backgroundColor: tema.corSecundaria }}>
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap items-center justify-between gap-6">
          <div>
            <h2 className="text-white text-2xl font-black mb-1">Onde o cacau cresce, a mata fica.</h2>
            <p className="text-white/80 text-sm">Onde a mata fica, o futuro é possível. Faça parte dessa história.</p>
          </div>
          <BtnPrimary href={`/${slug}/parceiro`} tema={tema}>Quero ser parceiro do projeto →</BtnPrimary>
        </div>
      </div>
    </>
  )
}
