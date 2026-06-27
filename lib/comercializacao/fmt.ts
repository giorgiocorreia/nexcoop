import { fmt } from '@/lib/fmt'

export function fmtReal(valor: number): string {
  return fmt.moeda(valor)
}

export function fmtNum(valor: number, casas = 2): string {
  return valor.toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  })
}
