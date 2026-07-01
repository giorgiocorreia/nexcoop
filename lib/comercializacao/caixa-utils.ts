/**
 * Funções puras de cálculo do módulo de caixa (comercialização).
 * Sem I/O — este arquivo NUNCA deve ter "use server" (ver regra crítica em CLAUDE.md).
 */

/**
 * Recalcula o saldo em espécie da sessão de caixa no momento do fechamento.
 *
 * Invariante mantida por `abrirCaixa()` (valor inicial = saldo_inicial_especie) e por
 * `registrarAporteSangria()` (soma/subtrai a cada aporte/sangria):
 *   saldoEspecieCalculadoAtual === saldo_inicial_especie + Σaportes − Σsangrias
 *
 * Este cálculo fecha a conta subtraindo o total de saídas em espécie apurado no fechamento
 * (`totalSaidasEspecie`), reconciliando o campo `saldo_especie_calculado` — que, antes desta
 * correção, `fecharCaixa()` nunca atualizava, deixando-o congelado em
 * "saldo_inicial + aportes − sangrias" (sem descontar saídas).
 *
 * Resultado equivalente a: saldo_inicial_especie + Σaportes − Σsangrias − totalSaidasEspecie
 */
export function calcularSaldoEspecieNoFechamento(params: {
  saldoEspecieCalculadoAtual: number
  totalSaidasEspecie: number
}): number {
  return Number((params.saldoEspecieCalculadoAtual - params.totalSaidasEspecie).toFixed(2))
}
