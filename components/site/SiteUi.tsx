import type { SiteTema } from '@/lib/site/site-utils'

// Peças reutilizáveis do template do site público — equivalentes ao
// .sec-tag/.sec-title/.btn-primary do CSS do site antigo da COOPAIBI,
// porém como componentes React com Tailwind (sem CSS novo).

export function SecTag({ children, tema }: { children: React.ReactNode; tema: SiteTema }) {
  return (
    <span
      className="inline-block text-[11px] font-bold uppercase tracking-widest px-3.5 py-1 rounded-full mb-3"
      style={{ backgroundColor: tema.corClara, color: tema.corPrimaria }}
    >
      {children}
    </span>
  )
}

export function SecTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-2xl md:text-[33px] font-black text-gray-900 mb-2.5 leading-tight">{children}</h2>
}

export function SecSub({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-gray-500 leading-relaxed max-w-xl">{children}</p>
}

export function BtnPrimary({
  href,
  children,
  tema,
}: {
  href: string
  children: React.ReactNode
  tema: SiteTema
}) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-extrabold transition-transform hover:-translate-y-0.5"
      style={{ backgroundColor: tema.corDestaque, color: tema.corEscura }}
    >
      {children}
    </a>
  )
}

export function BtnOutline({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-bold text-white border-2 border-white/55 hover:border-white hover:bg-white/10 transition-colors"
    >
      {children}
    </a>
  )
}

export function Section({
  children,
  className = '',
  id,
}: {
  children: React.ReactNode
  className?: string
  id?: string
}) {
  return (
    <section id={id} className={`py-16 md:py-20 ${className}`}>
      <div className="max-w-6xl mx-auto px-6">{children}</div>
    </section>
  )
}

// Banner discreto de pré-visualização — site_config.publicado=false ainda
// mostra o site (o Giorgio valida antes de publicar), mas com este aviso.
export function PreviewBanner() {
  return (
    <div className="bg-amber-400 text-amber-950 text-xs font-bold text-center py-1.5 sticky top-0 z-50">
      Pré-visualização — este site ainda não foi publicado
    </div>
  )
}

export function WhatsappFloat({ numero, mensagem }: { numero: string; mensagem: string }) {
  const href = `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Fale conosco pelo WhatsApp"
      className="fixed bottom-7 right-7 w-14 h-14 rounded-full bg-[#25d366] hover:bg-[#1ebe5a] shadow-lg flex items-center justify-center z-50 transition-colors"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width={26} height={26}>
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.122 1.528 5.855L.057 23.885c-.066.254.166.486.42.42l6.03-1.471A11.94 11.94 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.9a9.877 9.877 0 0 1-5.031-1.378l-.36-.214-3.735.979.995-3.638-.235-.374A9.86 9.86 0 0 1 2.1 12c0-5.468 4.432-9.9 9.9-9.9 5.467 0 9.9 4.432 9.9 9.9 0 5.467-4.433 9.9-9.9 9.9z" />
      </svg>
    </a>
  )
}
