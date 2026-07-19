-- Migration 082: Resultado da Comercialização — realizado + marcação a mercado
-- Aplicar via: Supabase Dashboard → SQL Editor
-- Data: 2026-07-19
--
-- Fonte da verdade: docs/PLANO_RESULTADO_COMERCIALIZACAO.md
--
-- O que faz:
--   1. resultado_safra_snapshot: +kg_convertido, +custo_convertido_rs,
--      +lucro_realizado_rs (GENERATED — fórmula do REALIZADO)
--   2. organizacoes: +aliquota_funrural (parametriza o hardcoded 0.0163)
--   3. movimentacoes_conta: +safra_id (NOVO — ver divergência #1 abaixo) +
--      trigger que estampa a safra ativa da org nas movimentações tipo='conversao'
--   4. Trigger novo trg_atualizar_custo_convertido (movimentacoes_conta,
--      tipo='conversao') — recalcula do zero kg_convertido/custo_convertido_rs
--   5. fn_atualizar_resultado_safra_snapshot: restaura rateio multi-produto
--      (fator = peso do item ÷ peso do lote, elimina o LIMIT 1 da 055/068),
--      lê FUNRURAL de organizacoes.aliquota_funrural, preserva os filtros
--      NULL-safe de status_nfe da 068
--   6. View vw_resultado_comercializacao (realizado + marcação a mercado na leitura)
--
-- =============================================================================
-- DIVERGÊNCIA #1 (a mais importante) — movimentacoes_conta não tem safra_id
-- =============================================================================
-- O plano presumia que o trigger de conversão poderia resolver a safra do
-- mesmo jeito que o trigger de vendas (via lote_id do lote afetado). Na
-- prática, `registrarConversaoESaque` (lib/comercializacao/caixa.actions.ts)
-- NUNCA grava lote_id — conversão é só (conta_id, produto_id, quantidade,
-- valor), sem vínculo com lote/safra. E `registrarEntrega` também insere sem
-- lote_id (o vínculo é feito depois, via UPDATE em confirmarComposicaoLote,
-- app/(sistema)/comercializacao/lotes/actions.ts) — por isso o trigger
-- trg_atualizar_saldos_produtor_snapshot (052), que também depende de
-- NEW.lote_id no INSERT, já não atualiza kg_convertido/valor_convertido_rs em
-- saldos_produtor_snapshot ao vivo hoje (só via backfill único da 052;
-- confirmado pelo comentário em lib/comercializacao/cacau-a-ordem.ts:
-- "saldos_produtor_snapshot... estão desatualizadas").
--
-- Solução adotada (só no schema, sem tocar em código da aplicação):
--   - Nova coluna movimentacoes_conta.safra_id (nullable, FK safras)
--   - Trigger BEFORE INSERT trg_estampar_safra_conversao: quando tipo='conversao'
--     e safra_id não foi informado, estampa a safra com status='em_andamento'
--     da organização (mesma regra já usada em getSafraAtiva(),
--     lib/comercializacao/safras.actions.ts — a aplicação já garante no
--     código que só existe 1 safra 'em_andamento' por org por vez).
--   - Backfill: linhas de conversão existentes recebem a safra 'em_andamento'
--     atual da própria org (melhor esforço — ver risco (a) do plano, seção 5:
--     "conversões antigas sem cotacao_id/valor consistente — auditar antes
--     do backfill". Se a COOPAIBI girou mais de uma safra desde que começou a
--     converter cacau, esse backfill pode atribuir conversões antigas à safra
--     errada. Recomendo conferir kg_convertido resultante contra o extrato
--     real antes de confiar no número — passo 2 da seção 5 do plano).
--   - Ficando a safra estampada no INSERT (congelada na própria linha), o
--     recálculo em DELETE/UPDATE usa sempre o valor histórico correto — não
--     há o problema de "qual safra estava ativa quando isso foi criado".
--
-- Risco residual aceito: se um dia a org girar 2 safras em paralelo (hoje o
-- código não permite — safras.actions.ts sempre encerra a anterior antes de
-- promover uma nova), essa heurística para de valer. Registrado para revisão
-- futura caso o modelo de safra mude.
-- =============================================================================


-- =============================================================================
-- BLOCO 1 — resultado_safra_snapshot: ponta de custo real (REALIZADO)
-- =============================================================================

ALTER TABLE resultado_safra_snapshot
  ADD COLUMN IF NOT EXISTS kg_convertido       numeric(12,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS custo_convertido_rs numeric(14,2) NOT NULL DEFAULT 0;

-- lucro_realizado_rs = LEAST(kg_vendido, kg_convertido)
--   × (receita_liquida_media_por_kg − custo_medio_convertido_por_kg)
-- receita_liquida_media = (receita_bruta_rs − taxa_cooperativa_rs − funrural_rs) / total_kg_vendido
-- custo_medio_convertido = custo_convertido_rs / kg_convertido
-- Protegido contra divisão por zero: 0 quando total_kg_vendido = 0 OU kg_convertido = 0.
ALTER TABLE resultado_safra_snapshot
  ADD COLUMN IF NOT EXISTS lucro_realizado_rs numeric(14,2) GENERATED ALWAYS AS (
    CASE
      WHEN total_kg_vendido > 0 AND kg_convertido > 0 THEN
        LEAST(total_kg_vendido, kg_convertido) * (
          ((receita_bruta_rs - taxa_cooperativa_rs - funrural_rs) / NULLIF(total_kg_vendido, 0))
          - (custo_convertido_rs / NULLIF(kg_convertido, 0))
        )
      ELSE 0
    END
  ) STORED;

-- custo_aquisicao_rs / resultado_liquido_rs (GENERATED sobre ela) são mantidos
-- por transição com a tela antiga — NÃO removidos nesta migration. Deprecated,
-- ver docs/SCHEMA.md e migration futura de limpeza (seção 5.4 do plano).


-- =============================================================================
-- BLOCO 2 — organizacoes.aliquota_funrural (parametriza o hardcoded 0.0163)
-- =============================================================================

ALTER TABLE organizacoes
  ADD COLUMN IF NOT EXISTS aliquota_funrural numeric(6,4) NOT NULL DEFAULT 0.0163;


-- =============================================================================
-- BLOCO 3 — movimentacoes_conta.safra_id + estampa automática em conversões
-- (ver DIVERGÊNCIA #1 no cabeçalho desta migration)
-- =============================================================================

ALTER TABLE movimentacoes_conta
  ADD COLUMN IF NOT EXISTS safra_id uuid REFERENCES safras(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_movimentacoes_conta_safra_conversao
  ON movimentacoes_conta (organizacao_id, safra_id, produto_id)
  WHERE tipo = 'conversao';

CREATE OR REPLACE FUNCTION fn_estampar_safra_conversao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tipo = 'conversao' AND NEW.safra_id IS NULL THEN
    SELECT id INTO NEW.safra_id
    FROM safras
    WHERE organizacao_id = NEW.organizacao_id
      AND status = 'em_andamento'
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_estampar_safra_conversao ON movimentacoes_conta;
CREATE TRIGGER trg_estampar_safra_conversao
  BEFORE INSERT ON movimentacoes_conta
  FOR EACH ROW EXECUTE FUNCTION fn_estampar_safra_conversao();

-- Backfill — melhor esforço (ver ressalva na DIVERGÊNCIA #1): conversões já
-- existentes recebem a safra 'em_andamento' atual da própria org.
UPDATE movimentacoes_conta mc
SET safra_id = sf.id
FROM safras sf
WHERE mc.tipo = 'conversao'
  AND mc.safra_id IS NULL
  AND sf.organizacao_id = mc.organizacao_id
  AND sf.status = 'em_andamento';


-- =============================================================================
-- BLOCO 4 — trigger trg_atualizar_custo_convertido (movimentacoes_conta, tipo='conversao')
-- =============================================================================
-- Recalcula do zero, para (org, safra, produto), kg_convertido e
-- custo_convertido_rs a partir de SUM(quantidade_produto) e SUM(valor_financeiro)
-- das movimentações tipo='conversao'. Convive com trg_atualizar_saldos_produtor_snapshot
-- (já existente nesta tabela) — escrevem em tabelas diferentes, sem dependência
-- de ordem de disparo.
--
-- Fora de escopo desta migration (ver plano, nota da seção 3.2): estornos de
-- conversão. Não há hoje, no código, nenhum INSERT de tipo='estorno' vinculado
-- a produto_id de cacau (o único uso observado de 'estorno' é em
-- lib/loja/actions.ts, estorno de venda da Loja Agropecuária — outro domínio).
-- Se um dia existir estorno de conversão de cacau, revisar este trigger.

CREATE OR REPLACE FUNCTION fn_recalc_custo_convertido(
  p_org_id     uuid,
  p_safra_id   uuid,
  p_produto_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_kg    numeric(12,3);
  v_custo numeric(14,2);
BEGIN
  IF p_safra_id IS NULL OR p_produto_id IS NULL THEN
    RETURN;
  END IF;

  SELECT COALESCE(SUM(quantidade_produto), 0), COALESCE(SUM(valor_financeiro), 0)
  INTO v_kg, v_custo
  FROM movimentacoes_conta
  WHERE tipo = 'conversao'
    AND organizacao_id = p_org_id
    AND safra_id        = p_safra_id
    AND produto_id       = p_produto_id;

  INSERT INTO resultado_safra_snapshot (organizacao_id, safra_id, produto_id, kg_convertido, custo_convertido_rs)
  VALUES (p_org_id, p_safra_id, p_produto_id, v_kg, v_custo)
  ON CONFLICT (organizacao_id, safra_id, produto_id) DO UPDATE SET
    kg_convertido        = EXCLUDED.kg_convertido,
    custo_convertido_rs  = EXCLUDED.custo_convertido_rs,
    ultima_atualizacao   = now();
END;
$$;

CREATE OR REPLACE FUNCTION fn_atualizar_custo_convertido()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.tipo = 'conversao' THEN
      PERFORM fn_recalc_custo_convertido(OLD.organizacao_id, OLD.safra_id, OLD.produto_id);
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.tipo = 'conversao' THEN
      PERFORM fn_recalc_custo_convertido(NEW.organizacao_id, NEW.safra_id, NEW.produto_id);
    END IF;
    RETURN NEW;
  END IF;

  -- TG_OP = 'UPDATE'
  IF NEW.tipo = 'conversao' THEN
    PERFORM fn_recalc_custo_convertido(NEW.organizacao_id, NEW.safra_id, NEW.produto_id);
  END IF;

  -- Se a linha era 'conversao' e mudou de org/safra/produto/tipo, recalcula
  -- também o alvo antigo (senão ele fica com um valor obsoleto pra sempre).
  IF OLD.tipo = 'conversao' AND (
       OLD.organizacao_id IS DISTINCT FROM NEW.organizacao_id
    OR OLD.safra_id       IS DISTINCT FROM NEW.safra_id
    OR OLD.produto_id     IS DISTINCT FROM NEW.produto_id
    OR OLD.tipo           IS DISTINCT FROM NEW.tipo
  ) THEN
    PERFORM fn_recalc_custo_convertido(OLD.organizacao_id, OLD.safra_id, OLD.produto_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_atualizar_custo_convertido ON movimentacoes_conta;
CREATE TRIGGER trg_atualizar_custo_convertido
  AFTER INSERT OR UPDATE OR DELETE ON movimentacoes_conta
  FOR EACH ROW EXECUTE FUNCTION fn_atualizar_custo_convertido();

-- Backfill inicial: dispara o recálculo pra todo (org, safra, produto) que já
-- tem conversão com safra_id resolvido (estampado no BLOCO 3 acima).
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT DISTINCT organizacao_id, safra_id, produto_id
    FROM movimentacoes_conta
    WHERE tipo = 'conversao' AND safra_id IS NOT NULL AND produto_id IS NOT NULL
  LOOP
    PERFORM fn_recalc_custo_convertido(r.organizacao_id, r.safra_id, r.produto_id);
  END LOOP;
END;
$$;


-- =============================================================================
-- BLOCO 5 — fix fn_atualizar_resultado_safra_snapshot: rateio multi-produto +
-- FUNRURAL parametrizado (mantém os filtros NULL-safe de status_nfe da 068)
-- =============================================================================
-- Parte da versão mais recente no repo (068 — a 078 só fixou search_path, sem
-- mudar o corpo). Restaura o rateio proporcional por lote_itens (fator = peso
-- do item ÷ peso do lote, como na 052 original) tanto pra receita/taxa/funrural/
-- kg_vendido (vendas_externas) quanto pra custo_aquisicao_rs (notas_entrega) —
-- eliminando o `LIMIT 1` que jogava tudo no primeiro produto do lote em lotes
-- multi-produto. Importante: este bloco NÃO toca em kg_convertido/
-- custo_convertido_rs — essas colunas são propriedade exclusiva do trigger do
-- BLOCO 4 (cada trigger atualiza só as suas colunas no ON CONFLICT DO UPDATE).

CREATE OR REPLACE FUNCTION fn_atualizar_resultado_safra_snapshot()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_safra_id   uuid;
  v_org_id     uuid;
  v_lote_id    uuid;
  v_aliquota   numeric(6,4);
  v_produto_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_safra_id := OLD.safra_id;
    v_org_id   := OLD.organizacao_id;
    v_lote_id  := OLD.lote_id;
  ELSE
    v_safra_id := NEW.safra_id;
    v_org_id   := NEW.organizacao_id;
    v_lote_id  := NEW.lote_id;
  END IF;

  IF v_safra_id IS NULL OR v_lote_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT COALESCE(aliquota_funrural, 0.0163) INTO v_aliquota
  FROM organizacoes WHERE id = v_org_id;

  -- Um produto por iteração — cobre lote mono-produto (fator = 1) e
  -- multi-produto (fator = peso do item ÷ peso do lote) igualmente.
  FOR v_produto_id IN (
    SELECT produto_id FROM lote_itens WHERE lote_id = v_lote_id
  ) LOOP
    INSERT INTO resultado_safra_snapshot (
      organizacao_id, safra_id, produto_id,
      receita_bruta_rs, custo_aquisicao_rs, taxa_cooperativa_rs,
      funrural_rs, total_kg_vendido
    )
    SELECT
      v_org_id,
      v_safra_id,
      v_produto_id,
      COALESCE(SUM(
        CASE WHEN (ve.tipo_documento = 'transferencia_interna' OR ve.status_nfe IS NOT NULL)
              AND COALESCE(ve.status_nfe, '') NOT IN ('cancelada','devolvida')
          THEN ROUND(ve.valor_bruto * COALESCE(li.peso_kg / NULLIF(l.peso_total_kg, 0), 1.0), 2)
          ELSE 0 END
      ), 0),
      COALESCE((
        SELECT SUM(ne.valor_total * COALESCE(li2.peso_kg / NULLIF(l2.peso_total_kg, 0), 1.0))
        FROM notas_entrega ne
        JOIN movimentacoes_conta mc ON mc.id = ne.movimentacao_id
        JOIN lotes l2 ON l2.id = mc.lote_id
        JOIN lote_itens li2 ON li2.lote_id = l2.id AND li2.produto_id = v_produto_id
        WHERE l2.organizacao_id = v_org_id
          AND l2.safra_id       = v_safra_id
          AND ne.status         = 'autorizada'
      ), 0),
      COALESCE(SUM(
        CASE WHEN (ve.tipo_documento = 'transferencia_interna' OR ve.status_nfe IS NOT NULL)
              AND COALESCE(ve.status_nfe, '') NOT IN ('cancelada','devolvida')
          THEN ROUND(COALESCE(ve.valor_taxa, 0) * COALESCE(li.peso_kg / NULLIF(l.peso_total_kg, 0), 1.0), 2)
          ELSE 0 END
      ), 0),
      COALESCE(SUM(
        CASE WHEN (ve.tipo_documento = 'transferencia_interna' OR ve.status_nfe IS NOT NULL)
              AND COALESCE(ve.status_nfe, '') NOT IN ('cancelada','devolvida')
          THEN ROUND(ve.valor_bruto * COALESCE(li.peso_kg / NULLIF(l.peso_total_kg, 0), 1.0) * v_aliquota, 2)
          ELSE 0 END
      ), 0),
      COALESCE(SUM(
        CASE WHEN (ve.tipo_documento = 'transferencia_interna' OR ve.status_nfe IS NOT NULL)
              AND COALESCE(ve.status_nfe, '') NOT IN ('cancelada','devolvida')
          THEN ROUND(ve.quantidade_kg * COALESCE(li.peso_kg / NULLIF(l.peso_total_kg, 0), 1.0), 3)
          ELSE 0 END
      ), 0)
    FROM vendas_externas ve
    JOIN lotes l       ON l.id  = ve.lote_id
    JOIN lote_itens li ON li.lote_id = ve.lote_id AND li.produto_id = v_produto_id
    WHERE ve.organizacao_id = v_org_id
      AND ve.safra_id       = v_safra_id
    ON CONFLICT (organizacao_id, safra_id, produto_id) DO UPDATE SET
      receita_bruta_rs    = EXCLUDED.receita_bruta_rs,
      custo_aquisicao_rs  = EXCLUDED.custo_aquisicao_rs,
      taxa_cooperativa_rs = EXCLUDED.taxa_cooperativa_rs,
      funrural_rs         = EXCLUDED.funrural_rs,
      total_kg_vendido    = EXCLUDED.total_kg_vendido,
      ultima_atualizacao  = now();
  END LOOP;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Recalcula o histórico inteiro de vendas com a fórmula nova (rateio +
-- FUNRURAL por org). valor_bruto é GENERATED — o toque usa observacoes
-- (nullable, sem efeito colateral), mesmo truque da migration 068.
UPDATE vendas_externas
SET observacoes = observacoes;


-- =============================================================================
-- BLOCO 6 — view vw_resultado_comercializacao (marcação a mercado na leitura)
-- =============================================================================
-- Marcação NÃO é armazenada: reprecifica a cada consulta a partir da cotação
-- vigente. security_invoker = on (lição da migration 075) — roda com
-- privilégios/RLS de quem consulta, não do dono.

CREATE OR REPLACE VIEW vw_resultado_comercializacao
WITH (security_invoker = on)
AS
SELECT
  r.id,
  r.organizacao_id,
  r.safra_id,
  r.produto_id,
  r.receita_bruta_rs,
  r.taxa_cooperativa_rs,
  r.funrural_rs,
  r.total_kg_vendido,
  r.kg_convertido,
  r.custo_convertido_rs,
  r.lucro_realizado_rs,
  r.custo_aquisicao_rs,     -- deprecated (transição — ver docs/SCHEMA.md)
  r.resultado_liquido_rs,   -- deprecated (transição — ver docs/SCHEMA.md)
  r.preco_medio_kg,
  COALESCE(sp.kg_entregue_total, 0)                       AS kg_entregue_total,
  COALESCE(sp.saldo_kg_total, 0)                          AS passivo_a_ordem_kg,
  COALESCE(sp.kg_entregue_total, 0) - r.total_kg_vendido  AS estoque_kg,
  cot.preco_cooperado                                      AS cotacao_preco_cooperado,
  cot.vigente_a_partir_de                                  AS cotacao_vigente_a_partir_de,
  (
    (COALESCE(sp.kg_entregue_total, 0) - r.total_kg_vendido) * COALESCE(cot.preco_cooperado, 0)
    - COALESCE(sp.saldo_kg_total, 0) * COALESCE(cot.preco_cooperado, 0)
  ) AS ajuste_mercado_rs,
  r.lucro_realizado_rs + (
    (COALESCE(sp.kg_entregue_total, 0) - r.total_kg_vendido) * COALESCE(cot.preco_cooperado, 0)
    - COALESCE(sp.saldo_kg_total, 0) * COALESCE(cot.preco_cooperado, 0)
  ) AS lucro_corrente_rs,
  GREATEST(r.total_kg_vendido - r.kg_convertido, 0)        AS exposicao_kg,
  r.ultima_atualizacao,
  pr.nome    AS produto_nome,
  pr.unidade AS produto_unidade,
  sf.descricao AS safra_descricao,
  sf.ano       AS safra_ano
FROM resultado_safra_snapshot r
JOIN produtos pr ON pr.id = r.produto_id
JOIN safras   sf ON sf.id = r.safra_id
LEFT JOIN (
  SELECT organizacao_id, safra_id, produto_id,
         SUM(kg_entregue) AS kg_entregue_total,
         SUM(saldo_kg)    AS saldo_kg_total
  FROM saldos_produtor_snapshot
  GROUP BY organizacao_id, safra_id, produto_id
) sp ON sp.organizacao_id = r.organizacao_id
    AND sp.safra_id       = r.safra_id
    AND sp.produto_id     = r.produto_id
LEFT JOIN LATERAL (
  SELECT c.preco_cooperado, c.vigente_a_partir_de
  FROM cotacoes c
  WHERE c.organizacao_id      = r.organizacao_id
    AND c.produto_id          = r.produto_id
    AND c.vigente_a_partir_de <= now()
  ORDER BY c.vigente_a_partir_de DESC
  LIMIT 1
) cot ON true;


-- =============================================================================
-- Rollback (comentado):
-- =============================================================================
-- DROP VIEW IF EXISTS vw_resultado_comercializacao;
-- DROP TRIGGER IF EXISTS trg_atualizar_custo_convertido ON movimentacoes_conta;
-- DROP FUNCTION IF EXISTS fn_atualizar_custo_convertido();
-- DROP FUNCTION IF EXISTS fn_recalc_custo_convertido(uuid, uuid, uuid);
-- DROP TRIGGER IF EXISTS trg_estampar_safra_conversao ON movimentacoes_conta;
-- DROP FUNCTION IF EXISTS fn_estampar_safra_conversao();
-- ALTER TABLE movimentacoes_conta DROP COLUMN IF EXISTS safra_id;
-- ALTER TABLE organizacoes DROP COLUMN IF EXISTS aliquota_funrural;
-- ALTER TABLE resultado_safra_snapshot DROP COLUMN IF EXISTS lucro_realizado_rs;
-- ALTER TABLE resultado_safra_snapshot DROP COLUMN IF EXISTS kg_convertido;
-- ALTER TABLE resultado_safra_snapshot DROP COLUMN IF EXISTS custo_convertido_rs;
-- Reverter fn_atualizar_resultado_safra_snapshot para a versão da 068
-- (supabase/migrations/20260716000002_068_fix_snapshot_transferencia_interna.sql)
-- se precisar desfazer o rateio multi-produto/FUNRURAL parametrizado.
