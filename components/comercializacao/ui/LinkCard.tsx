import Link from 'next/link'
import { COM_C } from './tokens'

interface LinkCardProps {
  href: string
  label: string
  desc: string
  icon: string
  cor: string
  corLt: string
}

export function LinkCard({ href, label, desc, icon, cor, corLt }: LinkCardProps) {
  return (
    <Link href={href} className="com-link-card">
      <div style={{
        width: 38, height: 38, borderRadius: 10, background: corLt, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <i className={`ti ${icon}`} style={{ fontSize: 18, color: cor }} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: COM_C.txt, marginBottom: 3 }}>{label}</div>
        <div style={{ fontSize: 11, color: COM_C.txtSub, lineHeight: 1.4 }}>{desc}</div>
      </div>
    </Link>
  )
}