/**
 * Verifica se a org tem um módulo ativo.
 * Usar em sidebar, middleware e server actions.
 */
export function temModulo(
  modulos_ativos: string[] | null | undefined,
  modulo: string
): boolean {
  if (!modulos_ativos) return false
  return modulos_ativos.includes(modulo)
}
