'use client'

import { useState } from 'react'

type BtnVariante = 'marrom' | 'verde' | 'roxo' | 'cinza' | 'azul' | 'marrom-outline'
type BtnTamanho = 'sm' | 'md'

interface CorVariante {
  texto: string
  borda: string
  bg: string
  hoverBg: string
  hoverBorda: string
  hoverTexto?: string
}

const CORES: Record<BtnVariante, CorVariante> = {
  marrom:         { texto: '#ffffff', borda: '#92400e', bg: '#92400e', hoverBg: '#78350f', hoverBorda: '#78350f' },
  verde:          { texto: '#ffffff', borda: '#16A34A', bg: '#16A34A', hoverBg: '#15803D', hoverBorda: '#15803D' },
  roxo:           { texto: '#ffffff', borda: '#635BFF', bg: '#635BFF', hoverBg: '#4840CC', hoverBorda: '#4840CC' },
  azul:           { texto: '#ffffff', borda: '#2563EB', bg: '#2563EB', hoverBg: '#1D4ED8', hoverBorda: '#1D4ED8' },
  cinza:          { texto: '#374151', borda: '#d1d5db', bg: '#fff', hoverBg: '#f9fafb', hoverBorda: '#9ca3af' },
  'marrom-outline': { texto: '#92400e', borda: '#92400e', bg: 'transparent', hoverBg: '#92400e', hoverBorda: '#92400e', hoverTexto: '#ffffff' },
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
        color: hover && !disabled && cor.hoverTexto ? cor.hoverTexto : cor.texto,
        border: `1.5px solid ${hover && !disabled ? cor.hoverBorda : cor.borda}`,
        padding: tam.padding,
        borderRadius: 8,
        fontSize: tam.fontSize,
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transform: hover && !disabled ? 'translateY(-1px)' : 'none',
        boxShadow: variante !== 'cinza' && variante !== 'marrom-outline' && !disabled
          ? '0 2px 6px rgba(0,0,0,0.12)' : 'none',
        transition: 'background .15s, border-color .15s, transform .12s, box-shadow .12s',
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
        color: hover && cor.hoverTexto ? cor.hoverTexto : cor.texto,
        border: `1.5px solid ${hover ? cor.hoverBorda : cor.borda}`,
        padding: tam.padding,
        borderRadius: 8,
        fontSize: tam.fontSize,
        fontWeight: 600,
        cursor: 'pointer',
        transform: hover ? 'translateY(-1px)' : 'none',
        boxShadow: variante !== 'cinza' && variante !== 'marrom-outline'
          ? '0 2px 6px rgba(0,0,0,0.12)' : 'none',
        transition: 'background .15s, border-color .15s, transform .12s, box-shadow .12s',
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
