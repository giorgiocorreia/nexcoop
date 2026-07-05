import { COM_C } from '@/components/comercializacao/ui/tokens'

export function AlertBanner({ tipo, children }: { tipo: 'ok' | 'erro' | 'info'; children: React.ReactNode }) {
  const styles = {
    ok:   { bg: COM_C.roxoLt, border: '#C4B5FD', color: COM_C.roxo },
    erro: { bg: COM_C.vermelhoLt, border: '#FECACA', color: COM_C.vermelho },
    info: { bg: COM_C.azulLt, border: '#B5D4F4', color: COM_C.azul },
  }[tipo]

  return (
    <div style={{
      padding: '12px 16px', borderRadius: 10, fontSize: 13, marginBottom: 16,
      background: styles.bg, border: `1px solid ${styles.border}`, color: styles.color,
      display: 'flex', alignItems: 'flex-start', gap: 8,
    }}>
      <i className={`ti ${tipo === 'ok' ? 'ti-check' : tipo === 'erro' ? 'ti-alert-circle' : 'ti-info-circle'}`} style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }} />
      <span>{children}</span>
    </div>
  )
}