-- 064 — Corrige o saldo de produto do produtor (saldos_produto)
--
-- PROBLEMA
-- saldos_produto (saldo de produto por conta) era mantido por um trigger
-- INCREMENTAL que só disparava em AFTER INSERT em movimentacoes_conta
-- (fn_atualizar_saldos_conta, migration 025). Consequências:
--   - DELETE de movimentacoes_conta (ex.: correção via SQL) não recalculava
--     nada → o saldo ficava congelado no valor antigo.
--   - UPDATE também era ignorado.
--   - 'estorno' nunca era considerado no saldo de produto.
--
-- SOLUÇÃO
-- O trigger passa a RECALCULAR a linha afetada de saldos_produto a partir de
-- SUM(movimentacoes_conta), disparando em INSERT/UPDATE/DELETE. Isso é
-- idempotente: para contas mantidas só por INSERTs, o recomputo reproduz
-- exatamente o valor já armazenado (não perturba ninguém), e conserta as
-- linhas furadas por edição manual.
--
-- ESCOPO — só saldo de PRODUTO
-- saldos_produto não tem nenhum writer direto no código (só este trigger),
-- então recomputar é seguro. Já contas_produtor.saldo_financeiro é atualizado
-- direto fora de movimentacoes_conta (loja PDV/estorno em lib/loja/actions.ts),
-- então recomputá-lo apagaria esses ajustes. Por isso o saldo FINANCEIRO
-- mantém exatamente o comportamento incremental anterior (INSERT-only) e não é
-- tocado aqui.
--
-- Sinais (espelham a semântica incremental da 025, quantidade_produto é sempre
-- positivo e o tipo define o sinal):
--   entrega        → + quantidade_produto
--   conversao      → − quantidade_produto
--   ajuste_produto → − quantidade_produto
--   estorno        → − quantidade_produto   (novo; sem linhas hoje)
--
-- Rodar no SQL Editor do Supabase Dashboard (nunca npx supabase db push).

CREATE OR REPLACE FUNCTION fn_atualizar_saldos_conta()
RETURNS TRIGGER AS $$
DECLARE
  v_conta_id   uuid;
  v_produto_id uuid;
BEGIN
  -- ── SALDO DE PRODUTO: recomputo total da(s) linha(s) afetada(s) ──
  -- Cobre INSERT (NEW), DELETE (OLD) e UPDATE (ambos, inclusive troca de
  -- conta_id/produto_id). NULLs de NEW/OLD são filtrados.
  FOR v_conta_id, v_produto_id IN
    SELECT DISTINCT conta_id, produto_id
    FROM (
      SELECT NEW.conta_id AS conta_id, NEW.produto_id AS produto_id
      UNION ALL
      SELECT OLD.conta_id, OLD.produto_id
    ) t
    WHERE conta_id IS NOT NULL AND produto_id IS NOT NULL
  LOOP
    INSERT INTO saldos_produto (conta_id, produto_id, quantidade)
    VALUES (v_conta_id, v_produto_id, 0)
    ON CONFLICT (conta_id, produto_id) DO NOTHING;

    UPDATE saldos_produto sp
    SET quantidade = COALESCE((
      SELECT SUM(
        CASE mc.tipo
          WHEN 'entrega'        THEN  mc.quantidade_produto
          WHEN 'conversao'      THEN -mc.quantidade_produto
          WHEN 'ajuste_produto' THEN -mc.quantidade_produto
          WHEN 'estorno'        THEN -mc.quantidade_produto
          ELSE 0
        END
      )
      FROM movimentacoes_conta mc
      WHERE mc.conta_id = sp.conta_id
        AND mc.produto_id = sp.produto_id
    ), 0)
    WHERE sp.conta_id = v_conta_id
      AND sp.produto_id = v_produto_id;
  END LOOP;

  -- ── SALDO FINANCEIRO: incremental, só em INSERT (inalterado desde a 025) ──
  -- Não recomputamos: saldo_financeiro tem writers diretos fora de
  -- movimentacoes_conta (loja PDV/estorno), e um recomputo os apagaria.
  IF TG_OP = 'INSERT' THEN
    IF NEW.tipo = 'conversao' AND NEW.valor_financeiro IS NOT NULL THEN
      UPDATE contas_produtor
      SET saldo_financeiro = saldo_financeiro + NEW.valor_financeiro
      WHERE id = NEW.conta_id;
    END IF;

    IF NEW.tipo IN ('saque_especie','saque_pix','compra_loja') AND NEW.valor_financeiro IS NOT NULL THEN
      UPDATE contas_produtor
      SET saldo_financeiro = saldo_financeiro - ABS(NEW.valor_financeiro)
      WHERE id = NEW.conta_id;
    END IF;

    IF NEW.tipo = 'ajuste_financeiro' AND NEW.valor_financeiro IS NOT NULL THEN
      UPDATE contas_produtor
      SET saldo_financeiro = saldo_financeiro + NEW.valor_financeiro
      WHERE id = NEW.conta_id;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_atualizar_saldos_conta ON movimentacoes_conta;
CREATE TRIGGER trg_atualizar_saldos_conta
  AFTER INSERT OR UPDATE OR DELETE ON movimentacoes_conta
  FOR EACH ROW EXECUTE FUNCTION fn_atualizar_saldos_conta();

-- ── BACKFILL ──────────────────────────────────────────────────────────────
-- 1) Recalcula TODAS as linhas existentes de saldos_produto. O subquery
--    correlacionado com COALESCE(...,0) zera as linhas cujas movimentacoes
--    foram todas removidas — é o caso do produtor cujo saldo ficou preso.
UPDATE saldos_produto sp
SET quantidade = COALESCE((
  SELECT SUM(
    CASE mc.tipo
      WHEN 'entrega'        THEN  mc.quantidade_produto
      WHEN 'conversao'      THEN -mc.quantidade_produto
      WHEN 'ajuste_produto' THEN -mc.quantidade_produto
      WHEN 'estorno'        THEN -mc.quantidade_produto
      ELSE 0
    END
  )
  FROM movimentacoes_conta mc
  WHERE mc.conta_id = sp.conta_id
    AND mc.produto_id = sp.produto_id
), 0);

-- 2) Cria linhas que faltam (par conta/produto com movimentacao mas sem
--    saldos_produto) — completude; não afeta o caso relatado.
INSERT INTO saldos_produto (conta_id, produto_id, quantidade)
SELECT mc.conta_id, mc.produto_id,
  SUM(
    CASE mc.tipo
      WHEN 'entrega'        THEN  mc.quantidade_produto
      WHEN 'conversao'      THEN -mc.quantidade_produto
      WHEN 'ajuste_produto' THEN -mc.quantidade_produto
      WHEN 'estorno'        THEN -mc.quantidade_produto
      ELSE 0
    END
  )
FROM movimentacoes_conta mc
WHERE mc.produto_id IS NOT NULL
GROUP BY mc.conta_id, mc.produto_id
ON CONFLICT (conta_id, produto_id) DO NOTHING;

-- ── VERIFICAÇÃO (rodar após aplicar) ───────────────────────────────────────
-- Deve retornar 0 kg de Amêndoas secas para o Cristiano Dias dos Santos.
--   SELECT sp.quantidade, pr.nome AS produto
--   FROM saldos_produto sp
--   JOIN contas_produtor cp ON cp.id = sp.conta_id
--   JOIN produtos pr ON pr.id = sp.produto_id
--   WHERE cp.produtor_id = '6f78f629-060d-47ac-9324-aad862095c15';
