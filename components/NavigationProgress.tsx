'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

/**
 * Barra fina no topo durante navegação client-side.
 * Dá feedback imediato no clique do menu (antes do RSC da página chegar).
 */
export default function NavigationProgress() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [visible, setVisible] = useState(false)
  const [width, setWidth] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function clearTimers() {
    if (timerRef.current) clearInterval(timerRef.current)
    if (hideRef.current) clearTimeout(hideRef.current)
    timerRef.current = null
    hideRef.current = null
  }

  function start() {
    clearTimers()
    setVisible(true)
    setWidth(12)
    timerRef.current = setInterval(() => {
      setWidth(w => {
        if (w >= 88) return w
        // Avanço desacelerando (sensação de progresso real)
        return w + Math.max(0.6, (90 - w) * 0.08)
      })
    }, 120)
  }

  function finish() {
    clearTimers()
    setWidth(100)
    hideRef.current = setTimeout(() => {
      setVisible(false)
      setWidth(0)
    }, 220)
  }

  // Clique em <a> interno → começa progresso na hora
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
        start()
      } catch {
        /* ignore */
      }
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [])

  // Pathname/search mudou → navegação concluída
  useEffect(() => {
    finish()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams])

  if (!visible) return null

  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        zIndex: 9999,
        pointerEvents: 'none',
        background: 'transparent',
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${width}%`,
          background: 'linear-gradient(90deg, #81C784, #FFF59D, #FFFFFF)',
          boxShadow: '0 0 8px rgba(255,255,255,0.45)',
          transition: width >= 100 ? 'width 0.15s ease-out, opacity 0.2s' : 'width 0.15s linear',
          opacity: width >= 100 ? 0 : 1,
          borderRadius: '0 2px 2px 0',
        }}
      />
    </div>
  )
}
