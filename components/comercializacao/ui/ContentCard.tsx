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
    <div style={{
      background: '#fff', borderRadius: 14, border: `1px solid ${COM_C.borda}`,
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: allowOverflow ? 'visible' : 'hidden',
    }}>
      {(title || action) && (
        <div style={{
          padding: '16px 22px', borderBottom: `1px solid ${COM_C.borda}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
        }}>
          <div>
            {title && <div style={{ fontSize: 14, fontWeight: 700, color: COM_C.txt }}>{title}</div>}
            {subtitle && <div style={{ fontSize: 12, color: COM_C.txtSub, marginTop: 2 }}>{subtitle}</div>}
          </div>
          {action}
        </div>
      )}
      <div style={{ padding: noPadding ? 0 : padding }}>{children}</div>
    </div>
  )
}