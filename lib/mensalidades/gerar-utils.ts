// Utilitários puros para geração de mensalidades (range de meses e vencimento).
// Sem I/O — NÃO leva 'use server' (regra 5 do CLAUDE.md). Compartilhado entre a
// tela /mensalidades/gerar e a server action de geração no cadastro.

/** Lista de meses 'YYYY-MM' a partir de mesInicial ('YYYY-MM'), por `qtd` meses (1–12). */
export function mesesRange(mesInicial: string, qtd: number): string[] {
  const [ano, mes] = mesInicial.split('-').map(Number)
  const n = Math.min(Math.max(qtd || 1, 1), 12)
  const out: string[] = []
  for (let i = 0; i < n; i++) {
    const d = new Date(ano, mes - 1 + i, 1)
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return out
}

/** Quantidade de meses do mês inicial até dezembro do mesmo ano (julho → 6). */
export function mesesAteDezembro(mesInicial: string): number {
  const mes = parseInt(mesInicial.split('-')[1], 10) || 1
  return 13 - mes
}

/** Data de vencimento no mês 'YYYY-MM', com o dia ajustado ao último dia do mês. */
export function vencimentoDoMes(mesRef: string, dia: number): string {
  const [ano, mes] = mesRef.split('-').map(Number)
  const diaFinal = Math.min(dia, new Date(ano, mes, 0).getDate())
  return `${ano}-${String(mes).padStart(2, '0')}-${String(diaFinal).padStart(2, '0')}`
}

/** Mês atual no formato 'YYYY-MM'. */
export function mesAtual(): string {
  const h = new Date()
  return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}`
}
