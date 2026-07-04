interface BadgeProps {
  label: string
  bg: string
  cor: string
  dot?: boolean
}

export function Badge({ label, bg, cor, dot }: BadgeProps) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 6,
      background: bg, color: cor,
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: cor, display: 'inline-block' }} />}
      {label}
    </span>
  )
}