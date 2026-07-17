-- Migration 071: fix CHECK constraints dessincronizados de status ('pago' vs 'paga')
-- Aplicar via: Supabase Dashboard → SQL Editor
-- Data: 2026-07-17

-- Bug 1 (achado em produção ao clicar "Confirmar pagamento", 17/07/2026):
-- A migration 026 (026_comercializacao_externa.sql, linha 64) criou
--   CHECK (status IN ('rascunho','confirmada','entregue','paga'))
-- em vendas_externas, mas TODO o código da aplicação que grava o estado
-- final de pagamento usa 'pago' (masculino), nunca 'paga':
--   lib/comercializacao/devolucao.ts:109 — .update({ status: "pago" })
-- Nenhum lugar do código grava 'paga'. Resultado: todo UPDATE que marca uma
-- venda externa como paga viola vendas_externas_status_check:
--   new row for relation "vendas_externas" violates check constraint
--   "vendas_externas_status_check"
--
-- Bug 2 (consequência direta do Bug 1, ainda não visto em log pois a
-- transação já quebra antes no Bug 1):
-- A migration 049 (049_lote_status_rascunho.sql) recriou lotes_status_check
-- sem nunca incluir 'pago':
--   CHECK (status IN ('rascunho','aberto','em_venda','entregue'))
-- Mas a migration 054c (20260625000003_054c_trigger_lote_status_pago.sql)
-- adicionou em fn_atualizar_status_lote (trigger trg_atualizar_status_lote,
-- AFTER UPDATE em vendas_externas) o case:
--   IF NEW.status = 'pago' THEN UPDATE lotes SET status = 'pago' ...
-- E lib/comercializacao/devolucao.ts:115 também faz
--   .from("lotes").update({ status: "pago" })
-- diretamente. Ambos os caminhos violam lotes_status_check assim que o
-- Bug 1 for corrigido e a venda externa conseguir chegar a status 'pago'.
--
-- Esta migration:
--   1. Recria vendas_externas_status_check substituindo 'paga' por 'pago'.
--   2. Recria lotes_status_check incluindo 'pago'.
-- Não faz backfill automático — ver diagnóstico comentado no final.

-- 1. Corrigir vendas_externas_status_check
ALTER TABLE vendas_externas
  DROP CONSTRAINT IF EXISTS vendas_externas_status_check;

ALTER TABLE vendas_externas
  ADD CONSTRAINT vendas_externas_status_check
  CHECK (status IN ('rascunho','confirmada','entregue','pago'));

-- 2. Corrigir lotes_status_check
ALTER TABLE lotes
  DROP CONSTRAINT IF EXISTS lotes_status_check;

ALTER TABLE lotes
  ADD CONSTRAINT lotes_status_check
  CHECK (status IN ('rascunho','aberto','em_venda','entregue','pago'));

-- Diagnóstico (NÃO executar UPDATE automático — revisar manualmente antes de tocar):
-- SELECT id, organizacao_id, lote_id, status, criado_em
-- FROM vendas_externas
-- WHERE status = 'paga';
--
-- SELECT id, organizacao_id, status, criado_em
-- FROM lotes
-- WHERE status NOT IN ('rascunho','aberto','em_venda','entregue','pago');

-- Rollback (comentado):
-- ALTER TABLE vendas_externas DROP CONSTRAINT IF EXISTS vendas_externas_status_check;
-- ALTER TABLE vendas_externas
--   ADD CONSTRAINT vendas_externas_status_check
--   CHECK (status IN ('rascunho','confirmada','entregue','paga'));
--
-- ALTER TABLE lotes DROP CONSTRAINT IF EXISTS lotes_status_check;
-- ALTER TABLE lotes
--   ADD CONSTRAINT lotes_status_check
--   CHECK (status IN ('rascunho','aberto','em_venda','entregue'));
