'use client'

import { useState } from 'react'

type BtnVariante = 'marrom' | 'verde' | 'roxo' | 'cinza' | 'azul'
type BtnTamanho = 'sm' | 'md'

interface CorVariante {
  texto: string
  borda: string
  bg: string
  hoverBg: string
  hoverBorda: string
}

const CORES: Record<BtnVariante, CorVariante> = {
  marrom: { texto: '#374151', borda: '#d1d5db', bg: 'transparent', hoverBg: '#e5e7eb', hoverBorda: '#9ca3af' },
  verde:  { texto: '#374151', borda: '#d1d5db', bg: 'transparent', hoverBg: '#e5e7eb', hoverBorda: '#9ca3af' },
  roxo:   { texto: '#374151', borda: '#d1d5db', bg: 'transparent', hoverBg: '#e5e7eb', hoverBorda: '#9ca3af' },
  cinza:  { texto: '#374151', borda: '#d1d5db', bg: 'transparent', hoverBg: '#e5e7eb', hoverBorda: '#9ca3af' },
  azul:   { texto: '#ffffff', borda: '#378ADD', bg: '#378ADD', hoverBg: '#185FA5', hoverBorda: '#185FA5' },
}

const TAMANHOS: Record<BtnTamanho, { padding: string; fontSize: string }> = {
  sm: { padding: '3px 10px', fontSize: '11px' },
  md: { padding: '6px 14px', fontSize: '13px' },
}

interface BtnProps {
  variante?: BtnVariante
  tamanho?: BtnTamanho
  icone?: string
  children: React.ReactNode
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  style?: React.CSSProperties
  title?: string
}

export function Btn({
  variante = 'cinza',
  tamanho = 'md',
  icone,
  children,
  onClick,
  type = 'button',
  disabled = false,
  style,
  title,
}: BtnProps) {
  const [hover, setHover] = useState(false)
  const cor = CORES[variante]
  const tam = TAMANHOS[tamanho]

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: hover && !disabled ? cor.hoverBg : cor.bg,
        color: cor.texto,
        border: `1.5px solid ${hover && !disabled ? cor.hoverBorda : cor.borda}`,
        padding: tam.padding,
        borderRadius: 8,
        fontSize: tam.fontSize,
        fontWeight: 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transform: hover && !disabled ? 'scale(0.97)' : 'scale(1)',
        transition: 'background .15s, border-color .15s, transform .12s',
        fontFamily: 'inherit',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {icone && (
        <i
          className={`ti ${icone}`}
          style={{ fontSize: tamanho === 'sm' ? 12 : 14 }}
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  )
}

export function BtnLink({
  variante = 'cinza',
  tamanho = 'md',
  icone,
  children,
  href,
  style,
}: {
  variante?: BtnVariante
  tamanho?: BtnTamanho
  icone?: string
  children: React.ReactNode
  href: string
  style?: React.CSSProperties
}) {
  const [hover, setHover] = useState(false)
  const cor = CORES[variante]
  const tam = TAMANHOS[tamanho]

  return (
    <a
      href={href}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: hover ? cor.hoverBg : cor.bg,
        color: cor.texto,
        border: `1.5px solid ${hover ? cor.hoverBorda : cor.borda}`,
        padding: tam.padding,
        borderRadius: 8,
        fontSize: tam.fontSize,
        fontWeight: 500,
        cursor: 'pointer',
        transform: hover ? 'scale(0.97)' : 'scale(1)',
        transition: 'background .15s, border-color .15s, transform .12s',
        textDecoration: 'none',
        fontFamily: 'inherit',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {icone && (
        <i
          className={`ti ${icone}`}
          style={{ fontSize: tamanho === 'sm' ? 12 : 14 }}
          aria-hidden="true"
        />
      )}
      {children}
    </a>
  )
}
