-- Migration 077: revoga EXECUTE de PUBLIC em funções SECURITY DEFINER
-- (complementa a migration 076 — REVOKE de anon/authenticated não bastou)
-- Aplicar via: Supabase Dashboard → SQL Editor
-- Data: 2026-07-17

-- Contexto: a migration 076 revogou EXECUTE de `anon` e `authenticated`
-- diretamente em public.get_org_id(), public.get_user_role() e
-- public.handle_new_user(), mas o Security Advisor continuou mostrando os
-- mesmos 6 warnings (3 funções × anon/authenticated) após "Rerun linter".
--
-- Causa raiz: no Postgres, toda função nova recebe GRANT EXECUTE TO PUBLIC
-- automaticamente na criação (comportamento padrão do CREATE FUNCTION, não é
-- algo específico do Supabase). `anon` e `authenticated` são roles que
-- herdam privilégios de PUBLIC como qualquer outro role — um REVOKE
-- direcionado a eles especificamente NÃO remove o que eles recebem por
-- herança de PUBLIC. Enquanto o GRANT em PUBLIC continuar de pé, os dois
-- roles continuam podendo executar a função via PostgREST
-- (/rest/v1/rpc/<nome>), e o Security Advisor continua acusando o alerta.
--
-- Ação: revogar EXECUTE de PUBLIC nas mesmas 3 funções da migration 076.
-- Isso fecha a herança e, junto com o REVOKE já feito para anon/authenticated
-- na 076, elimina de fato o acesso via API pública. Nenhum DROP — reversível,
-- nenhuma função é apagada.
--
-- Segurança confirmada antes desta migration:
--   - Revogar EXECUTE de PUBLIC não afeta o dono da função nem o service_role
--     (que tem privilégios equivalentes a superusuário/BYPASSRLS no Supabase)
--     — GRANT/REVOKE de EXECUTE só controla chamadas feitas através de um
--     role explícito (incluindo chamadas RPC do PostgREST). O dono da função
--     e roles com atributo de superusuário não são bloqueados por REVOKE.
--   - handle_new_user() continua funcionando como trigger
--     (AFTER INSERT ON auth.users → on_auth_user_created, ver
--     supabase/migrations/001_schema_mvp.sql:315): a execução de uma função
--     por um trigger é feita internamente pelo motor do Postgres, não passa
--     pelo mecanismo de permissão de roles de API — GRANT/REVOKE em
--     PUBLIC/anon/authenticated não tem qualquer efeito sobre triggers.
--
-- ATENÇÃO antes de rodar: mesma ressalva da migration 076 — get_org_id() e
-- get_user_role() são schema drift (não existem em nenhuma migration deste
-- repo, foram criadas direto no Supabase Dashboard). A assinatura SEM
-- ARGUMENTOS abaixo foi assumida com base no Security Advisor (campo
-- "arguments" vazio/"" no metadata) e já usada com sucesso na migration 076
-- (rodou sem erro). Se ainda assim der erro de "function does not exist",
-- confirme a assinatura completa em Database → Functions no Dashboard antes
-- de tentar novamente.

REVOKE EXECUTE ON FUNCTION public.get_org_id() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_role() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;

-- Rollback (comentado):
-- GRANT EXECUTE ON FUNCTION public.get_org_id() TO PUBLIC;
-- GRANT EXECUTE ON FUNCTION public.get_user_role() TO PUBLIC;
-- GRANT EXECUTE ON FUNCTION public.handle_new_user() TO PUBLIC;
