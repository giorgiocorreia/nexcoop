-- Migration 083: fix saldos_produtor_snapshot congelado desde a 052
-- Aplicar via: Supabase Dashboard → SQL Editor
-- Data: 2026-07-19
--
-- Continuação direta da 082 (docs/PLANO_RESULTADO_COMERCIALIZACAO.md +
-- divergência #1 no topo de 20260719000001_082_...sql) — mesmos padrões:
-- SET search_path = public, funções recalculam do zero, backfill de melhor
-- esforço documentado, rollback comentado no rodapé.
--
-- =============================================================================
-- DIAGNÓSTICO (confirmado com dados de produção da COOPAIBI, 18/07/2026)
-- =============================================================================
-- saldos_produtor_snapshot está congelado desde o backfill único da 052
-- (24/06/2026): toda linha com kg_convertido=0 e ultima_atualizacao=24/06,
-- enquanto movimentacoes_conta já registrou depois disso 25 entregas
-- (3.215,7 kg), 27 conversões (1.235,7 kg / R$ 25.862,12) e 3 ajuste_produto
-- (−161 kg).
--
-- Causa: o trigger trg_atualizar_saldos_produtor_snapshot (052) resolvia a
-- safra via `SELECT safra_id FROM lotes WHERE id = NEW.lote_id` — só
-- funcionava se a movimentação já nascesse com lote_id. Na prática:
--   - 'entrega' nasce SEM lote_id (o vínculo é feito depois, via UPDATE em
--     confirmarComposicaoLote, app/(sistema)/comercializacao/lotes/actions.ts)
--     — e o trigger só disparava em AFTER INSERT, não em UPDATE.
--   - 'conversao' NUNCA grava lote_id (registrarConversaoESaque não tem
--     esse vínculo — mesmo achado da divergência #1 da 082).
--   - 'ajuste_produto' idem — nunca teve lote_id.
-- Resultado: o snapshot nunca atualizou ao vivo desde a 052; só existe o
-- backfill único daquela migration, hoje obsoleto.
--
-- vw_resultado_comercializacao (082) lê esse snapshot para estoque_kg e
-- passivo_a_ordem_kg — ambos saem errados enquanto isso não for corrigido.
--
-- Solução (schema only, sem tocar em código da aplicação):
--   1. Generalizar a estampa de safra_id (082, só tipo='conversao') para
--      também cobrir 'entrega' e 'ajuste_produto' — mesma heurística (safra
--      'em_andamento' da org, congelada no INSERT).
--   2. Recriar fn_atualizar_saldos_produtor_snapshot para recalcular DO ZERO
--      por (org, produtor, produto, safra) a partir de movimentacoes_conta
--      usando safra_id estampado — sem depender de lote_id. AFTER
--      INSERT/UPDATE/DELETE (mesmo padrão de recálculo total já usado em
--      fn_atualizar_saldos_conta/064 e fn_recalc_custo_convertido/082).
--   3. Backfill completo: apaga e reconstrói o snapshot inteiro a partir da
--      ledger real.
-- =============================================================================


-- =============================================================================
-- BLOCO 1 — generaliza a estampa de safra_id (082 só cobria 'conversao')
-- =============================================================================
-- Decisão: renomear a função pra refletir o escopo maior (fn_estampar_safra_
-- conversao → fn_estampar_safra_movimentacao), dropando a antiga em vez de
-- só trocar o corpo — o nome antigo ficaria enganoso (não é mais "só
-- conversão"). Trigger recriado com o mesmo nome de tabela/evento, função
-- nova.

DROP TRIGGER IF EXISTS trg_estampar_safra_conversao ON movimentacoes_conta;
DROP FUNCTION IF EXISTS fn_estampar_safra_conversao();

CREATE OR REPLACE FUNCTION fn_estampar_safra_movimentacao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tipo IN ('conversao', 'entrega', 'ajuste_produto') AND NEW.safra_id IS NULL THEN
    SELECT id INTO NEW.safra_id
    FROM safras
    WHERE organizacao_id = NEW.organizacao_id
      AND status = 'em_andamento'
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_estampar_safra_movimentacao
  BEFORE INSERT ON movimentacoes_conta
  FOR EACH ROW EXECUTE FUNCTION fn_estampar_safra_movimentacao();

-- Backfill — melhor esforço (mesma ressalva da 082: se a org já girou mais
-- de uma safra desde que começou a operar, isso pode atribuir movimentações
-- antigas à safra errada. Hoje só existe a safra 2026 na COOPAIBI —
-- confirmado com o Giorgio — então é inofensivo agora; ver query de
-- sanidade no rodapé antes de confiar no número numa org com histórico
-- multi-safra).
UPDATE movimentacoes_conta mc
SET safra_id = sf.id
FROM safras sf
WHERE mc.tipo IN ('entrega', 'ajuste_produto')
  AND mc.safra_id IS NULL
  AND sf.organizacao_id = mc.organizacao_id
  AND sf.status = 'em_andamento';


-- =============================================================================
-- BLOCO 2 — recria fn_atualizar_saldos_produtor_snapshot: recálculo do zero,
-- sem depender de lote_id
-- =============================================================================
-- Semântica (ver docs/SCHEMA.md e comentário desta migration para a
-- investigação que embasou cada ponto):
--   kg_entregue         = SUM(quantidade_produto) WHERE tipo IN ('entrega','ajuste_produto')
--   kg_convertido       = SUM(quantidade_produto) WHERE tipo = 'conversao'
--   valor_convertido_rs = SUM(valor_financeiro)   WHERE tipo = 'conversao'
--
-- Investigação (pontos (a)-(d) do escopo):
--   (a) Colunas confirmadas em types/database.ts (MovimentacaoConta):
--       conta_id, produto_id, quantidade_produto, valor_financeiro, tipo,
--       organizacao_id, safra_id — todas existem como descrito.
--   (b) produtor_id resolvido via conta_id → contas_produtor.produtor_id
--       (mesmo join usado no trigger original da 052 e em
--       lib/comercializacao/cacau-a-ordem.ts).
--   (c) 'ajuste_produto' é lançamento LÍQUIDO — quantidade_produto já vem com
--       o sinal correto (positivo ou negativo), diferente do saldo de
--       PRODUTO (saldos_produto, tabela distinta, mantida por
--       fn_atualizar_saldos_conta/064) onde o trigger aplica um sinal fixo
--       por tipo. Aqui somamos quantidade_produto direto, sem inverter sinal
--       — é o que faz "3.215,7 − 161 = 3.054,7 kg entregue" bater no
--       diagnóstico. 'estorno' fica FORA da soma: não há hoje, no código, um
--       único INSERT de tipo='estorno' vinculado a produto_id de cacau (o
--       único emissor observado é lib/loja/actions.ts, outro domínio — mesmo
--       achado documentado no BLOCO 4 da 082). Risco residual registrado:
--       se um dia existir estorno de conversão/entrega de cacau, revisar
--       esta função (mesmo aviso da 082 pro trigger de custo_convertido).
--   (d) saldo_kg é GENERATED ALWAYS AS (kg_entregue - kg_convertido) STORED
--       desde a criação da tabela (052) — a função abaixo NUNCA escreve
--       nela, só em kg_entregue/kg_convertido/valor_convertido_rs.
--
-- Linhas que zeram (produtor sem nenhuma movimentação relevante pro combo
-- org/produtor/produto/safra, ex.: todas as movimentações foram apagadas)
-- são DELETADAS em vez de mantidas com zero — evita lixo permanente de
-- combos que não existem mais na ledger (mesmo espírito do "remover linhas
-- que não correspondem mais a movimentação nenhuma" pedido no backfill).

CREATE OR REPLACE FUNCTION fn_recalc_saldo_produtor(
  p_org_id      uuid,
  p_produtor_id uuid,
  p_produto_id  uuid,
  p_safra_id    uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_kg_entregue   numeric(12,3);
  v_kg_convertido numeric(12,3);
  v_valor         numeric(14,2);
BEGIN
  IF p_produtor_id IS NULL OR p_produto_id IS NULL OR p_safra_id IS NULL THEN
    RETURN;
  END IF;

  SELECT
    COALESCE(SUM(CASE WHEN mc.tipo IN ('entrega', 'ajuste_produto') THEN mc.quantidade_produto ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN mc.tipo = 'conversao' THEN mc.quantidade_produto ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN mc.tipo = 'conversao' THEN mc.valor_financeiro ELSE 0 END), 0)
  INTO v_kg_entregue, v_kg_convertido, v_valor
  FROM movimentacoes_conta mc
  JOIN contas_produtor cp ON cp.id = mc.conta_id
  WHERE mc.organizacao_id = p_org_id
    AND cp.produtor_id    = p_produtor_id
    AND mc.produto_id     = p_produto_id
    AND mc.safra_id       = p_safra_id
    AND mc.tipo IN ('entrega', 'conversao', 'ajuste_produto');

  IF v_kg_entregue = 0 AND v_kg_convertido = 0 AND v_valor = 0 THEN
    DELETE FROM saldos_produtor_snapshot
    WHERE organizacao_id = p_org_id
      AND produtor_id    = p_produtor_id
      AND produto_id     = p_produto_id
      AND safra_id       = p_safra_id;
    RETURN;
  END IF;

  INSERT INTO saldos_produtor_snapshot
    (organizacao_id, produtor_id, produto_id, safra_id,
     kg_entregue, kg_convertido, valor_convertido_rs)
  VALUES
    (p_org_id, p_produtor_id, p_produto_id, p_safra_id,
     v_kg_entregue, v_kg_convertido, v_valor)
  ON CONFLICT (organizacao_id, produtor_id, produto_id, safra_id) DO UPDATE SET
    kg_entregue          = EXCLUDED.kg_entregue,
    kg_convertido        = EXCLUDED.kg_convertido,
    valor_convertido_rs  = EXCLUDED.valor_convertido_rs,
    ultima_atualizacao   = now();
END;
$$;

CREATE OR REPLACE FUNCTION fn_atualizar_saldos_produtor_snapshot()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_produtor_old uuid;
  v_produtor_new uuid;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    SELECT produtor_id INTO v_produtor_old
    FROM contas_produtor WHERE id = OLD.conta_id;

    PERFORM fn_recalc_saldo_produtor(OLD.organizacao_id, v_produtor_old, OLD.produto_id, OLD.safra_id);
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    SELECT produtor_id INTO v_produtor_new
    FROM contas_produtor WHERE id = NEW.conta_id;

    PERFORM fn_recalc_saldo_produtor(NEW.organizacao_id, v_produtor_new, NEW.produto_id, NEW.safra_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_atualizar_saldos_produtor_snapshot ON movimentacoes_conta;
CREATE TRIGGER trg_atualizar_saldos_produtor_snapshot
  AFTER INSERT OR UPDATE OR DELETE ON movimentacoes_conta
  FOR EACH ROW EXECUTE FUNCTION fn_atualizar_saldos_produtor_snapshot();

-- Convivência com os outros dois triggers já existentes nesta tabela:
--   - trg_estampar_safra_movimentacao (BEFORE INSERT, BLOCO 1 acima) — roda
--     antes, garante que NEW.safra_id já está resolvido quando este trigger
--     AFTER lê a linha.
--   - trg_atualizar_custo_convertido (AFTER, 082) — escreve em
--     resultado_safra_snapshot, tabela diferente, sem dependência de ordem.


-- =============================================================================
-- BLOCO 3 — backfill completo: apaga e reconstrói saldos_produtor_snapshot
-- =============================================================================
-- Decisão: DELETE + reinserção total (não upsert incremental) — mais simples
-- e garante que combos (org, produtor, produto, safra) do backfill obsoleto
-- da 052 que não têm mais nenhuma movimentação de tipo relevante somem
-- (não existe FK apontando para saldos_produtor_snapshot.id — verificado:
-- nenhuma migration cria REFERENCES para esta tabela).
-- HAVING descarta combos cuja soma líquida é zero (mesmo critério do DELETE
-- dentro de fn_recalc_saldo_produtor).

DELETE FROM saldos_produtor_snapshot;

INSERT INTO saldos_produtor_snapshot
  (organizacao_id, produtor_id, produto_id, safra_id,
   kg_entregue, kg_convertido, valor_convertido_rs)
SELECT
  mc.organizacao_id,
  cp.produtor_id,
  mc.produto_id,
  mc.safra_id,
  COALESCE(SUM(CASE WHEN mc.tipo IN ('entrega', 'ajuste_produto') THEN mc.quantidade_produto ELSE 0 END), 0),
  COALESCE(SUM(CASE WHEN mc.tipo = 'conversao' THEN mc.quantidade_produto ELSE 0 END), 0),
  COALESCE(SUM(CASE WHEN mc.tipo = 'conversao' THEN mc.valor_financeiro ELSE 0 END), 0)
FROM movimentacoes_conta mc
JOIN contas_produtor cp ON cp.id = mc.conta_id
WHERE mc.tipo IN ('entrega', 'conversao', 'ajuste_produto')
  AND mc.produto_id IS NOT NULL
  AND mc.safra_id IS NOT NULL
GROUP BY mc.organizacao_id, cp.produtor_id, mc.produto_id, mc.safra_id
HAVING
  COALESCE(SUM(CASE WHEN mc.tipo IN ('entrega', 'ajuste_produto') THEN mc.quantidade_produto ELSE 0 END), 0) != 0
  OR COALESCE(SUM(CASE WHEN mc.tipo = 'conversao' THEN mc.quantidade_produto ELSE 0 END), 0) != 0
  OR COALESCE(SUM(CASE WHEN mc.tipo = 'conversao' THEN mc.valor_financeiro ELSE 0 END), 0) != 0;


-- =============================================================================
-- SANIDADE PÓS-BACKFILL (rodar após aplicar — não faz parte da migration)
-- =============================================================================
-- Compara o snapshot reconstruído com o agregado direto de movimentacoes_conta.
-- Deve retornar diferença 0 (ou muito próxima de 0 por arredondamento) para
-- toda linha. Na COOPAIBI, produto Amêndoas, espera-se aproximadamente:
--   kg_entregue total   = 3.215,700 − 161,000 = 3.054,700
--   kg_convertido total = 1.235,700
--   valor_convertido_rs = 25.862,12
--
-- SELECT
--   sp.organizacao_id, sp.produto_id, sp.safra_id,
--   sp.kg_entregue, sp.kg_convertido, sp.valor_convertido_rs,
--   agg.kg_entregue_real, agg.kg_convertido_real, agg.valor_convertido_real,
--   (sp.kg_entregue - agg.kg_entregue_real)             AS diff_kg_entregue,
--   (sp.kg_convertido - agg.kg_convertido_real)         AS diff_kg_convertido,
--   (sp.valor_convertido_rs - agg.valor_convertido_real) AS diff_valor
-- FROM saldos_produtor_snapshot sp
-- JOIN (
--   SELECT
--     mc.organizacao_id, cp.produtor_id, mc.produto_id, mc.safra_id,
--     COALESCE(SUM(CASE WHEN mc.tipo IN ('entrega','ajuste_produto') THEN mc.quantidade_produto ELSE 0 END), 0) AS kg_entregue_real,
--     COALESCE(SUM(CASE WHEN mc.tipo = 'conversao' THEN mc.quantidade_produto ELSE 0 END), 0) AS kg_convertido_real,
--     COALESCE(SUM(CASE WHEN mc.tipo = 'conversao' THEN mc.valor_financeiro ELSE 0 END), 0) AS valor_convertido_real
--   FROM movimentacoes_conta mc
--   JOIN contas_produtor cp ON cp.id = mc.conta_id
--   WHERE mc.tipo IN ('entrega','conversao','ajuste_produto')
--     AND mc.produto_id IS NOT NULL AND mc.safra_id IS NOT NULL
--   GROUP BY mc.organizacao_id, cp.produtor_id, mc.produto_id, mc.safra_id
-- ) agg ON agg.organizacao_id = sp.organizacao_id
--      AND agg.produtor_id    = sp.produtor_id
--      AND agg.produto_id     = sp.produto_id
--      AND agg.safra_id       = sp.safra_id
-- WHERE sp.kg_entregue <> agg.kg_entregue_real
--    OR sp.kg_convertido <> agg.kg_convertido_real
--    OR sp.valor_convertido_rs <> agg.valor_convertido_real;
--
-- Totais agregados por produto (conferir contra o extrato real da COOPAIBI):
--
-- SELECT pr.nome AS produto,
--        SUM(sp.kg_entregue)         AS kg_entregue_total,
--        SUM(sp.kg_convertido)       AS kg_convertido_total,
--        SUM(sp.valor_convertido_rs) AS valor_convertido_total
-- FROM saldos_produtor_snapshot sp
-- JOIN produtos pr ON pr.id = sp.produto_id
-- WHERE sp.organizacao_id = '3ad97dc2-f87f-4e67-950e-387854d5bccc' -- COOPAIBI
-- GROUP BY pr.nome;


-- =============================================================================
-- Rollback (comentado):
-- =============================================================================
-- DROP TRIGGER IF EXISTS trg_atualizar_saldos_produtor_snapshot ON movimentacoes_conta;
-- DROP FUNCTION IF EXISTS fn_atualizar_saldos_produtor_snapshot();
-- DROP FUNCTION IF EXISTS fn_recalc_saldo_produtor(uuid, uuid, uuid, uuid);
-- DROP TRIGGER IF EXISTS trg_estampar_safra_movimentacao ON movimentacoes_conta;
-- DROP FUNCTION IF EXISTS fn_estampar_safra_movimentacao();
-- Reverter fn_atualizar_saldos_produtor_snapshot e o trigger
-- trg_estampar_safra_conversao para a versão da 052/082
-- (supabase/migrations/20260624000001_052_resultado_safra_schema.sql e
-- 20260719000001_082_resultado_comercializacao_realizado_marcacao.sql) se
-- precisar desfazer o recálculo do zero. Não há como reverter o backfill
-- (DELETE + reinserção) sem um dump prévio da tabela — tirar backup antes de
-- aplicar esta migration em produção se quiser rollback de dados garantido.
