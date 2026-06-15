'use client'

import { useEffect, useState } from 'react'

const SIDEBAR_KEY = 'nexcoop_sidebar_collapsed'

export default function MainContent({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(SIDEBAR_KEY)
    if (saved === 'true') setCollapsed(true)

    function handler(e: Event) {
      const detail = (e as CustomEvent).detail
      setCollapsed(detail.collapsed)
    }
    window.addEventListener('sidebar-toggle', handler)
    return () => window.removeEventListener('sidebar-toggle', handler)
  }, [])

  return (
    <div style={{
      flex: 1,
      marginLeft: collapsed ? '56px' : '240px',
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      transition: 'margin-left 0.2s ease',
    }}>
      {children}
    </div>
  )
}
