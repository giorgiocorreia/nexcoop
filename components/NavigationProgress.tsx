'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

/**
 * Feedback de navegação client-side:
 * 1) barra no topo
 * 2) shell de página (header + skeleton) cobrindo a área de conteúdo
 *
 * O loading.tsx do App Router às vezes não pinta a tempo — o RSC desmonta a
 * página antiga e fica um flash em branco. Este overlay client cobre esse gap
 * no clique, antes de qualquer round-trip.
 */
export default function NavigationProgress() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [active, setActive] = useState(false)
  const [width, setWidth] = useState(0)
  const [fading, setFading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startedAt = useRef(0)
  const isFirstPath = useRef(true)

  function clearTimers() {
    if (timerRef.current) clearInterval(timerRef.current)
    if (hideRef.current) clearTimeout(hideRef.current)
    timerRef.current = null
    hideRef.current = null
  }

  function start() {
    clearTimers()
    startedAt.current = Date.now()
    setFading(false)
    setActive(true)
    setWidth(14)
    timerRef.current = setInterval(() => {
      setWidth(w => (w >= 90 ? w : w + Math.max(0.5, (92 - w) * 0.07)))
    }, 100)
  }

  function finish() {
    // No mount inicial não “termina” uma nav que não começou
    if (isFirstPath.current) {
      isFirstPath.current = false
      return
    }
    clearTimers()
    setWidth(100)

    // Mantém o shell no mínimo ~180ms e espera 2 frames pro conteúdo pintar
    const elapsed = Date.now() - (startedAt.current || Date.now())
    const minHold = Math.max(0, 180 - elapsed)

    hideRef.current = setTimeout(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setFading(true)
          hideRef.current = setTimeout(() => {
            setActive(false)
            setFading(false)
            setWidth(0)
          }, 160)
        })
      })
    }, minHold)
  }

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const el = (e.target as HTMLElement | null)?.closest?.('a')
      if (!el) return
      const href = el.getAttribute('href')
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return
      if (el.getAttribute('target') === '_blank' || el.hasAttribute('download')) return
      try {
        const url = new URL(href, window.location.origin)
        if (url.origin !== window.location.origin) return
        const next = url.pathname + url.search
        const cur = window.location.pathname + window.location.search
        if (next === cur) return
        // Só rotas do sistema (menu) — evita overlay na landing/login
        if (
          url.pathname === '/' ||
          url.pathname.startsWith('/login') ||
          url.pathname.startsWith('/assinar') ||
          url.pathname.startsWith('/onboarding')
        ) return
        start()
      } catch {
        /* ignore */
      }
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [])

  useEffect(() => {
    finish()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams])

  if (!active) return null

  return (
    <>
      {/* Barra superior */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0,
          height: 3,
          zIndex: 9999,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${width}%`,
            background: 'linear-gradient(90deg, #81C784, #FFF59D, #FFFFFF)',
            boxShadow: '0 0 8px rgba(255,255,255,0.45)',
            transition: width >= 100 ? 'width 0.12s ease-out' : 'width 0.12s linear',
            borderRadius: '0 2px 2px 0',
          }}
        />
      </div>

      {/* Shell da página — cobre o “branco” enquanto o RSC chega */}
      <div
        role="status"
        aria-live="polite"
        aria-label="Carregando página"
        className="nxc-nav-shell"
        style={{
          position: 'fixed',
          inset: 0,
          // Abaixo da sidebar (100/200) e do hamburger (201); acima do conteúdo
          zIndex: 90,
          pointerEvents: 'none',
          opacity: fading ? 0 : 1,
          transition: 'opacity 0.15s ease',
        }}
      >
        <style>{`
          .nxc-nav-shell-inner {
            height: 100%;
            margin-left: 0;
            background: #D2D8D0;
            display: flex;
            flex-direction: column;
            font-family: system-ui, -apple-system, sans-serif;
          }
          /* Desktop: recua pela sidebar expandida; colapsada ainda deixa uma faixa ok */
          @media (min-width: 768px) {
            .nxc-nav-shell-inner { margin-left: 240px; }
            .nxc-nav-shell-inner.nxc-nav-shell--collapsed { margin-left: 56px; }
          }
          @keyframes nxc-nav-shimmer {
            0% { background-position: -420px 0; }
            100% { background-position: 420px 0; }
          }
          .nxc-nav-skel {
            background: linear-gradient(90deg, #C5CEC4 0%, #E8EDE7 45%, #C5CEC4 90%);
            background-size: 840px 100%;
            animation: nxc-nav-shimmer 1.1s ease-in-out infinite;
            border-radius: 12px;
          }
        `}</style>
        <div className={`nxc-nav-shell-inner${typeof window !== 'undefined' && localStorage.getItem('nexcoop_sidebar_collapsed') === 'true' ? ' nxc-nav-shell--collapsed' : ''}`}>
          {/* Faixa HERO */}
          <div
            style={{
              height: 56,
              flexShrink: 0,
              background: 'var(--nxc-marca-bg, linear-gradient(180deg, #2E7D32 0%, #1B5E20 100%))',
              borderBottom: '1px solid rgba(255,255,255,0.15)',
              display: 'flex',
              alignItems: 'center',
              padding: '0 16px 0 56px',
              gap: 12,
            }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'rgba(255,255,255,0.18)', flexShrink: 0,
            }} />
            <div style={{
              height: 14, width: 140, borderRadius: 6,
              background: 'rgba(255,255,255,0.28)',
            }} />
          </div>

          {/* Corpo skeleton */}
          <div style={{ flex: 1, padding: 16, overflow: 'hidden' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 10,
              marginBottom: 16,
            }}>
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="nxc-nav-skel" style={{ height: 72 }} />
              ))}
            </div>
            <div className="nxc-nav-skel" style={{ height: 148, marginBottom: 12 }} />
            <div className="nxc-nav-skel" style={{ height: 110, marginBottom: 12 }} />
            <div className="nxc-nav-skel" style={{ height: 88, maxWidth: 420 }} />
            <p style={{
              marginTop: 18, textAlign: 'center', fontSize: 13,
              color: '#515E53', fontWeight: 500,
            }}>
              Carregando…
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
