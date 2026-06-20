-- Migration 044: campos fiscais em loja_compras (Entradas NF-e)
ALTER TABLE loja_compras
  ADD COLUMN IF NOT EXISTS chave_acesso_nfe   TEXT,
  ADD COLUMN IF NOT EXISTS serie_nfe          TEXT,
  ADD COLUMN IF NOT EXISTS data_emissao_nfe   DATE,
  ADD COLUMN IF NOT EXISTS emitente_nfe       TEXT,
  ADD COLUMN IF NOT EXISTS cnpj_emitente      TEXT,
  ADD COLUMN IF NOT EXISTS valor_nfe          NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS status_nfe         TEXT
    DEFAULT 'sem_chave'
    CHECK (status_nfe IN ('com_chave','sem_chave','sem_nota'));

COMMENT ON COLUMN loja_compras.chave_acesso_nfe  IS 'Chave de acesso NF-e 44 dígitos';
COMMENT ON COLUMN loja_compras.status_nfe         IS 'com_chave | sem_chave | sem_nota';
