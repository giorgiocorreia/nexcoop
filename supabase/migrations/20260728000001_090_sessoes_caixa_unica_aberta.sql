-- Migration 090: no máximo 1 sessão de caixa ABERTA por (org, usuário)
--
-- Contexto (27/07/2026, COOPAIBI / Luan): operador abriu o caixa no fluxo normal,
-- o dashboard mostrou "Caixa fechado" e ele abriu de novo → 2 sessões abertas;
-- operações do dia ficaram numa e a outra ficou órfã, distorcendo o saldo.
--
-- A app já faz guard em abrirCaixa(); este índice é a trava no banco.

CREATE UNIQUE INDEX IF NOT EXISTS sessoes_caixa_unica_aberta_por_usuario
  ON public.sessoes_caixa (organizacao_id, usuario_id)
  WHERE status = 'aberta';

COMMENT ON INDEX public.sessoes_caixa_unica_aberta_por_usuario IS
  'Garante uma única sessão aberta por operador na comercialização (evita reabertura fantasma).';

-- Rollback (comentado):
-- DROP INDEX IF EXISTS public.sessoes_caixa_unica_aberta_por_usuario;
