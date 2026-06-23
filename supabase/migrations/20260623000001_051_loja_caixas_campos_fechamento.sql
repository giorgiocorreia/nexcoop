-- Migration 051: campos de fechamento em loja_caixas
ALTER TABLE loja_caixas
  ADD COLUMN IF NOT EXISTS saldo_final_especie NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS valor_fechamento NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS total_especie NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS total_pix NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS total_cartao NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS total_saldo NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS total_sangrias NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS total_aportes NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS fechado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status_conferencia TEXT DEFAULT 'aguardando',
  ADD COLUMN IF NOT EXISTS valor_fisico_especie NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS valor_fisico_debito NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS valor_fisico_credito NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS observacao_conferencia TEXT,
  ADD COLUMN IF NOT EXISTS conferido_por UUID REFERENCES usuarios(id),
  ADD COLUMN IF NOT EXISTS conferido_em TIMESTAMPTZ;
