-- Migration 086: cor primária por org (override manual) + população de modulos_ativos
-- Aplicar via: Supabase Dashboard → SQL Editor
-- Data: 2026-07-20

-- Coluna nova: override manual da cor da marca (hex). NULL = usa a cor padrão do tipo
-- (cooperativa=#1B5E20, associacao=#0F766E, central=#185FA5 — ver lib/tema.ts).
ALTER TABLE organizacoes ADD COLUMN IF NOT EXISTS cor_primaria text;
COMMENT ON COLUMN organizacoes.cor_primaria IS
  'Override manual da cor da marca (hex). NULL = usa a cor padrão do tipo (ver lib/tema.ts).';

-- Backfill 1: COOPAIBI (cooperativa, usa comercialização) — só se ainda não tiver módulos definidos
UPDATE organizacoes
SET modulos_ativos = ARRAY['cooperados','financeiro','assembleias','documentos','mensalidades','comercializacao']
WHERE id = '3ad97dc2-f87f-4e67-950e-387854d5bccc'
  AND (modulos_ativos IS NULL OR modulos_ativos = '{}');

-- Backfill 2: demais orgs ainda sem módulos → base (sem comercialização/loja/contábil/captação)
UPDATE organizacoes
SET modulos_ativos = ARRAY['cooperados','financeiro','assembleias','documentos','mensalidades']
WHERE (modulos_ativos IS NULL OR modulos_ativos = '{}');

-- Rollback (comentado):
-- ALTER TABLE organizacoes DROP COLUMN IF EXISTS cor_primaria;
-- (backfill de modulos_ativos não tem rollback automático — reverter manualmente se necessário)
