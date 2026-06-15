-- Migration 037: Expandir loja_compras para registrar NF, datas e rateio de custos

ALTER TABLE loja_compras
  ADD COLUMN IF NOT EXISTS numero_nf               TEXT,
  ADD COLUMN IF NOT EXISTS data_compra             DATE NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS valor_frete             NUMERIC(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS outros_custos_valor     NUMERIC(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS outros_custos_descricao TEXT,
  ADD COLUMN IF NOT EXISTS observacoes             TEXT;

-- Preservar numero_nota anterior em numero_nf (se existir)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'loja_compras' AND column_name = 'numero_nota'
  ) THEN
    UPDATE loja_compras SET numero_nf = numero_nota WHERE numero_nota IS NOT NULL AND numero_nf IS NULL;
  END IF;
END $$;
