'use client'

import { useEffect, useState } from 'react'
import { ToastProvider } from '@/components/ui/Toast'

const SIDEBAR_KEY = 'nexcoop_sidebar_collapsed'

export default function MainContent({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(SIDEBAR_KEY)
    if (saved === 'true') setCollapsed(true)

    function handler(e: Event) {
      const detail = (e as CustomEvent).detail
      setCollapsed(detail.collapsed)
    }
    window.addEventListener('sidebar-toggle', handler)

    function checkMobile() { setIsMobile(window.innerWidth < 768) }
    checkMobile()
    window.addEventListener('resize', checkMobile)

    return () => {
      window.removeEventListener('sidebar-toggle', handler)
      window.removeEventListener('resize', checkMobile)
    }
  }, [])

  return (
    <ToastProvider>
      <style>{`
        .nxc-main { transition: margin-left 0.2s ease; }
        @media (max-width: 767px) { .nxc-main { margin-left: 0 !important; } }
      `}</style>
      {isMobile && (
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('sidebar-mobile-toggle'))}
          style={{
            position: 'fixed', top: 12, left: 12, zIndex: 201,
            width: 36, height: 36, borderRadius: 8,
            background: '#fff', border: '1px solid #e5e3dc',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          <i className="ti ti-menu-2" style={{ fontSize: 18, color: '#444' }} />
        </button>
      )}
      <div
        className="nxc-main"
        style={{
          flex: 1,
          marginLeft: isMobile ? 0 : (collapsed ? '56px' : '240px'),
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
        }}
      >
        {children}
      </div>
    </ToastProvider>
  )
}
