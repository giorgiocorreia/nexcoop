import { buscarProdutosLojaVitrine } from '@/lib/site/queries'
import { formatarBRL, type SiteTema } from '@/lib/site/site-utils'
import { SecTag, SecTitle, SecSub, Section } from './SiteUi'

// Vitrine da Loja — substitui o loja.php do site antigo (que lia de um
// MySQL próprio com cadastro duplicado do produto). Aqui lê direto de
// loja_produtos, então o produto passa a ser mantido só no NexCoop.
export default async function ProdutosWidget({ orgId, tema }: { orgId: string; tema: SiteTema }) {
  const produtos = await buscarProdutosLojaVitrine(orgId)
  if (produtos.length === 0) return null

  return (
    <Section>
      <SecTag tema={tema}>Loja</SecTag>
      <SecTitle>Produtos da cooperativa</SecTitle>
      <SecSub>Direto do estoque da loja — preço e disponibilidade sempre atualizados.</SecSub>
      <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {produtos.map((p) => (
          <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            {p.categoria && <div className="text-[10px] uppercase tracking-wide text-gray-400 font-bold mb-1">{p.categoria}</div>}
            <div className="text-sm font-bold text-gray-800 mb-1.5 leading-snug">{p.nome}</div>
            <div className="text-lg font-black" style={{ color: tema.corPrimaria }}>
              {formatarBRL(p.preco_normal)}
              <span className="text-xs font-medium text-gray-400"> /{p.unidade}</span>
            </div>
            {p.desconto_cooperado && (
              <div className="text-[11px] mt-1 font-semibold" style={{ color: tema.corSecundaria }}>
                {p.desconto_cooperado_pct ? `${p.desconto_cooperado_pct}% off` : 'Desconto'} pra cooperado
              </div>
            )}
          </div>
        ))}
      </div>
    </Section>
  )
}
