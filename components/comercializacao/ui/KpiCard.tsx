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
    <div
      className="com-kpi-card"
      style={{
        background: `linear-gradient(135deg, #fff 0%, ${corLt} 100%)`,
        borderColor: `${cor}22`,
      }}
    >
      <div
        className="com-kpi-icon"
        style={{ background: cor, boxShadow: `0 4px 12px ${cor}33` }}
      >
        <i className={`ti ${icon}`} />
      </div>
      <div className="com-kpi-body">
        <span className="com-kpi-label">{label}</span>
        <span className="com-kpi-value" style={{ color: COM_C.txt }}>{value}</span>
        {sub && <span className="com-kpi-sub">{sub}</span>}
        {children}
      </div>
    </div>
  )
}
