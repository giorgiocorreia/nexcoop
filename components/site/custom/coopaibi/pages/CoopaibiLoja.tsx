import { buscarProdutosLojaVitrine, type ProdutoVitrine } from '@/lib/site/queries'
import { formatarBRL } from '@/lib/site/site-utils'
import { CoopaibiTopbarNav, CoopaibiFooterMini, CoopaibiWhatsappFloat } from '../CoopaibiChrome'
import CoopaibiInteractions from '../CoopaibiInteractions'

// Loja fiel ao layout/CSS de loja.php (assets/loja.css), mas com produtos
// vivos do NexCoop (loja_produtos via buscarProdutosLojaVitrine) em vez do
// MySQL próprio do site antigo. Categorias antigas (tabela `categorias` do
// PHP) não existem no schema do NexCoop — sidebar de categorias fica
// derivada do campo `categoria` (texto livre) do próprio produto.
export default async function CoopaibiLoja({ orgId }: { orgId: string }) {
  const produtos = await buscarProdutosLojaVitrine(orgId)
  const categorias = Array.from(new Set(produtos.map((p) => p.categoria).filter((c): c is string => !!c)))

  return (
    <>
      <link rel="stylesheet" href="/sites/coopaibi/css/style.css" />
      <link rel="stylesheet" href="/sites/coopaibi/css/loja.css" />

      <CoopaibiTopbarNav active="loja" />

      <section className="loja-hero">
        <div className="container loja-hero-inner">
          <div>
            <div className="loja-pill">🛒 Loja COOPAIBI</div>
            <h1>Produtos agropecuários para o <em>produtor rural</em></h1>
            <p>Insumos, sementes, ferramentas e equipamentos com o preço justo da cooperativa.</p>
          </div>
        </div>
      </section>

      <section className="section" id="catalogo">
        <div className="container">
          <div className="loja-layout">
            <aside className="loja-sidebar">
              <div className="loja-sidebar-title">Categorias</div>
              <span className="loja-cat-link ativo">Todos os produtos</span>
              {categorias.map((cat) => (
                <span key={cat} className="loja-cat-link">{cat}</span>
              ))}
            </aside>

            <div className="loja-main">
              {produtos.length > 0 ? (
                <div className="prod-grid">
                  {produtos.map((p) => (
                    <ProdCard key={p.id} p={p} />
                  ))}
                </div>
              ) : (
                <div className="loja-vazio">
                  <div style={{ fontSize: 48, marginBottom: 14 }}>🔍</div>
                  <h3>Nenhum produto cadastrado ainda</h3>
                  <p>A loja está sendo estruturada — volte em breve.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="cta-faixa">
        <div className="container cta-faixa-inner">
          <div>
            <h2>É cooperado COOPAIBI?</h2>
            <p>Cooperados têm condições especiais de preço e prazo de pagamento.</p>
          </div>
          <a href="/coopaibi/cooperado" className="btn-primary">Quero ser cooperado →</a>
        </div>
      </div>

      <CoopaibiFooterMini
        colTitulo="Loja"
        colLinks={categorias.length > 0 ? categorias.map((c) => ({ href: '/coopaibi/loja', label: c })) : [{ href: '/coopaibi/loja', label: 'Ver catálogo' }]}
      />
      <CoopaibiWhatsappFloat />
      <CoopaibiInteractions page="loja" slug="coopaibi" />
    </>
  )
}

function ProdCard({ p }: { p: ProdutoVitrine }) {
  const precoCooperado = p.desconto_cooperado && p.desconto_cooperado_pct
    ? p.preco_normal * (1 - p.desconto_cooperado_pct / 100)
    : null

  return (
    <div className="prod-card">
      <div className="prod-card-img">
        <div className="prod-card-sem-foto">🌱</div>
      </div>
      <div className="prod-card-body">
        <div className="prod-card-cat">{p.categoria ?? ''}</div>
        <h3 className="prod-card-nome">{p.nome}</h3>
        <div className="prod-card-footer">
          <span className="prod-preco">{formatarBRL(p.preco_normal)} <span style={{ fontWeight: 400, fontSize: 11 }}>/{p.unidade}</span></span>
          {precoCooperado && (
            <span className="prod-consulte" style={{ display: 'block', marginTop: 4 }}>
              Cooperado: {formatarBRL(precoCooperado)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
