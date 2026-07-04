'use client'

import { COM_C } from './tokens'

interface Tab {
  id: string
  label: string
  icon?: string
  badge?: number
}

interface TabsProps {
  tabs: Tab[]
  ativa: string
  onChange: (id: string) => void
}

export function Tabs({ tabs, ativa, onChange }: TabsProps) {
  return (
    <div style={{
      display: 'flex', gap: 4, marginBottom: 20, borderBottom: `1px solid ${COM_C.borda}`,
      overflowX: 'auto', paddingBottom: 0,
    }}>
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          style={{
            padding: '10px 16px', fontSize: 13, fontWeight: 600, border: 'none', background: 'none',
            cursor: 'pointer', whiteSpace: 'nowrap',
            color: ativa === t.id ? COM_C.marrom : COM_C.txtSub,
            borderBottom: ativa === t.id ? `2px solid ${COM_C.marrom}` : '2px solid transparent',
            marginBottom: -1, display: 'flex', alignItems: 'center', gap: 6,
            transition: 'color 0.15s',
          }}
        >
          {t.icon && <i className={`ti ${t.icon}`} style={{ fontSize: 14 }} />}
          {t.label}
          {t.badge != null && t.badge > 0 && (
            <span style={{
              fontSize: 10, fontWeight: 700, background: COM_C.marromLt, color: COM_C.marrom,
              padding: '1px 6px', borderRadius: 10,
            }}>{t.badge}</span>
          )}
        </button>
      ))}
    </div>
  )
}