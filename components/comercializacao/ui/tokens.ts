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
  // Versoes para TEXTO. verde e laranja so passam contraste como fundo de icone
  // (com glifo branco em cima); como texto sobre branco dao 3.3:1 e 3.0:1.
  verdeTxt:   '#15803D',
  laranjaTxt: '#B45309',
  // Verde da marca, o mesmo da faixa do topo (HERO). Para acentos que devem
  // conversar com ela, e nao para status semantico (use verde/vermelho).
  marca:     '#1B5E20',
  marcaMd:   '#2E7D32',
  marcaLt:   '#EDF4EC',
  // Escala neutra esverdeada (matiz ~120) no lugar da stone quente, que era o
  // que brigava com a faixa.
  // Os tres andam juntos: escurecer o bg derruba o contraste do txtSub sobre
  // ele e faz a borda passar a ser mais clara que o fundo (inverte). Em
  // #D2D8D0, txtSub precisa ser >= #515E53 para os rotulos de 11px baterem
  // 4.5:1, e a borda precisa ser mais escura que o bg.
  borda:     '#BCC9BA',
  bg:        '#D2D8D0',
  txt:       '#18211A',
  txtSub:    '#515E53',
} as const

// Faixa verde que atravessa sidebar + header da pagina como um bloco unico.
// O gradiente e vertical de proposito: um gradiente diagonal e calculado por
// elemento, entao reiniciaria na divisa e deixaria uma emenda visivel. Vertical,
// cada coluna tem a mesma cor e a faixa continua independente da largura da
// sidebar (que muda ao recolher).
export const HERO = {
  // Cor da marca por org (lib/tema.ts), injetada como CSS var no div raiz de
  // app/(sistema)/layout.tsx. Fallback verde (cooperativa) quando a var nao
  // existe — ex.: telas fora do layout do sistema.
  bg:      'var(--nxc-marca-bg, linear-gradient(180deg, #2E7D32 0%, #1B5E20 100%))',
  // Cor em que o gradiente termina. O corpo da sidebar continua nela, entao a
  // faixa desce sem degrau.
  fim:     'var(--nxc-marca-fim, #1B5E20)',
  borda:   '1px solid rgba(255,255,255,0.15)',
  hover:   'rgba(255,255,255,0.10)',
  chip:    'rgba(255,255,255,0.18)',
  txt:     '#fff',
  // 0.85 e o minimo para 4.5:1 no ponto mais ALTO onde texto secundario cai
  // (breadcrumb do PageLayout, t~0.30 do gradiente). Mais abaixo sobra folga.
  txtSub:  'rgba(255,255,255,0.85)',
  // Separador do breadcrumb: decorativo, so precisa ser visto.
  divisor: 'rgba(255,255,255,0.40)',
  // Casa com o min-height de .com-page-header (HubStyles).
  altura:  88,
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