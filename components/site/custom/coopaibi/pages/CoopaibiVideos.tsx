import { buscarConteudosPorTipo } from '@/lib/site/queries'
import { CoopaibiRibbon, CoopaibiTopbarNav, CoopaibiFooterMini, CoopaibiWhatsappFloat } from '../CoopaibiChrome'
import CoopaibiInteractions from '../CoopaibiInteractions'

// Vídeos fiel ao layout de videos.php (mesmo CSS embutido do original —
// aqui reproduzido via <style jsx global> equivalente inline), lendo
// site_conteudos tipo='video' (hoje vazio — estado vazio elegante, como
// pedido na tarefa) em vez da tabela `videos` do MySQL antigo.
export default async function CoopaibiVideos({ orgId }: { orgId: string }) {
  const videos = await buscarConteudosPorTipo(orgId, 'video')

  return (
    <>
      <link rel="stylesheet" href="/sites/coopaibi/css/style.css" />
      <style>{VIDEOS_CSS}</style>

      <CoopaibiRibbon texto="🌿 COOPAIBI — Cooperativa Mista Agropecuária de Ibirataia | Projeto Cacau que Refloresta" />
      <CoopaibiTopbarNav active="videos" />

      <section className="videos-hero">
        <div className="container">
          <div className="sec-tag" style={{ color: '#b0f070' }}>🎬 Galeria de Vídeos</div>
          <h1>Vídeos da <em>COOPAIBI</em></h1>
          <p>Palestras, eventos, capacitações e novidades da cooperativa e do cacau do sul da Bahia.</p>
        </div>
      </section>

      <section className="section" id="videos">
        <div className="container">
          <div className="sec-tag">🎬 Todos os vídeos</div>
          <h2 className="sec-title" style={{ marginBottom: 24 }}>Biblioteca de <em>vídeos</em></h2>

          {videos.length > 0 ? (
            <div className="videos-grid">
              {videos.map((v) => (
                <div className="video-card" key={v.id}>
                  <div className="video-thumb">
                    {v.imagem_url ? (
                      <img src={v.imagem_url} alt={v.titulo} loading="lazy" />
                    ) : (
                      <div className="video-play">▶</div>
                    )}
                  </div>
                  <div className="video-body">
                    <div className="video-titulo">{v.titulo}</div>
                    {v.descricao && <div className="video-desc">{v.descricao}</div>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="videos-vazio">
              <div style={{ fontSize: 48, marginBottom: 14 }}>🎬</div>
              <h3>Nenhum vídeo publicado ainda</h3>
              <p>A galeria de vídeos da COOPAIBI está sendo preparada — volte em breve.</p>
            </div>
          )}
        </div>
      </section>

      <CoopaibiFooterMini colTitulo="Vídeos" colLinks={[{ href: '/coopaibi/videos', label: 'Ver galeria' }]} />
      <CoopaibiWhatsappFloat />
      <CoopaibiInteractions page="videos" slug="coopaibi" />
    </>
  )
}

// CSS embutido de videos.php (o original também tinha <style> inline em
// vez de arquivo próprio em assets/) — copiado 1:1, só removida a seção de
// .modal-overlay/.destaque-grid não usadas nesta versão sem player/destaques.
const VIDEOS_CSS = `
.videos-hero { background: linear-gradient(135deg, #0f2a0f, #1a5c1a); padding: 52px 0; }
.videos-hero h1 { font-size: 30px; font-weight: 900; color: #fff; margin-bottom: 8px; font-family: 'Montserrat', sans-serif; }
.videos-hero h1 em { color: var(--glt); font-style: normal; }
.videos-hero p { font-size: 14px; color: rgba(255,255,255,.72); }
.video-card { background: #fff; border: 1px solid var(--border); border-radius: 14px; overflow: hidden; transition: all .2s; }
.video-card:hover { box-shadow: 0 6px 24px rgba(26,92,26,.12); transform: translateY(-2px); }
.video-thumb { position: relative; padding-bottom: 56.25%; background: #000; overflow: hidden; cursor: pointer; }
.video-thumb img { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; transition: transform .3s; }
.video-card:hover .video-thumb img { transform: scale(1.04); }
.video-play { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); width: 56px; height: 56px; background: rgba(255,255,255,.92); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 22px; box-shadow: 0 4px 16px rgba(0,0,0,.3); }
.video-body { padding: 16px; }
.video-titulo { font-size: 14px; font-weight: 700; color: var(--text); font-family: 'Montserrat', sans-serif; line-height: 1.4; margin-bottom: 6px; }
.video-desc { font-size: 12px; color: var(--muted); line-height: 1.5; }
.videos-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
.videos-vazio { text-align: center; padding: 60px 24px; color: var(--muted); }
.videos-vazio h3 { font-size: 18px; font-weight: 700; margin-bottom: 8px; font-family: 'Montserrat', sans-serif; }
@media (max-width: 900px) { .videos-grid { grid-template-columns: 1fr 1fr; } }
@media (max-width: 560px) { .videos-grid { grid-template-columns: 1fr; } }
`
