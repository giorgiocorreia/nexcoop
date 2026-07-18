-- Migration 080: vínculo entre loja_compra_parcelas e lancamentos
-- Aplicar via: Supabase Dashboard → SQL Editor
-- Data: 2026-07-17

-- ============================================================
-- Contexto
--
-- A migration 079 criou `loja_compra_parcelas` para compra a prazo na
-- Loja, mas sem vínculo com o Financeiro. A partir de agora cada parcela
-- ganha um lançamento financeiro `pendente` criado já no registro da
-- compra (regime de competência — a obrigação aparece no Financeiro
-- desde o dia em que foi assumida, não só na data de vencimento/baixa).
-- A baixa da parcela passa a atualizar esse lançamento existente para
-- `pago`, em vez de criar um novo lançamento na hora do pagamento.
-- Esta migration adiciona a coluna de vínculo `lancamento_id`.
-- ============================================================

alter table loja_compra_parcelas
  add column lancamento_id uuid references lancamentos(id) on delete set null;

create index idx_loja_compra_parcelas_lancamento on loja_compra_parcelas(lancamento_id);

-- Rollback (comentado):
-- DROP INDEX IF EXISTS idx_loja_compra_parcelas_lancamento;
-- ALTER TABLE loja_compra_parcelas DROP COLUMN IF EXISTS lancamento_id;
