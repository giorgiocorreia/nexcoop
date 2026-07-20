// Utilitários puros do vínculo cooperado ↔ produtor (sem I/O).
// Regra 5 do CLAUDE.md: função pura nunca entra em arquivo "use server".

import type { StatusCooperado, TipoProdutorVinculo } from '@/types/database'

/**
 * Tipo do produtor espelho derivado do status do cooperado vinculado.
 *
 * Mesma regra do trigger `trg_sincronizar_tipo_produtor` (migration 053), que
 * roda em AFTER UPDATE OF status ON cooperados. O trigger NÃO cobre o INSERT
 * (criação/promoção), então os fluxos de criação precisam aplicar a regra aqui
 * — senão o produtor nasce com tipo divergente e só se corrige quando alguém
 * mudar o status do cooperado depois.
 *
 * Impacto de errar: `tipo` decide o preço aplicado na cotação
 * (preco_cooperado vs preco_externo) — produtor com tipo errado é pago errado.
 */
export function tipoProdutorPorStatusCooperado(status: StatusCooperado): TipoProdutorVinculo {
  return status === 'ativo' ? 'cooperado' : 'externo'
}
