'use client'

import { createContext, useContext, useState, useCallback, useRef } from 'react'

export type ToastTipo = 'success' | 'error' | 'warning' | 'info'

interface ToastItem {
  id: number
  tipo: ToastTipo
  mensagem: string
}

interface ToastContextValue {
  toast: (tipo: ToastTipo, mensagem: string) => void
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

const CONFIG: Record<ToastTipo, { cor: string; icone: string; timer: boolean }> = {
  success: { cor: '#1D9E75', icone: 'ti-circle-check',    timer: true  },
  error:   { cor: '#dc2626', icone: 'ti-alert-circle',    timer: false },
  warning: { cor: '#E07B30', icone: 'ti-alert-triangle',  timer: true  },
  info:    { cor: '#378ADD', icone: 'ti-info-circle',     timer: false },
}

const DURATION = 5000

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const counterRef = useRef(0)

  const remove = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = useCallback((tipo: ToastTipo, mensagem: string) => {
    const id = ++counterRef.current
    setToasts(prev => [...prev, { id, tipo, mensagem }])
    if (CONFIG[tipo].timer) {
      setTimeout(() => remove(id), DURATION)
    }
  }, [remove])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div style={{
        position: 'fixed', bottom: 20, right: 20, zIndex: 9999,
        display: 'flex', flexDirection: 'column-reverse', gap: 8,
        pointerEvents: 'none',
      }}>
        {toasts.map(t => (
          <ToastItem key={t.id} item={t} onRemove={remove} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ item, onRemove }: { item: ToastItem; onRemove: (id: number) => void }) {
  const cfg = CONFIG[item.tipo]
  const [segundos, setSegundos] = useState(Math.ceil(DURATION / 1000))
  const [largura, setLargura] = useState(100)

  // Timer visual apenas para tipos com timer
  if (cfg.timer) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const startRef = useRef(Date.now())
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const rafRef = useRef<number | null>(null)

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const tick = useCallback(() => {
      const elapsed = Date.now() - startRef.current
      const remaining = Math.max(0, DURATION - elapsed)
      setSegundos(Math.ceil(remaining / 1000))
      setLargura((remaining / DURATION) * 100)
      if (remaining > 0) rafRef.current = requestAnimationFrame(tick)
    }, [])

    // eslint-disable-next-line react-hooks/rules-of-hooks
    useState(() => {
      rafRef.current = requestAnimationFrame(tick)
      return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
    })
  }

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      background: '#fff', border: `0.5px solid #e5e3dc`,
      borderLeft: `3px solid ${cfg.cor}`,
      borderRadius: 8, padding: '8px 11px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      position: 'relative', overflow: 'hidden',
      pointerEvents: 'all', minWidth: 180, maxWidth: 300,
      animation: 'toastIn 0.2s ease',
    }}>
      <i className={`ti ${cfg.icone}`} style={{ fontSize: 15, color: cfg.cor, flexShrink: 0 }} />
      <span style={{ fontSize: 12, color: '#1a1a2e', flex: 1, lineHeight: 1.3 }}>{item.mensagem}</span>
      {cfg.timer && (
        <span style={{ fontSize: 10, color: '#9ca3af', minWidth: 14, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
          {segundos}s
        </span>
      )}
      <button
        onClick={() => onRemove(item.id)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 0 4px', color: '#9ca3af', display: 'flex', alignItems: 'center' }}
      >
        <i className="ti ti-x" style={{ fontSize: 11 }} />
      </button>
      {cfg.timer && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, height: 2,
          background: cfg.cor, width: `${largura}%`,
          transition: 'width 0.1s linear',
        }} />
      )}
      <style>{`@keyframes toastIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  )
}
