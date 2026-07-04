'use client'

import { COM_C } from './tokens'

interface ListRowProps {
  onClick?: () => void
  icone?: string
  iconeBg?: string
  iconeCor?: string
  titulo: string
  subtitulo?: string
  direita?: React.ReactNode
  badges?: React.ReactNode
}

export function ListRow({ onClick, icone, iconeBg, iconeCor, titulo, subtitulo, direita, badges }: ListRowProps) {
  return (
    <div
      onClick={onClick}
      className="com-list-row"
      style={{
        background: '#fff', border: `1px solid ${COM_C.borda}`, borderRadius: 14,
        padding: '16px 20px', cursor: onClick ? 'pointer' : 'default',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
        transition: 'box-shadow 0.15s, border-color 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: 1 }}>
        {icone && (
          <div style={{
            width: 38, height: 38, borderRadius: 9, background: iconeBg ?? COM_C.marromLt, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <i className={`ti ${icone}`} style={{ fontSize: 17, color: iconeCor ?? COM_C.marrom }} />
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: COM_C.txt }}>{titulo}</div>
          {subtitulo && (
            <div style={{ fontSize: 12, color: COM_C.txtSub, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {subtitulo}
            </div>
          )}
        </div>
      </div>
      {direita}
      {badges && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {badges}
          {onClick && <i className="ti ti-chevron-right" style={{ fontSize: 15, color: COM_C.txtSub }} />}
        </div>
      )}
    </div>
  )
}