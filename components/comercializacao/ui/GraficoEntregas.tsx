'use client'

import { COM_C } from './tokens'

interface Ponto { label: string; valor: number }

interface Props { dados: Ponto[] }

export default function GraficoEntregas({ dados }: Props) {
  if (!dados.length) {
    return (
      <p style={{ fontSize: 13, color: COM_C.txtSub, textAlign: 'center', padding: '2.5rem 0', margin: 0 }}>
        Nenhuma entrega registrada ainda.
      </p>
    )
  }

  const W = 780, H = 180
  const PAD = { top: 16, right: 16, bottom: 32, left: 48 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  const maxVal = Math.max(...dados.map(d => d.valor), 1)
  const pts = dados.map((d, i) => ({
    x: PAD.left + (i / Math.max(dados.length - 1, 1)) * innerW,
    y: PAD.top + innerH - (d.valor / maxVal) * innerH,
    ...d,
  }))

  const polyline = pts.map(p => `${p.x},${p.y}`).join(' ')
  const areaPath = [
    `M ${pts[0].x} ${PAD.top + innerH}`,
    ...pts.map(p => `L ${p.x} ${p.y}`),
    `L ${pts[pts.length - 1].x} ${PAD.top + innerH}`,
    'Z',
  ].join(' ')

  const fmtKg = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}t` : `${Math.round(v)}kg`

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', minWidth: 280, height: 'auto', display: 'block' }}>
        <defs>
          <linearGradient id="comAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COM_C.marrom} stopOpacity="0.2" />
            <stop offset="100%" stopColor={COM_C.marrom} stopOpacity="0.01" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((t, i) => {
          const y = PAD.top + innerH - t * innerH
          return (
            <g key={i}>
              <line x1={PAD.left} y1={y} x2={PAD.left + innerW} y2={y}
                stroke={COM_C.borda} strokeWidth="1" strokeDasharray={i === 0 ? 'none' : '4,4'} />
              <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#a8a29e">
                {fmtKg(t * maxVal)}
              </text>
            </g>
          )
        })}
        <path d={areaPath} fill="url(#comAreaGrad)" />
        <polyline points={polyline} fill="none" stroke={COM_C.marrom} strokeWidth="2.5"
          strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4" fill={COM_C.marrom} />
            <text x={p.x} y={PAD.top + innerH + 18} textAnchor="middle" fontSize="10" fill={COM_C.txtSub}>
              {p.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}