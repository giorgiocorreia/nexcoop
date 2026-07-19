import { buscarCotacoesVitrine } from '@/lib/site/queries'
import { formatarBRL, formatarDataCurta, type SiteTema } from '@/lib/site/site-utils'
import { SecTag, SecTitle, SecSub, Section } from './SiteUi'

// Cotação do dia — o diferencial "dado vivo" do módulo Site (ver
// docs/PLANO_MODULO_SITE.md). Cacheado via revalidate no page.tsx que
// importa este componente (fetch acontece no server component pai).
export default async function CotacaoWidget({ orgId, tema }: { orgId: string; tema: SiteTema }) {
  const cotacoes = await buscarCotacoesVitrine(orgId)
  if (cotacoes.length === 0) return null

  return (
    <Section className="bg-gray-50">
      <SecTag tema={tema}>Cotação do dia</SecTag>
      <SecTitle>Preço atualizado direto da cooperativa</SecTitle>
      <SecSub>Valores praticados hoje, vindos direto do sistema de gestão — sem intermediário.</SecSub>
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cotacoes.map((c) => (
          <div key={c.produto_id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="text-xs uppercase tracking-wide text-gray-500 font-bold mb-1">{c.produto_nome}</div>
            <div className="text-2xl font-black" style={{ color: tema.corPrimaria }}>
              {formatarBRL(c.preco_cooperado)}
              <span className="text-sm font-medium text-gray-400"> /{c.unidade}</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Preço cooperado · externo {formatarBRL(c.preco_externo)}
            </div>
            <div className="text-[11px] text-gray-400 mt-2">
              Vigente desde {formatarDataCurta(c.vigente_a_partir_de)}
            </div>
          </div>
        ))}
      </div>
    </Section>
  )
}
