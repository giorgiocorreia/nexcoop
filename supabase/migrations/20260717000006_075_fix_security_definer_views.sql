-- Migration 075: corrige alerta Security Advisor (Security Definer View)
-- Aplicar via: Supabase Dashboard → SQL Editor
-- Data: 2026-07-17

-- Contexto: vw_saldos_produtor e vw_resultado_safra (criadas na migration 052,
-- supabase/migrations/20260624000001_052_resultado_safra_schema.sql linhas ~316-339)
-- foram criadas via CREATE OR REPLACE VIEW simples, sem cláusula de security.
-- Por padrão isso equivale a SECURITY DEFINER (rodam com privilégios do dono),
-- o que ignora RLS das tabelas base (saldos_produtor_snapshot, resultado_safra_snapshot)
-- para qualquer consulta feita a essas views.
--
-- Hoje o único consumidor é app/(sistema)/comercializacao/resultado/page.tsx via
-- createAdminClient() (service_role, já ignora RLS de qualquer forma) com filtro
-- explícito .eq('organizacao_id', orgId) — sem exploração ativa, mas é uma brecha
-- latente caso alguém consulte essas views via createClient() no futuro sem lembrar
-- do filtro de org.
--
-- Correção: marcar as views com security_invoker = on (Postgres 15+/Supabase),
-- fazendo-as rodar com os privilégios/RLS de quem consulta em vez do dono.
-- Não altera colunas, joins ou qualquer outro comportamento da view.

ALTER VIEW vw_saldos_produtor SET (security_invoker = on);
ALTER VIEW vw_resultado_safra SET (security_invoker = on);

-- Rollback (comentado):
-- ALTER VIEW vw_saldos_produtor SET (security_invoker = off);
-- ALTER VIEW vw_resultado_safra SET (security_invoker = off);
