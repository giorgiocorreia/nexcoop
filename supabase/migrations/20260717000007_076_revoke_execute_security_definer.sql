-- Migration 076: revoga EXECUTE de anon/authenticated em funções SECURITY DEFINER
-- Aplicar via: Supabase Dashboard → SQL Editor
-- Data: 2026-07-17

-- Contexto: o Security Advisor apontou os alertas "Public Can Execute
-- SECURITY DEFINER Function" (role anon) e "Signed-In Users Can Execute
-- SECURITY DEFINER Function" (role authenticated) para 3 funções:
--   - public.get_org_id()
--   - public.get_user_role()
--   - public.handle_new_user()
--
-- Todas ficam expostas via PostgREST em /rest/v1/rpc/<nome> por padrão,
-- porque toda função nova recebe GRANT EXECUTE TO PUBLIC automaticamente no
-- Postgres/Supabase — mesmo sem nenhum código da aplicação chamando via RPC.
--
-- Investigação feita antes desta migration:
--   - get_org_id() e get_user_role(): NÃO aparecem em nenhuma migration deste
--     repo nem são referenciadas em nenhum arquivo .ts/.sql do código. Foram
--     criadas direto no Supabase Dashboard em algum momento e ficaram
--     esquecidas — mesmo padrão de schema drift já visto em loja_sangrias
--     (migration 073) e nas views da migration 075. Não sabemos a lógica
--     interna delas nem se retornam dado sensível de outra org quando
--     chamadas via RPC anônima/autenticada por qualquer usuário.
--   - handle_new_user(): existe em supabase/migrations/001_schema_mvp.sql
--     linha 315, SECURITY DEFINER, sem argumentos, RETURNS trigger. É o
--     trigger de criação de registro em `usuarios` no signup
--     (AFTER INSERT ON auth.users → on_auth_user_created). PRECISA continuar
--     SECURITY DEFINER (grava em `usuarios`, tabela que o usuário recém-criado
--     ainda não tem permissão de INSERT). Revogar EXECUTE de anon/authenticated
--     NÃO quebra o cadastro: triggers do Postgres rodam independente de
--     GRANT/REVOKE feitos em roles de API — só fecha a chamada direta via
--     RPC (/rest/v1/rpc/handle_new_user), que hoje não é usada por
--     nenhum código do app (grep confirmou: única referência é o próprio
--     trigger em 001_schema_mvp.sql).
--
-- Ação: apenas REVOKE de EXECUTE dos 3 roles de API. Nenhum DROP — reversível,
-- nenhuma função é apagada, apenas deixa de ser chamável via API REST pública.
--
-- ATENÇÃO antes de rodar: as 3 funções foram assumidas como SEM ARGUMENTOS
-- com base no Security Advisor (campo "arguments" vazio/"" no metadata).
-- get_org_id() e get_user_role() não têm código-fonte neste repo para
-- conferir a assinatura exata — se o REVOKE abaixo der erro de "function
-- does not exist" para alguma delas, abra Database → Functions no Dashboard,
-- confirme a assinatura completa (nome + tipos de parâmetros) e ajuste a
-- linha correspondente antes de tentar novamente.

REVOKE EXECUTE ON FUNCTION public.get_org_id() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_role() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;

-- Rollback (comentado):
-- GRANT EXECUTE ON FUNCTION public.get_org_id() TO anon, authenticated;
-- GRANT EXECUTE ON FUNCTION public.get_user_role() TO anon, authenticated;
-- GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon, authenticated;
