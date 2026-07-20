-- Migration 087: colunas de comprovante PIX em mensalidades (baixa com upload + leitura por IA + dedup)
-- Aplicar via: Supabase Dashboard → SQL Editor
-- Data: 2026-07-20

-- Colunas novas: todas nullable (tabela já populada), sem DEFAULT necessário.
ALTER TABLE mensalidades
  ADD COLUMN IF NOT EXISTS forma_pagamento          text,
  ADD COLUMN IF NOT EXISTS comprovante_url          text,
  ADD COLUMN IF NOT EXISTS comprovante_id_transacao text,   -- EndToEndId (dedup)
  ADD COLUMN IF NOT EXISTS comprovante_hash         text,   -- SHA-256 do arquivo (dedup fallback)
  ADD COLUMN IF NOT EXISTS comprovante_pagador      text,
  ADD COLUMN IF NOT EXISTS comprovante_valor        numeric(12,2),
  ADD COLUMN IF NOT EXISTS comprovante_data         date,
  ADD COLUMN IF NOT EXISTS comprovante_dados        jsonb;  -- extração completa (auditoria)

-- Dedup forte por org: mesmo EndToEndId não pode dar baixa em duas mensalidades.
CREATE UNIQUE INDEX IF NOT EXISTS uq_mensalidade_comprovante_e2e
  ON mensalidades (organizacao_id, comprovante_id_transacao)
  WHERE comprovante_id_transacao IS NOT NULL;

-- Dedup por arquivo (quando não há E2E legível).
CREATE UNIQUE INDEX IF NOT EXISTS uq_mensalidade_comprovante_hash
  ON mensalidades (organizacao_id, comprovante_hash)
  WHERE comprovante_hash IS NOT NULL;

-- Rollback (comentado):
-- DROP INDEX IF EXISTS uq_mensalidade_comprovante_hash;
-- DROP INDEX IF EXISTS uq_mensalidade_comprovante_e2e;
-- ALTER TABLE mensalidades
--   DROP COLUMN IF EXISTS comprovante_dados,
--   DROP COLUMN IF EXISTS comprovante_data,
--   DROP COLUMN IF EXISTS comprovante_valor,
--   DROP COLUMN IF EXISTS comprovante_pagador,
--   DROP COLUMN IF EXISTS comprovante_hash,
--   DROP COLUMN IF EXISTS comprovante_id_transacao,
--   DROP COLUMN IF EXISTS comprovante_url,
--   DROP COLUMN IF EXISTS forma_pagamento;
