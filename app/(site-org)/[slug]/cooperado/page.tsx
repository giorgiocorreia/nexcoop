import { notFound } from 'next/navigation'
import { buscarSiteConfigPorSlug, buscarOrganizacao } from '@/lib/site/queries'
import { resolverTema } from '@/lib/site/site-utils'
import { SecTag, SecTitle, SecSub, Section } from '@/components/site/SiteUi'
import FormularioInteresse from '@/components/site/FormularioInteresse'

export const metadata = { title: 'Seja Cooperado' }

const PASSOS = [
  { n: 1, titulo: 'Preencha a proposta', texto: 'Solicite o formulário de adesão na sede ou envie seu interesse pelo formulário abaixo. Você precisará de um cooperado proponente.' },
  { n: 2, titulo: 'Curso de cooperativismo', texto: 'Participe do curso básico ministrado pela cooperativa — obrigatório para conhecer direitos e deveres do cooperado.' },
  { n: 3, titulo: 'Aprovação e quota-parte', texto: 'O Conselho de Administração analisa sua proposta. Após aprovação, você subscreve a quota-parte e assina o livro de matrícula.' },
  { n: 4, titulo: 'Bem-vindo!', texto: 'Você passa a ter acesso aos projetos, assistência técnica e benefícios da cooperativa.' },
]

const TIPOS = [
  { badge: '👤 Agricultor familiar', titulo: 'Produtor rural individual', itens: ['Agricultores familiares (Lei nº 11.326/2006)', 'Produção em imóvel próprio ou ocupação legítima', 'Prioridade para mulheres, jovens e idosos', 'Voz e voto plenos nas assembleias'] },
  { badge: '🏘 Associação produtiva', titulo: 'Grupos e associações', itens: ['Associações que exploram atividade agropecuária', 'Beneficiamento e industrialização comunitária', 'Representação pelo presidente ou diretoria eleita'] },
  { badge: '🏢 Pessoa jurídica', titulo: 'Empresas e entidades', itens: ['Admissão excepcional pelo Conselho de Administração', 'Ligação às atividades agropecuárias da região', 'Representação por pessoa natural designada'] },
]

const DOCUMENTOS = [
  { icone: '🪪', titulo: 'Documento de identidade', texto: 'RG ou CNH válidos. Para pessoa jurídica, contrato social e documentos dos representantes legais.' },
  { icone: '📋', titulo: 'CPF / CNPJ', texto: 'CPF do titular ou CNPJ da associação/empresa.' },
  { icone: '📍', titulo: 'Comprovante de residência', texto: 'Conta de água, luz ou correspondência em nome do requerente com endereço atualizado.' },
  { icone: '🌾', titulo: 'Comprovante da atividade rural', texto: 'Nota fiscal de venda, declaração do sindicato rural ou outro documento equivalente.' },
  { icone: '💰', titulo: 'Quota-parte inicial', texto: 'Subscrição mínima conforme deliberação do Conselho de Administração.' },
  { icone: '🤝', titulo: 'Cooperado proponente', texto: 'A proposta de adesão deve ser assinada por você e por um cooperado já filiado.' },
]

export default async function CooperadoPage({ params }: { params: Promise<{ slug: string }> }) {
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
          <div className="inline-block text-xs font-bold uppercase tracking-widest bg-white/15 rounded-full px-4 py-1.5 mb-4">🌿 Cooperativismo de verdade</div>
          <h1 className="text-3xl md:text-4xl font-black mb-4">Seja um Cooperado {tema.nomeExibicao}</h1>
          <p className="text-white/85">
            Junte-se à cooperativa e tenha acesso a assistência técnica, produção com qualidade e renda
            sustentável — com voz e voto nas decisões.
          </p>
        </div>
      </section>

      <Section>
        <SecTag tema={tema}>Como se associar</SecTag>
        <SecTitle>4 passos para ser cooperado</SecTitle>
        <SecSub>O processo é simples, transparente e pensado para facilitar o acesso de qualquer produtor rural da região.</SecSub>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {PASSOS.map((p) => (
            <div key={p.n} className="bg-white rounded-xl border border-gray-200 p-5">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold mb-3"
                style={{ backgroundColor: tema.corSecundaria }}
              >
                {p.n}
              </div>
              <h3 className="font-bold text-sm mb-1.5 text-gray-800">{p.titulo}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{p.texto}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section className="bg-gray-50">
        <SecTag tema={tema}>Perfis de cooperado</SecTag>
        <SecTitle>Quem pode ingressar</SecTitle>
        <SecSub>A cooperativa é aberta a diferentes perfis de produtores e entidades ligadas à agropecuária da região.</SecSub>
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-5">
          {TIPOS.map((t) => (
            <div key={t.titulo} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: tema.corPrimaria }}>{t.badge}</div>
              <h3 className="font-bold text-sm mb-2 text-gray-800">{t.titulo}</h3>
              <ul className="text-xs text-gray-500 space-y-1.5 list-disc list-inside">
                {t.itens.map((i) => <li key={i}>{i}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      {/* FORMULÁRIO */}
      <Section id="formulario">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          <div>
            <SecTag tema={tema}>Formulário de interesse</SecTag>
            <SecTitle>Manifeste seu interesse</SecTitle>
            <SecSub>
              Preencha o formulário ao lado e nossa equipe entrará em contato em até 2 dias úteis para
              orientar os próximos passos da sua adesão.
            </SecSub>
            <div className="mt-6 rounded-2xl p-6 text-white" style={{ backgroundColor: tema.corEscura }}>
              <h4 className="font-bold mb-2">Por que ser cooperado?</h4>
              <p className="text-sm text-white/70 mb-4">Na cooperativa, você não é cliente — é dono. Cada decisão é tomada em conjunto, cada resultado é compartilhado.</p>
              {org.telefone && <p className="text-sm text-white/80">📞 {org.telefone}</p>}
              {org.email && <p className="text-sm text-white/80">✉ {org.email}</p>}
            </div>
          </div>
          <FormularioInteresse slug={slug} tema={tema} />
        </div>
      </Section>

      <Section className="bg-gray-50">
        <SecTag tema={tema}>Documentação</SecTag>
        <SecTitle>O que você precisará apresentar</SecTitle>
        <SecSub>Documentos básicos para formalizar sua adesão.</SecSub>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {DOCUMENTOS.map((d) => (
            <div key={d.titulo} className="bg-white rounded-xl border border-gray-200 p-5 flex gap-3">
              <span className="text-xl">{d.icone}</span>
              <div>
                <h4 className="font-bold text-sm text-gray-800 mb-1">{d.titulo}</h4>
                <p className="text-xs text-gray-500 leading-relaxed">{d.texto}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </>
  )
}
