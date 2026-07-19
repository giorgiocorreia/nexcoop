// Nav/topbar/footer fiéis do site original, em JSX de verdade (não
// dangerouslySetInnerHTML) — usados pelas páginas DINÂMICAS (Loja, Vídeos),
// que não vieram da extração automática porque o conteúdo (produtos/vídeos)
// tem que ser gerado a partir do banco, não copiado do HTML estático.
// Markup e classes idênticos aos de assets/style.css (nav.navbar, .topbar
// etc.) — mesmo visual das demais páginas portadas.
export function CoopaibiRibbon({ texto }: { texto: string }) {
  return (
    <div className="ribbon">
      <span>{texto}</span>
    </div>
  )
}

export function CoopaibiTopbarNav({ active }: { active: 'loja' | 'videos' }) {
  const links = [
    { href: '/coopaibi', label: 'Início' },
    { href: '/coopaibi#sobre', label: 'O Projeto' },
    { href: '/coopaibi/acoes', label: 'Ações' },
    { href: '/coopaibi/loja', label: 'Loja', key: 'loja' },
    { href: '/coopaibi/videos', label: 'Vídeos', key: 'videos' },
    { href: '/coopaibi/parceiro', label: 'Seja Parceiro' },
    { href: '/login', label: 'Intranet' },
  ]
  return (
    <>
      <div className="topbar">
        <div className="container">
          <span>📍 Av. Aurelino Coelho Lima, nº 10 — Centro, Ibirataia/BA</span>
          <span>📞 Loja: (73) 9 9976-8420 · Compra de Cacau: (73) 9 9862-9960</span>
          <span>✉ contato@coopaibi.com.br</span>
        </div>
      </div>

      <nav className="navbar">
        <div className="container">
          <a href="/coopaibi" className="nav-brand">
            <img src="/sites/coopaibi/img/logo-coopaibi.jpeg" alt="Logo COOPAIBI" />
            <div className="nav-brand-text">
              <strong>COOPAIBI</strong>
              <span>Cooperativa Mista Agropecuária de Ibirataia</span>
            </div>
          </a>
          <div className="nav-links">
            {links.map((l) => (
              <a key={l.label} href={l.href} className={l.key === active ? 'active' : undefined}>
                {l.label}
              </a>
            ))}
            <a href="/coopaibi/cooperado" className="nav-cta">Seja Cooperado</a>
          </div>
          <button className="nav-toggle" data-coopaibi-toggle-menu aria-label="Menu">☰</button>
        </div>
        <div className="nav-mobile" id="nav-mobile">
          {links.map((l) => (
            <a key={l.label} href={l.href}>{l.label}</a>
          ))}
          <a href="/coopaibi/cooperado" className="nav-cta">Seja Cooperado</a>
        </div>
      </nav>
    </>
  )
}

export function CoopaibiFooterMini({ colTitulo, colLinks }: { colTitulo: string; colLinks: { href: string; label: string }[] }) {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <img src="/sites/coopaibi/img/logo-coopaibi.jpeg" alt="COOPAIBI" />
            <p>Cooperativa Mista Agropecuária de Ibirataia — produtos agropecuários com o preço justo da cooperativa.</p>
            <div className="social-row" style={{ marginTop: 16 }}>
              <a href="https://instagram.com/coopaibi.agro" className="social-btn" target="_blank" rel="noopener" aria-label="Instagram">in</a>
              <a href="https://wa.me/5571999783992" className="social-btn" target="_blank" rel="noopener" aria-label="WhatsApp">w</a>
            </div>
          </div>
          <div className="footer-col">
            <h4>{colTitulo}</h4>
            <ul>
              {colLinks.map((l) => (
                <li key={l.label}><a href={l.href}>{l.label}</a></li>
              ))}
            </ul>
          </div>
          <div className="footer-col">
            <h4>Cooperativa</h4>
            <ul>
              <li><a href="/coopaibi">Página Inicial</a></li>
              <li><a href="/coopaibi/parceiro">Seja Parceiro</a></li>
              <li><a href="/coopaibi/cooperado">Seja Cooperado</a></li>
              <li><a href="/coopaibi/acoes">Ações</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Contato</h4>
            <p>
              Av. Aurelino Coelho Lima, nº 10<br />
              Centro — Ibirataia/BA<br />
              CEP: 45.580-000<br /><br />
              <a href="tel:5573999768420" style={{ color: 'rgba(255,255,255,.75)' }}>📞 Loja: (73) 9 9976-8420</a><br />
              <a href="tel:5573998629960" style={{ color: 'rgba(255,255,255,.75)' }}>📞 Compra de Cacau: (73) 9 9862-9960</a><br />
              <a href="mailto:contato@coopaibi.com.br" style={{ color: 'var(--glt)' }}>contato@coopaibi.com.br</a>
            </p>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2026 <span>COOPAIBI</span> — Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  )
}

export function CoopaibiWhatsappFloat() {
  return (
    <a
      href="https://wa.me/5571999783992?text=Ol%C3%A1!%20Vim%20pelo%20site%20da%20COOPAIBI%20e%20gostaria%20de%20mais%20informa%C3%A7%C3%B5es."
      className="whatsapp-float"
      target="_blank"
      rel="noopener"
      aria-label="Fale conosco pelo WhatsApp"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="28" height="28">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.122 1.528 5.855L.057 23.885c-.066.254.166.486.42.42l6.03-1.471A11.94 11.94 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.9a9.877 9.877 0 0 1-5.031-1.378l-.36-.214-3.735.979.995-3.638-.235-.374A9.86 9.86 0 0 1 2.1 12c0-5.468 4.432-9.9 9.9-9.9 5.467 0 9.9 4.432 9.9 9.9 0 5.467-4.433 9.9-9.9 9.9z" />
      </svg>
      <span className="whatsapp-tooltip">Fale conosco</span>
    </a>
  )
}
