import { COM_C } from './tokens'

interface KpiCardProps {
  label: string
  value: string
  sub?: string
  icon: string
  cor: string
  corLt: string
  children?: React.ReactNode
}

export function KpiCard({ label, value, sub, icon, cor, corLt, children }: KpiCardProps) {
  return (
    <div className="com-kpi-card">
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: cor, borderRadius: '14px 14px 0 0' }} />
      <div style={{ marginBottom: 14 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10, background: corLt,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <i className={`ti ${icon}`} style={{ fontSize: 18, color: cor }} />
        </div>
      </div>
      <div className="com-kpi-value" style={{ color: COM_C.txt }}>{value}</div>
      <div style={{ fontSize: 12, color: COM_C.txtSub, fontWeight: 500 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: '#A8A29E', marginTop: 2 }}>{sub}</div>}
      {children && <div style={{ marginTop: 10 }}>{children}</div>}
    </div>
  )
}