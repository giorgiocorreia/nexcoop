-- Migration 070: fix DEFAULT de vendas_externas.status_nfe + inclui 'erro' no CHECK
-- Aplicar via: Supabase Dashboard → SQL Editor
-- Data: 2026-07-17

-- Bug (achado em produção via logs do Vercel, 17/07/2026):
-- A migration 048 criou vendas_externas.status_nfe com
--   DEFAULT 'pendente' CHECK (status_nfe IN ('pendente','autorizada','rejeitada','cancelada')).
-- A migration 054 (20260625000001_054_vendas_devolucoes.sql, linhas 18-22) dropou
-- esse CHECK e recriou a lista sem 'pendente':
--   CHECK (status_nfe IN ('rascunho','processando','autorizada','cancelada','rejeitada','devolvida'))
-- mas ninguém atualizou o DEFAULT da coluna, que continuou 'pendente'.
--
-- Resultado: desde 25/06/2026, todo INSERT em vendas_externas que não informa
-- status_nfe explicitamente (ex.: criarVendaExterna em
-- app/(sistema)/comercializacao/lotes/actions.ts) usa o default 'pendente',
-- que viola o CHECK atual:
--   new row for relation "vendas_externas" violates check constraint
--   "vendas_externas_status_nfe_check"
--
-- Bug relacionado: lib/focusnfe/emitir-nfe-saida.ts (linhas 134 e 211) faz
-- update({ status_nfe: 'erro' }) em caso de falha na emissão da NF-e, mas
-- 'erro' nunca esteve na lista do CHECK — esse update também quebra.
--
-- Esta migration:
--   1. Corrige o DEFAULT da coluna para 'rascunho' (já aceito pelo CHECK atual,
--      e semanticamente correto: venda criada, NF-e ainda não emitida).
--   2. Recria o CHECK incluindo 'erro', mantendo todos os valores já em uso.
-- Não faz backfill automático de dados — ver diagnóstico comentado no final.

-- 1. Corrigir DEFAULT
ALTER TABLE vendas_externas
  ALTER COLUMN status_nfe SET DEFAULT 'rascunho';

-- 2. Recriar CHECK incluindo 'erro'
ALTER TABLE vendas_externas
  DROP CONSTRAINT IF EXISTS vendas_externas_status_nfe_check;

ALTER TABLE vendas_externas
  ADD CONSTRAINT vendas_externas_status_nfe_check
  CHECK (status_nfe IN ('rascunho','processando','autorizada','cancelada','rejeitada','devolvida','erro'));

-- Diagnóstico (NÃO executar UPDATE automático — revisar manualmente antes de tocar):
-- SELECT id, organizacao_id, lote_id, status_nfe, criado_em
-- FROM vendas_externas
-- WHERE status_nfe = 'pendente';

-- Rollback (comentado):
-- ALTER TABLE vendas_externas ALTER COLUMN status_nfe SET DEFAULT 'pendente';
-- ALTER TABLE vendas_externas DROP CONSTRAINT IF EXISTS vendas_externas_status_nfe_check;
-- ALTER TABLE vendas_externas
--   ADD CONSTRAINT vendas_externas_status_nfe_check
--   CHECK (status_nfe IN ('rascunho','processando','autorizada','cancelada','rejeitada','devolvida'));
