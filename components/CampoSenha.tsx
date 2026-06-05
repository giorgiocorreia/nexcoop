'use client'
import { useState } from 'react'

export function CampoSenha({ id, placeholder, value, onChange, style }: {
  id?: string
  placeholder?: string
  value: string
  onChange: (v: string) => void
  style?: React.CSSProperties
}) {
  const [visivel, setVisivel] = useState(false)
  return (
    <div style={{ position: 'relative', ...style }}>
      <input
        id={id}
        type={visivel ? 'text' : 'password'}
        placeholder={placeholder || 'Senha'}
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ width: '100%', padding: '10px 40px 10px 12px', borderRadius: 8, border: '1px solid #e5e3dc', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
      />
      <button
        type="button"
        onClick={() => setVisivel(v => !v)}
        style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#94A3B8', display: 'flex', alignItems: 'center' }}
        aria-label={visivel ? 'Ocultar senha' : 'Mostrar senha'}
      >
        {visivel ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
            <line x1="1" y1="1" x2="23" y2="23"/>
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        )}
      </button>
    </div>
  )
}
