-- 049_lote_status_rascunho.sql
-- Adiciona status 'rascunho' ao lote (fase de composição antes de confirmar)

ALTER TABLE lotes DROP CONSTRAINT IF EXISTS lotes_status_check;

ALTER TABLE lotes ADD CONSTRAINT lotes_status_check
  CHECK (status IN ('rascunho','aberto','em_venda','entregue'));

-- Lotes existentes com status 'aberto' que ainda não têm entregas vinculadas
-- ficam como estão — não é necessário migrar dados.
