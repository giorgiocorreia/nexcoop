'use client'

import Link from 'next/link'
import { HubStyles } from './HubStyles'
import { COM_C, HERO } from './tokens'

interface ModuloRef {
  label: string
  href: string
}

interface PageLayoutProps {
  titulo: string
  subtitulo?: string
  breadcrumb?: { label: string; href?: string }[]
  icone?: string
  acoes?: React.ReactNode
  children: React.ReactNode
  fullHeight?: boolean
  /** Módulo pai no breadcrumb. Padrão: Comercialização */
  modulo?: ModuloRef
  /** Oculta breadcrumb (ex.: hub principal) */
  semBreadcrumb?: boolean
}

export function PageLayout({
  titulo,
  subtitulo,
  breadcrumb,
  icone = 'ti-plant-2',
  acoes,
  children,
  fullHeight,
  modulo = { label: 'Comercialização', href: '/comercializacao' },
  semBreadcrumb,
}: PageLayoutProps) {
  const crumbs = breadcrumb ?? [{ label: titulo }]

  return (
    <>
      <HubStyles />
      <div style={{
        position: 'sticky', top: 0, zIndex: 10, background: HERO.bg,
        borderBottom: HERO.borda, margin: '0 -2rem 0 -2rem',
      }}>
        <div className="com-page-header" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10, background: HERO.chip, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <i className={`ti ${icone}`} style={{ fontSize: 20, color: HERO.txt }} />
            </div>
            <div style={{ minWidth: 0 }}>
              {!semBreadcrumb && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
                  <Link href={modulo.href} style={{ fontSize: 12, color: HERO.txtSub, textDecoration: 'none' }}>
                    {modulo.label}
                  </Link>
                  {crumbs.filter(c => c.href !== modulo.href && c.label !== modulo.label).map((c, i) => (
                    <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 12, color: HERO.divisor }}>/</span>
                      {c.href ? (
                        <Link href={c.href} style={{ fontSize: 12, color: HERO.txtSub, textDecoration: 'none' }}>{c.label}</Link>
                      ) : (
                        <span style={{ fontSize: 12, color: HERO.txtSub }}>{c.label}</span>
                      )}
                    </span>
                  ))}
                </div>
              )}
              <h1 style={{ fontSize: 19, fontWeight: 800, color: HERO.txt, margin: 0, lineHeight: 1.2 }}>{titulo}</h1>
              {subtitulo && (
                <div style={{ fontSize: 12, color: HERO.txtSub, marginTop: 2 }}>{subtitulo}</div>
              )}
            </div>
          </div>
          {acoes && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {acoes}
            </div>
          )}
        </div>
      </div>
      <div
        className="com-hub-content"
        style={fullHeight ? { minHeight: 'calc(100vh - 88px)' } : undefined}
      >
        {children}
      </div>
    </>
  )
}