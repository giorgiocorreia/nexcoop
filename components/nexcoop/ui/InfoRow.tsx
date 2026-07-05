import { COM_C } from '@/components/comercializacao/ui/tokens'

export function InfoRow({ label, valor, destaque }: {
  label: string
  valor?: string | number | null
  destaque?: boolean
}) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', gap: 12,
      padding: '9px 0', borderBottom: `1px solid ${COM_C.borda}`,
    }}>
      <span style={{ fontSize: 12, color: COM_C.txtSub, fontWeight: 500 }}>{label}</span>
      <span style={{
        fontSize: 13, textAlign: 'right', maxWidth: '60%',
        color: destaque ? COM_C.roxo : COM_C.txt,
        fontWeight: destaque ? 700 : 400,
      }}>
        {valor ?? '—'}
      </span>
    </div>
  )
}