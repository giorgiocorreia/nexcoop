-- Migration 074: sessoes_caixa +valor_contado_especie (registro de auditoria, nunca usado em cálculo)
-- Aplicar via: Supabase Dashboard → SQL Editor
-- Data: 2026-07-17

-- Contexto: saldo_final_especie em sessoes_caixa passa a ser SEMPRE o valor
-- calculado pelo sistema (nunca mais editável pelo operador no fechamento).
-- O operador ainda pode registrar quanto contou fisicamente no caixa, apenas
-- como log de auditoria para o admin conferir depois se bateu ou não — isso
-- nunca afeta nenhum cálculo (saldo_especie_calculado, saldo_final_especie,
-- snapshots, etc).
--
-- Padrão já existente em loja_caixas.valor_fisico_especie (migrations 042 e 051).

ALTER TABLE sessoes_caixa
  ADD COLUMN IF NOT EXISTS valor_contado_especie numeric(12,2);

COMMENT ON COLUMN sessoes_caixa.valor_contado_especie IS
  'Dinheiro contado fisicamente pelo operador no fechamento — só registro de auditoria, nunca usado para calcular saldo. saldo_final_especie continua sendo sempre o valor calculado pelo sistema.';

-- Rollback (comentado):
-- ALTER TABLE sessoes_caixa DROP COLUMN IF EXISTS valor_contado_especie;
