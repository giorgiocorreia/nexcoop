export const COM_C = {
  marrom:    '#92400e',
  marromLt:  '#FEF3C7',
  marromDk:  '#78350f',
  verde:     '#16A34A',
  verdeLt:   '#F0FDF4',
  azul:      '#2563EB',
  azulLt:    '#EFF6FF',
  roxo:      '#635BFF',
  roxoLt:    '#EEF0FF',
  laranja:   '#E07B30',
  laranjaLt: '#FFF7ED',
  vermelho:  '#DC2626',
  vermelhoLt:'#FEF2F2',
  borda:     '#E5E3DC',
  bg:        '#FBF8F4',
  txt:       '#1C1917',
  txtSub:    '#78716C',
} as const

export const inputStyle: React.CSSProperties = {
  padding: '10px 12px',
  border: `1px solid ${COM_C.borda}`,
  borderRadius: 8,
  fontSize: 14,
  background: '#fff',
  width: '100%',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  outline: 'none',
}

export const STATUS_LOTE: Record<string, { label: string; bg: string; cor: string }> = {
  rascunho: { label: 'Rascunho', bg: '#F3F4F6', cor: '#6B7280' },
  aberto:   { label: 'Aberto',   bg: '#F0FDF4', cor: '#16A34A' },
  em_venda: { label: 'Em venda', bg: '#FFF7ED', cor: '#C2410C' },
  entregue: { label: 'Entregue', bg: '#EFF6FF', cor: '#185FA5' },
  pago:     { label: 'Pago',     bg: '#EEF0FF', cor: '#4840CC' },
}