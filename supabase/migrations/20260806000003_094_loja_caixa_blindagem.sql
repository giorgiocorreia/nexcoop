-- Migration 094: blindagem do caixa da Loja (1 aberto por operador + forma_pagamento no aporte)
-- Aplicar via: Supabase Dashboard → SQL Editor
-- Data: 2026-08-06
--
-- Traz pra Loja duas travas que a Comercialização já tem e que sustentam a
-- continuidade de saldo (fechamento de hoje = abertura de amanhã):
--   090 → uma sessão aberta por operador
--   063 → aporte sabe se entrou como espécie, pix ou cartão
--
-- CONTEXTO (por que agora): o valor de abertura do caixa da Loja já é
-- calculado pelo sistema (`getSaldoResponsabilidadeLoja`), nunca digitado.
-- Só que essa leitura pega UM caixa do operador — com dois abertos ao mesmo
-- tempo ela lê o errado e o saldo herdado no dia seguinte sai furado. Pior:
-- `getCaixaLojaAbertoDoOperador` e `abrirCaixaLoja` usam `.maybeSingle()`,
-- que ERRA quando a consulta devolve 2 linhas; o erro era engolido e virava
-- `caixa = null` → o PDV mostrava "caixa fechado" com caixa aberto, o
-- operador clicava em abrir e criava mais um. Mesmo ciclo do incidente do
-- Luan na Comercialização (27/07, migration 090), só que sem a trava.
-- ============================================================================

-- ── 1) No máximo UM caixa aberto por operador ───────────────────────────────
--
-- Espelha `sessoes_caixa_unica_aberta_por_usuario` (090). Continua valendo o
-- que a 090 já dizia: Loja e Comercialização são INDEPENDENTES — o mesmo
-- usuário pode ter `loja_caixas` aberto E `sessoes_caixa` aberta ao mesmo
-- tempo. A trava é por módulo, nunca entre módulos.
--
-- ⚠️ SE ESTE CREATE INDEX FALHAR com "could not create unique index", já
-- existe operador com 2+ caixas abertos em produção. NÃO force: rode o
-- diagnóstico abaixo, decida caso a caso qual caixa é o de trabalho (o que
-- tem vendas/sangrias) e feche o órfão à mão, como foi feito com a sessão
-- órfã do Luan. Só depois rode o índice.
--
--   SELECT usuario_id, count(*), array_agg(id ORDER BY aberto_em)
--     FROM loja_caixas WHERE status = 'aberto'
--    GROUP BY usuario_id HAVING count(*) > 1;

CREATE UNIQUE INDEX IF NOT EXISTS loja_caixas_unico_aberto_por_usuario
  ON loja_caixas (org_id, usuario_id)
  WHERE status = 'aberto';

COMMENT ON INDEX loja_caixas_unico_aberto_por_usuario IS
  'No máximo um loja_caixas com status=aberto por (org_id, usuario_id). Equivalente da 090 para a Loja. NÃO se aplica entre módulos: o mesmo usuário pode ter caixa da Loja e sessão da Comercialização abertos simultaneamente — são responsabilidades separadas.';

-- ── 2) Forma de pagamento do aporte ─────────────────────────────────────────
--
-- Mesma coluna e mesmo CHECK de `aportes_sangrias.forma_pagamento` (063).
-- Só aporte em ESPÉCIE é cédula na gaveta; aporte que entrou por pix ou
-- cartão não passa pelo caixa físico e não pode compor o saldo que o
-- operador vai contar no fechamento — somar tudo infla a custódia dele e
-- reaparece como valor de abertura do dia seguinte (bug real na
-- Comercialização, corrigido no commit fc34370).
--
-- DEFAULT 'especie' é o correto para o histórico: até hoje a Loja só tinha
-- aporte em dinheiro, então todas as linhas existentes são espécie de fato.
-- Não é suposição — não havia UI para registrar aporte de outra forma.
--
-- SANGRIA é sempre espécie (dinheiro saindo da gaveta) e ignora esta coluna.

ALTER TABLE loja_sangrias
  ADD COLUMN IF NOT EXISTS forma_pagamento text NOT NULL DEFAULT 'especie';

ALTER TABLE loja_sangrias
  DROP CONSTRAINT IF EXISTS loja_sangrias_forma_pagamento_check;

ALTER TABLE loja_sangrias
  ADD CONSTRAINT loja_sangrias_forma_pagamento_check
  CHECK (forma_pagamento IN ('especie', 'pix', 'cartao'));

COMMENT ON COLUMN loja_sangrias.forma_pagamento IS
  'Como o dinheiro do APORTE entrou: especie | pix | cartao. Só ''especie'' conta como cédula na gaveta e entra no saldo de responsabilidade do operador (ver getSaldoResponsabilidadeLoja). Sangria é sempre espécie e ignora esta coluna. Espelha aportes_sangrias.forma_pagamento (063).';

-- Leitura de continuidade filtra por caixa + tipo + forma.
CREATE INDEX IF NOT EXISTS idx_loja_sangrias_caixa_tipo
  ON loja_sangrias (caixa_id, tipo);

-- ============================================================================
-- Rollback (comentado):
-- DROP INDEX IF EXISTS idx_loja_sangrias_caixa_tipo;
-- ALTER TABLE loja_sangrias DROP CONSTRAINT IF EXISTS loja_sangrias_forma_pagamento_check;
-- ALTER TABLE loja_sangrias DROP COLUMN IF EXISTS forma_pagamento;
-- DROP INDEX IF EXISTS loja_caixas_unico_aberto_por_usuario;
