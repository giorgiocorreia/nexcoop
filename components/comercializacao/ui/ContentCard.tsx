import { COM_C } from './tokens'

interface ContentCardProps {
  title?: string
  subtitle?: string
  action?: React.ReactNode
  children: React.ReactNode
  padding?: string
  noPadding?: boolean
  /** permite dropdowns/popovers internos vazarem o card (desliga o overflow hidden) */
  allowOverflow?: boolean
}

export function ContentCard({ title, subtitle, action, children, padding = '20px 22px', noPadding, allowOverflow }: ContentCardProps) {
  return (
    <div
      className="com-content-card"
      style={{
        background: '#fff', borderRadius: 14, border: `1px solid ${COM_C.borda}`,
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: allowOverflow ? 'visible' : 'hidden',
        minWidth: 0,
        maxWidth: '100%',
      }}
    >
      {(title || action) && (
        <div className="com-content-card-head nxc-card-head" style={{
          borderBottom: `1px solid ${COM_C.borda}`,
        }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            {title && <div style={{ fontSize: 14, fontWeight: 700, color: COM_C.txt }}>{title}</div>}
            {subtitle && <div style={{ fontSize: 12, color: COM_C.txtSub, marginTop: 2 }}>{subtitle}</div>}
          </div>
          {action && <div style={{ flexShrink: 0 }}>{action}</div>}
        </div>
      )}
      <div style={{ padding: noPadding ? 0 : padding, minWidth: 0, maxWidth: '100%' }}>{children}</div>
    </div>
  )
}
