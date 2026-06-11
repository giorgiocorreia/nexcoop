'use client'

import { useState } from 'react'

type BtnVariante = 'marrom' | 'verde' | 'roxo' | 'cinza'
type BtnTamanho = 'sm' | 'md'

const CORES: Record<BtnVariante, { texto: string; hover: string; borda: string }> = {
  marrom: { texto: '#92400e', hover: '#fef3c7', borda: '#92400e' },
  verde:  { texto: '#1D9E75', hover: '#dcfce7', borda: '#1D9E75' },
  roxo:   { texto: '#635BFF', hover: '#ede9fe', borda: '#635BFF' },
  cinza:  { texto: '#6b7280', hover: '#f3f4f6', borda: '#d1d5db' },
}

const TAMANHOS: Record<BtnTamanho, { padding: string; fontSize: string }> = {
  sm: { padding: '4px 10px', fontSize: '11px' },
  md: { padding: '7px 16px', fontSize: '13px' },
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
        background: hover && !disabled ? cor.hover : 'transparent',
        color: cor.texto,
        border: `1.5px solid ${cor.borda}`,
        padding: tam.padding,
        borderRadius: 8,
        fontSize: tam.fontSize,
        fontWeight: 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transform: hover && !disabled ? 'scale(0.96)' : 'scale(1)',
        transition: 'background .15s, transform .12s',
        fontFamily: 'inherit',
        ...style,
      }}
    >
      {icone && <i className={`ti ${icone}`} style={{ fontSize: tamanho === 'sm' ? 12 : 14 }} aria-hidden="true" />}
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
        background: hover ? cor.hover : 'transparent',
        color: cor.texto,
        border: `1.5px solid ${cor.borda}`,
        padding: tam.padding,
        borderRadius: 8,
        fontSize: tam.fontSize,
        fontWeight: 500,
        cursor: 'pointer',
        transform: hover ? 'scale(0.96)' : 'scale(1)',
        transition: 'background .15s, transform .12s',
        textDecoration: 'none',
        fontFamily: 'inherit',
        ...style,
      }}
    >
      {icone && <i className={`ti ${icone}`} style={{ fontSize: tamanho === 'sm' ? 12 : 14 }} aria-hidden="true" />}
      {children}
    </a>
  )
}
