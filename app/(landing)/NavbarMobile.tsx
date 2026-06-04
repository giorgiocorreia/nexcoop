'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

export default function NavbarMobile() {
  const [aberto, setAberto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAberto(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth > 768) setAberto(false)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const links = [
    ['#funcionalidades', 'Funcionalidades'],
    ['#planos', 'Planos'],
    ['#demo', 'Demo'],
    ['mailto:suporte@nexcoop.com.br', 'Contato'],
  ]

  return (
    <div ref={ref} className="nav-mobile-wrapper">
      <button
        className="nav-hamburger"
        onClick={() => setAberto(v => !v)}
        aria-label={aberto ? 'Fechar menu' : 'Abrir menu'}
        aria-expanded={aberto}
      >
        {aberto ? (
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
            <line x1="4" y1="4" x2="22" y2="22" stroke="#0D2B5E" strokeWidth="2.5" strokeLinecap="round"/>
            <line x1="22" y1="4" x2="4" y2="22" stroke="#0D2B5E" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        ) : (
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
            <rect y="5"  width="26" height="2.5" rx="1.25" fill="#0D2B5E"/>
            <rect y="12" width="26" height="2.5" rx="1.25" fill="#0D2B5E"/>
            <rect y="19" width="26" height="2.5" rx="1.25" fill="#0D2B5E"/>
          </svg>
        )}
      </button>

      {aberto && (
        <div className="nav-mobile-menu">
          {links.map(([href, label]) => (
            <a
              key={href}
              href={href}
              onClick={() => setAberto(false)}
              style={{ fontSize: 15, fontWeight: 500, color: '#0D2B5E', textDecoration: 'none', padding: '0.7rem 0', borderBottom: '1px solid #F1F5F9', display: 'block' }}
            >
              {label}
            </a>
          ))}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
            <Link href="/login" onClick={() => setAberto(false)} style={{ flex: 1, textAlign: 'center', padding: '10px', border: '1.5px solid #E2EAF4', borderRadius: 8, fontSize: 14, fontWeight: 600, color: '#0D2B5E', textDecoration: 'none' }}>
              Entrar
            </Link>
            <Link href="/cadastro" onClick={() => setAberto(false)} style={{ flex: 1, textAlign: 'center', padding: '10px', borderRadius: 8, fontSize: 14, fontWeight: 600, color: '#fff', background: 'linear-gradient(135deg,#1565C0,#06B6D4)', textDecoration: 'none' }}>
              Grátis
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
