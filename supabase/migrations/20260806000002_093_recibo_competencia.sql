-- Migration 093: recibos.competencia (mês/ano de referência do recibo)
-- Aplicar via: Supabase Dashboard → SQL Editor
-- Data: 2026-08-06
--
-- Complementa a 092. O recibo já registrava QUANDO foi emitido (emitido_em);
-- competencia registra a QUE PERÍODO ele se refere — o mês do serviço, do
-- aluguel, da diária. São coisas diferentes na prática: recibo emitido em
-- 03/09 pode ser da competência 08/2026, e é a competência que a contabilidade
-- usa pra alocar a despesa.
--
-- POR QUE `date` E NÃO texto "MM/AAAA": permite filtrar e agrupar por período
-- depois (todos os recibos da competência 08/2026, total pago no semestre)
-- sem parse de string. O dia é sempre 01 — competência é mês, não data — e o
-- CHECK garante isso, senão metade das linhas gravaria o dia da emissão e a
-- comparação por igualdade pararia de funcionar.
--
-- NULL é permitido e é o default: doação e adiantamento normalmente não têm
-- competência. O PDF só imprime a linha quando o campo está preenchido.
--
-- Nada de backfill: os recibos da 092 nasceram sem competência e inferir uma
-- a partir de emitido_em seria inventar informação que ninguém declarou.
-- ============================================================================

ALTER TABLE recibos
  ADD COLUMN IF NOT EXISTS competencia date;

ALTER TABLE recibos
  DROP CONSTRAINT IF EXISTS recibos_competencia_dia_1;

ALTER TABLE recibos
  ADD CONSTRAINT recibos_competencia_dia_1
  CHECK (competencia IS NULL OR EXTRACT(DAY FROM competencia) = 1);

COMMENT ON COLUMN recibos.competencia IS
  'Mês/ano a que o recibo se refere (competência), sempre com dia 01 — ver CHECK recibos_competencia_dia_1. NÃO confundir com emitido_em, que é a data da emissão: recibo emitido em 03/09/2026 pode ser da competência 2026-08-01. NULL = sem competência (doação, adiantamento); nesse caso a linha não é impressa no PDF. Gravado como date, e não texto MM/AAAA, para permitir filtro e agrupamento por período.';

-- Consulta esperada: recibos de uma competência dentro da org.
CREATE INDEX IF NOT EXISTS idx_recibos_org_competencia
  ON recibos (organizacao_id, competencia)
  WHERE competencia IS NOT NULL;

-- ============================================================================
-- Rollback (comentado):
-- DROP INDEX IF EXISTS idx_recibos_org_competencia;
-- ALTER TABLE recibos DROP CONSTRAINT IF EXISTS recibos_competencia_dia_1;
-- ALTER TABLE recibos DROP COLUMN IF EXISTS competencia;
