'use client'

import { useEffect, useState } from 'react'
import { ToastProvider } from '@/components/ui/Toast'

const SIDEBAR_KEY = 'nexcoop_sidebar_collapsed'

export default function MainContent({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(SIDEBAR_KEY)
    if (saved === 'true') setCollapsed(true)

    function handler(e: Event) {
      const detail = (e as CustomEvent).detail
      setCollapsed(detail.collapsed)
    }
    window.addEventListener('sidebar-toggle', handler)

    function checkMobile() {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (!mobile) setMenuOpen(false)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)

    function handleMobileState(e: Event) {
      const open = (e as CustomEvent<{ open: boolean }>).detail?.open
      if (typeof open === 'boolean') setMenuOpen(open)
    }
    window.addEventListener('sidebar-mobile-state', handleMobileState)

    return () => {
      window.removeEventListener('sidebar-toggle', handler)
      window.removeEventListener('resize', checkMobile)
      window.removeEventListener('sidebar-mobile-state', handleMobileState)
    }
  }, [])

  return (
    <ToastProvider>
      <style>{`
        .nxc-main { transition: margin-left 0.2s ease; min-width: 0; max-width: 100%; }
        @media (max-width: 767px) { .nxc-main { margin-left: 0 !important; } }

        /* Hamburger integrado à faixa HERO (chip translúcido, ícone branco) */
        .nxc-menu-btn {
          position: fixed; top: 8px; left: 8px; z-index: 201;
          width: 44px; height: 44px; border-radius: 10px;
          background: rgba(255,255,255,0.18);
          border: 1px solid rgba(255,255,255,0.28);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          box-shadow: 0 2px 10px rgba(0,0,0,0.12);
          backdrop-filter: blur(6px);
          -webkit-tap-highlight-color: transparent;
          transition: background 0.15s, border-color 0.15s;
        }
        .nxc-menu-btn:hover { background: rgba(255,255,255,0.28); }
        .nxc-menu-btn:active { background: rgba(255,255,255,0.35); }
        .nxc-menu-btn i { font-size: 22px; color: #fff; line-height: 1; }

        /* Banners de sistema (impersonation, senha, parceiro) */
        .nxc-sys-banner {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; padding: 10px 24px;
          position: sticky; top: 0; z-index: 50;
        }
        .nxc-sys-banner__text { font-size: 13px; font-weight: 500; min-width: 0; }
        .nxc-sys-banner__action { flex-shrink: 0; }
        @media (max-width: 767px) {
          .nxc-sys-banner {
            flex-direction: column; align-items: stretch;
            padding: 10px 16px 10px 56px;
          }
          .nxc-sys-banner__action { align-self: flex-start; }
        }

        /* Inputs 16px no mobile — evita zoom forçado no iOS */
        @media (max-width: 767px) {
          input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"]),
          select, textarea {
            font-size: 16px !important;
          }
        }
      `}</style>
      {isMobile && (
        <button
          type="button"
          className="nxc-menu-btn"
          onClick={() => window.dispatchEvent(new CustomEvent('sidebar-mobile-toggle'))}
          aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={menuOpen}
        >
          <i className={`ti ${menuOpen ? 'ti-x' : 'ti-menu-2'}`} aria-hidden />
        </button>
      )}
      <div
        className="nxc-main"
        style={{
          flex: 1,
          minWidth: 0,
          maxWidth: '100%',
          width: '100%',
          marginLeft: isMobile ? 0 : (collapsed ? '56px' : '240px'),
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          overflowX: 'clip',
        }}
      >
        {children}
      </div>
    </ToastProvider>
  )
}
