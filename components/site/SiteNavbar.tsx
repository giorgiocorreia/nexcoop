import Link from 'next/link'
import Image from 'next/image'
import type { SiteTema } from '@/lib/site/site-utils'

// Navbar do site público de uma org — replica o padrão do site atual da
// COOPAIBI (topbar de contato + navbar com CTA "Seja Cooperado"), mas
// genérica o bastante pra qualquer org via `tema`/`slug`.
export default function SiteNavbar({
  slug,
  tema,
  telefone,
  email,
}: {
  slug: string
  tema: SiteTema
  telefone?: string | null
  email?: string | null
}) {
  const base = `/${slug}`
  const links = [
    { href: base, label: 'Início' },
    { href: `${base}/acoes`, label: 'Ações' },
    { href: `${base}/cooperado`, label: 'Seja Cooperado' },
    { href: `${base}/parceiro`, label: 'Seja Parceiro' },
  ]

  return (
    <div>
      {(telefone || email) && (
        <div className="text-white text-xs py-1.5" style={{ backgroundColor: tema.corEscura }}>
          <div className="max-w-6xl mx-auto px-6 flex flex-wrap items-center justify-center gap-6">
            {telefone && <span>📞 {telefone}</span>}
            {email && <span>✉ {email}</span>}
          </div>
        </div>
      )}
      <nav
        className="bg-white sticky top-0 z-40 shadow-sm"
        style={{ borderBottom: `3px solid ${tema.corSecundaria}` }}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <Link href={base} className="flex items-center gap-2.5 shrink-0">
            <Image
              src={tema.logoUrl}
              alt={`Logo ${tema.nomeExibicao}`}
              width={38}
              height={38}
              className="rounded-sm object-contain"
            />
            <div className="leading-tight">
              <strong className="block text-sm font-black" style={{ color: tema.corPrimaria }}>
                {tema.nomeExibicao}
              </strong>
              {tema.nomeCurto && (
                <span className="block text-[9px] uppercase tracking-wide text-gray-500">
                  {tema.nomeCurto}
                </span>
              )}
            </div>
          </Link>
          <div className="hidden md:flex items-center gap-1 flex-wrap">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide rounded-md text-gray-700 hover:bg-black/5 transition-colors"
                style={{ color: tema.corPrimaria }}
              >
                {l.label}
              </Link>
            ))}
            <a
              href="https://nexcoop.com.br/login"
              className="ml-2 px-4 py-1.5 rounded-full text-[11px] font-bold uppercase text-white"
              style={{ backgroundColor: tema.corSecundaria }}
            >
              Área do Cooperado
            </a>
          </div>
        </div>
        {/* Navegação mobile simplificada — sem JS de toggle pra manter o
            template livre de dependências novas; os links já ficam visíveis
            em telas pequenas dentro de uma barra rolável. */}
        <div className="md:hidden flex gap-3 overflow-x-auto px-4 pb-2 text-xs font-semibold" style={{ color: tema.corPrimaria }}>
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="whitespace-nowrap py-1">
              {l.label}
            </Link>
          ))}
          <a href="https://nexcoop.com.br/login" className="whitespace-nowrap py-1 font-bold" style={{ color: tema.corSecundaria }}>
            Área do Cooperado
          </a>
        </div>
      </nav>
    </div>
  )
}
