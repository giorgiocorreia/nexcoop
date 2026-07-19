import { buscarConteudosPorTipo } from '@/lib/site/queries'
import { formatarDataCurta, type SiteTema } from '@/lib/site/site-utils'
import { SecTag, SecTitle, SecSub, Section } from './SiteUi'
import type { SiteConteudo } from '@/types/database'

const TITULOS: Record<SiteConteudo['tipo'], string> = {
  evento:   'Próximos eventos',
  video:    'Vídeos',
  promocao: 'Promoções',
  noticia:  'Notícias',
  pagina:   'Conteúdo',
}

// Eventos/vídeos/promoções/notícias — hoje vazios pra toda org (nenhum
// painel de cadastro ainda), então a seção só aparece quando existir algum
// item ativo (regra do plano: "renderizar seção só se houver itens").
export default async function ConteudosWidget({
  orgId,
  tipo,
  tema,
  className = '',
}: {
  orgId: string
  tipo: SiteConteudo['tipo']
  tema: SiteTema
  className?: string
}) {
  const itens = await buscarConteudosPorTipo(orgId, tipo)
  if (itens.length === 0) return null

  return (
    <Section className={className}>
      <SecTag tema={tema}>{TITULOS[tipo]}</SecTag>
      <SecTitle>{TITULOS[tipo]}</SecTitle>
      <SecSub>Atualizações publicadas pela cooperativa.</SecSub>
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {itens.map((item) => (
          <a
            key={item.id}
            href={item.url_externa ?? '#'}
            target={item.url_externa ? '_blank' : undefined}
            rel={item.url_externa ? 'noopener noreferrer' : undefined}
            className="block bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
          >
            {item.imagem_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.imagem_url} alt={item.titulo} className="w-full h-36 object-cover" />
            )}
            <div className="p-4">
              {item.data_evento && (
                <div className="text-[11px] font-bold text-gray-400 mb-1">{formatarDataCurta(item.data_evento)}</div>
              )}
              <h4 className="font-bold text-sm text-gray-800 mb-1.5">{item.titulo}</h4>
              {item.descricao && <p className="text-xs text-gray-500 leading-relaxed">{item.descricao}</p>}
            </div>
          </a>
        ))}
      </div>
    </Section>
  )
}
