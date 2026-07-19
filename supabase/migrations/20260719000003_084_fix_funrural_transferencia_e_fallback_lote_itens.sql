-- Migration 084: fix FUNRURAL em transferência interna + fallback/backfill de lote_itens
-- Aplicar via: Supabase Dashboard → SQL Editor
-- Data: 2026-07-19
--
-- Continuação direta da 082/083 (docs/PLANO_RESULTADO_COMERCIALIZACAO.md) —
-- mesmos padrões: SET search_path = public, funções recalculam do zero,
-- backfill documentado, rollback comentado no rodapé.
--
-- =============================================================================
-- DIAGNÓSTICO (dados de produção COOPAIBI, query lote a lote, 19/07/2026)
-- =============================================================================
-- | lote | kg      | valor      | tipo_documento         | status_nfe  | situação |
-- |------|---------|------------|------------------------|-------------|----------|
-- | 001  | 602,000 | 12.437,32  | nfe_saida              | autorizada  | CONTA    |
-- | 002  | 600,700 | 14.014,33  | transferencia_interna  | rascunho    | FORA — lote sem lote_itens |
-- | 003  | 602,000 | 14.002,52  | transferencia_interna  | null        | FORA — lote sem lote_itens |
--
-- Dois defeitos:
--
-- (1) FUNRURAL indevido em transferência interna. O trigger de vendas
--     (fn_atualizar_resultado_safra_snapshot, 082) desconta
--     `valor_bruto × aliquota_funrural` de TODA venda contada, incluindo
--     transferencia_interna. Confirmado com o Giorgio: não existe FUNRURAL em
--     transferência interna (o comprador é empresa do próprio cooperado, não
--     há nota de venda da cooperativa). A taxa da cooperativa (`ve.valor_taxa`,
--     3% já gravada pela aplicação nas três vendas do diagnóstico) está OK e
--     NÃO é alterada nesta migration.
--
-- (2) Fallback de produto para lote sem lote_itens. Causa raiz (confirmada por
--     grep no repo inteiro — nenhum arquivo insere em lote_itens fora do
--     backfill único da migration 052): `iniciarLote()`
--     (app/(sistema)/comercializacao/lotes/actions.ts:131) cria o lote só com
--     `produto_descricao` (texto livre, sem FK para produtos) e
--     `confirmarComposicaoLote()` (mesmo arquivo, linha 165) vincula as
--     entregas ao lote e recalcula `peso_total_kg`, mas NUNCA grava em
--     lote_itens. `lotes.produto_id` (a fonte de fallback cogitada
--     originalmente) foi DROPADA pela própria 052 (linha ~93) — não existe
--     mais, não é uma opção. Resultado: todo lote criado DEPOIS da 052
--     (24/06/2026) nasce sem lote_itens — não é um problema exclusivo de
--     transferencia_interna. Lote 001 tem lote_itens porque é anterior à 052
--     e foi coberto pelo backfill único daquela migration (a partir do então
--     existente lotes.produto_id); lotes 002/003 são posteriores (tipo_documento
--     só existe desde a 067, 16/07/2026) e nunca tiveram lote_itens criado.
--     Fora de escopo desta migration: corrigir `confirmarComposicaoLote` para
--     passar a gravar lote_itens (código de aplicação) — reportado aqui, não
--     alterado.
--
-- Solução (schema only):
--   a. fn_produto_lote(lote_id): função de leitura que devolve
--      (produto_id, fator) — usa lote_itens quando existe; senão, fallback via
--      movimentacoes_conta vinculadas ao lote (tipo IN ('entrega','ajuste_produto'),
--      agrupadas por produto_id) SE E SOMENTE SE houver exatamente 1 produto
--      distinto (lote mono-produto, fator = 1.0). Se lote_itens está vazio e
--      há 0 ou >1 produtos nas movimentações vinculadas, não resolve nada —
--      venda continua descartada (documentado, query de monitoramento no
--      rodapé). Usada em TODOS os pontos do trigger de vendas que dependiam
--      de lote_itens: o loop que decide quais produtos recalcular, e as somas
--      de receita/taxa/funrural/kg/custo_aquisicao.
--   b. Backfill de lote_itens: para todo lote sem itens, insere
--      (lote_id, produto_id, SUM(quantidade_produto)) a partir das
--      movimentações vinculadas (mesma regra do fallback), SE mono-produto.
--      Cobre 002/003 e deixa lote_itens consistente para qualquer outro
--      consumidor (documento-transferencia.ts, emitir-nfe-saida.ts,
--      lotes.actions.ts/buscarLote, tela de detalhe do lote) — não só o
--      trigger de resultado. trg_sincronizar_peso_lote (052) recalcula
--      lotes.peso_total_kg a partir de SUM(lote_itens.peso_kg) no INSERT;
--      como o peso inserido já vem da mesma soma de movimentações que gerou
--      o peso_total_kg atual (confirmarComposicaoLote usa a mesma fonte),
--      não deveria haver divergência — query de sanidade no rodapé confere.
--   c. FUNRURAL zerado no CASE de cálculo quando
--      ve.tipo_documento = 'transferencia_interna'.
--   d. Recálculo do histórico inteiro (mesmo truque das 068/082: UPDATE
--      no-op em vendas_externas via coluna observacoes, dispara o trigger
--      AFTER para cada linha).
-- =============================================================================


-- =============================================================================
-- BLOCO 1 — fn_produto_lote: leitura com fallback (lote_itens > movimentações vinculadas)
-- =============================================================================

CREATE OR REPLACE FUNCTION fn_produto_lote(p_lote_id uuid)
RETURNS TABLE(produto_id uuid, fator numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Fonte primária: lote_itens (rateio real, multi-produto)
  SELECT li.produto_id, COALESCE(li.peso_kg / NULLIF(l.peso_total_kg, 0), 1.0) AS fator
  FROM lote_itens li
  JOIN lotes l ON l.id = li.lote_id
  WHERE li.lote_id = p_lote_id

  UNION ALL

  -- Fallback: lote sem lote_itens, mas com movimentações vinculadas de um único
  -- produto (entrega/ajuste_produto) — lote mono-produto por definição, fator = 1.0
  SELECT mono.produto_id, 1.0::numeric AS fator
  FROM (
    SELECT mc.produto_id
    FROM movimentacoes_conta mc
    WHERE mc.lote_id     = p_lote_id
      AND mc.tipo        IN ('entrega', 'ajuste_produto')
      AND mc.produto_id IS NOT NULL
    GROUP BY mc.produto_id
  ) mono
  WHERE NOT EXISTS (SELECT 1 FROM lote_itens li2 WHERE li2.lote_id = p_lote_id)
    AND (
      SELECT COUNT(DISTINCT mc2.produto_id)
      FROM movimentacoes_conta mc2
      WHERE mc2.lote_id     = p_lote_id
        AND mc2.tipo        IN ('entrega', 'ajuste_produto')
        AND mc2.produto_id IS NOT NULL
    ) = 1
$$;

COMMENT ON FUNCTION fn_produto_lote(uuid) IS
  'Resolve (produto_id, fator) de um lote: usa lote_itens quando existe; senão '
  'fallback via movimentacoes_conta vinculadas (entrega/ajuste_produto), só se '
  'mono-produto. Sem resultado = produto não resolvível (venda descartada do '
  'resultado_safra_snapshot). Ver migration 084.';


-- =============================================================================
-- BLOCO 2 — backfill de lote_itens a partir das movimentações vinculadas
-- =============================================================================
-- Cobre qualquer lote (não só transferencia_interna) criado após a 052 que
-- nunca recebeu lote_itens. Só resolve lotes mono-produto (mesma regra do
-- fallback do BLOCO 1) — lote com movimentações de mais de um produto ou sem
-- nenhuma movimentação vinculada permanece sem lote_itens (cai no fallback em
-- tempo de leitura do BLOCO 1, ou é descartado se nem isso resolver).

WITH agregado AS (
  SELECT mc.lote_id, mc.produto_id, SUM(mc.quantidade_produto) AS peso_kg
  FROM movimentacoes_conta mc
  WHERE mc.tipo IN ('entrega', 'ajuste_produto')
    AND mc.lote_id     IS NOT NULL
    AND mc.produto_id IS NOT NULL
  GROUP BY mc.lote_id, mc.produto_id
),
mono_produto AS (
  SELECT a.lote_id, a.produto_id, a.peso_kg
  FROM agregado a
  WHERE (SELECT COUNT(*) FROM agregado a2 WHERE a2.lote_id = a.lote_id) = 1
)
INSERT INTO lote_itens (lote_id, produto_id, peso_kg)
SELECT mp.lote_id, mp.produto_id, mp.peso_kg
FROM mono_produto mp
WHERE NOT EXISTS (SELECT 1 FROM lote_itens li WHERE li.lote_id = mp.lote_id)
ON CONFLICT (lote_id, produto_id) DO NOTHING;

-- trg_sincronizar_peso_lote (052) dispara AFTER INSERT em lote_itens e
-- recalcula lotes.peso_total_kg = SUM(lote_itens.peso_kg) automaticamente —
-- nenhuma ação adicional necessária aqui. Ver sanidade no rodapé para
-- confirmar que não houve divergência entre o peso backfillado e o
-- peso_total_kg que já existia no lote.


-- =============================================================================
-- BLOCO 3 — fn_atualizar_resultado_safra_snapshot: FUNRURAL zero em
-- transferência interna + fallback de produto via fn_produto_lote em TODOS os
-- pontos que dependiam de lote_itens
-- =============================================================================
-- Mesma base da 082 (rateio multi-produto + FUNRURAL parametrizado por org),
-- trocando o acesso direto a lote_itens por fn_produto_lote (BLOCO 1) — cobre
-- receita, taxa, funrural, kg_vendido (vendas_externas) e custo_aquisicao_rs
-- (notas_entrega). NÃO toca em kg_convertido/custo_convertido_rs (propriedade
-- exclusiva do trigger trg_atualizar_custo_convertido, 082).

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

  -- Um produto por iteração — cobre lote mono-produto (via lote_itens ou
  -- fallback de movimentações) e multi-produto (via lote_itens) igualmente.
  FOR v_produto_id IN (
    SELECT produto_id FROM fn_produto_lote(v_lote_id)
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
          THEN ROUND(ve.valor_bruto * li.fator, 2)
          ELSE 0 END
      ), 0),
      COALESCE((
        SELECT SUM(ne.valor_total * li2.fator)
        FROM notas_entrega ne
        JOIN movimentacoes_conta mc ON mc.id = ne.movimentacao_id
        JOIN lotes l2 ON l2.id = mc.lote_id
        JOIN fn_produto_lote(l2.id) li2 ON li2.produto_id = v_produto_id
        WHERE l2.organizacao_id = v_org_id
          AND l2.safra_id       = v_safra_id
          AND ne.status         = 'autorizada'
      ), 0),
      COALESCE(SUM(
        CASE WHEN (ve.tipo_documento = 'transferencia_interna' OR ve.status_nfe IS NOT NULL)
              AND COALESCE(ve.status_nfe, '') NOT IN ('cancelada','devolvida')
          THEN ROUND(COALESCE(ve.valor_taxa, 0) * li.fator, 2)
          ELSE 0 END
      ), 0),
      -- FUNRURAL: não incide em transferência interna (confirmado com o
      -- Giorgio, 19/07/2026 — comprador é empresa do próprio cooperado, sem
      -- nota de venda da cooperativa).
      COALESCE(SUM(
        CASE WHEN (ve.tipo_documento = 'transferencia_interna' OR ve.status_nfe IS NOT NULL)
              AND COALESCE(ve.status_nfe, '') NOT IN ('cancelada','devolvida')
              AND ve.tipo_documento <> 'transferencia_interna'
          THEN ROUND(ve.valor_bruto * li.fator * v_aliquota, 2)
          ELSE 0 END
      ), 0),
      COALESCE(SUM(
        CASE WHEN (ve.tipo_documento = 'transferencia_interna' OR ve.status_nfe IS NOT NULL)
              AND COALESCE(ve.status_nfe, '') NOT IN ('cancelada','devolvida')
          THEN ROUND(ve.quantidade_kg * li.fator, 3)
          ELSE 0 END
      ), 0)
    FROM vendas_externas ve
    JOIN fn_produto_lote(ve.lote_id) li ON li.produto_id = v_produto_id
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


-- =============================================================================
-- BLOCO 4 — recalcula o histórico inteiro com a fórmula nova
-- =============================================================================
-- Mesmo truque das migrations 068/082: valor_bruto é GENERATED, o toque usa
-- observacoes (nullable, sem efeito colateral) para disparar o trigger AFTER
-- em cada linha de vendas_externas — agora com fn_produto_lote já resolvendo
-- 002/003 (via backfill do BLOCO 2) e sem FUNRURAL indevido.

UPDATE vendas_externas
SET observacoes = observacoes;


-- =============================================================================
-- SANIDADE PÓS-MIGRATION (rodar após aplicar — não faz parte da migration)
-- =============================================================================
-- COOPAIBI, produto Amêndoas, safra corrente — esperado após esta migration:
--   total_kg_vendido  = 1.804,700   (602,000 + 600,700 + 602,000)
--   receita_bruta_rs  = 40.454,17   (12.437,32 + 14.014,33 + 14.002,52)
--   funrural_rs       = 202,73      (só sobre os 12.437,32 do lote 001:
--                                    12.437,32 × 0,0163 = 202,7284 → 202,73)
--
-- SELECT r.total_kg_vendido, r.receita_bruta_rs, r.funrural_rs,
--        r.taxa_cooperativa_rs, r.kg_convertido, r.custo_convertido_rs,
--        r.lucro_realizado_rs
-- FROM resultado_safra_snapshot r
-- JOIN produtos pr ON pr.id = r.produto_id
-- WHERE r.organizacao_id = '3ad97dc2-f87f-4e67-950e-387854d5bccc' -- COOPAIBI
--   AND pr.nome ILIKE '%am%ndoa%';
--
-- Divergência de peso no backfill de lote_itens (BLOCO 2) — deve retornar 0
-- linhas; se retornar alguma, o peso_total_kg do lote não bate com a soma das
-- movimentações vinculadas (investigar antes de confiar no rateio):
--
-- SELECT l.id AS lote_id, l.codigo, l.peso_total_kg,
--        SUM(li.peso_kg) AS soma_lote_itens
-- FROM lotes l
-- JOIN lote_itens li ON li.lote_id = l.id
-- GROUP BY l.id, l.codigo, l.peso_total_kg
-- HAVING l.peso_total_kg <> SUM(li.peso_kg);
--
-- Monitoramento — vendas ainda descartadas do resultado (produto não
-- resolvível nem por lote_itens, nem por fallback de movimentações):
--
-- SELECT ve.id, ve.organizacao_id, ve.lote_id, l.codigo AS lote_codigo,
--        ve.tipo_documento, ve.status_nfe, ve.valor_bruto, ve.data_venda
-- FROM vendas_externas ve
-- JOIN lotes l ON l.id = ve.lote_id
-- WHERE (ve.tipo_documento = 'transferencia_interna' OR ve.status_nfe IS NOT NULL)
--   AND COALESCE(ve.status_nfe, '') NOT IN ('cancelada','devolvida')
--   AND NOT EXISTS (SELECT 1 FROM fn_produto_lote(ve.lote_id))
-- ORDER BY ve.data_venda DESC;


-- =============================================================================
-- Rollback (comentado):
-- =============================================================================
-- Reverter fn_atualizar_resultado_safra_snapshot para a versão da 082
-- (supabase/migrations/20260719000001_082_resultado_comercializacao_realizado_marcacao.sql)
-- se precisar desfazer o fallback de produto e o zeramento de FUNRURAL em
-- transferência interna.
-- DROP FUNCTION IF EXISTS fn_produto_lote(uuid);
-- Não há como reverter o backfill de lote_itens (BLOCO 2) de forma seletiva
-- sem saber quais linhas foram inseridas por esta migration — se precisar
-- desfazer, restaurar de um dump anterior a esta migration ou, no mínimo,
-- remover manualmente as linhas de lote_itens cujo lote não existia com
-- itens antes de 19/07/2026 (conferir created_at da linha em lote_itens).
