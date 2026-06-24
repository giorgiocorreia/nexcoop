-- =============================================================================
-- 052_resultado_safra_schema.sql
-- Criado: 2026-06-24
-- Sessão: Módulo Resultado por Safra — schema base
--
-- O que faz:
--   1. Refatora cotacoes: data (date) → vigente_a_partir_de (timestamptz)
--   2. Adiciona cotacao_id em movimentacoes_conta (rastreabilidade da conversão)
--   3. Refatora lotes para multi-produto via lote_itens
--   4. Cria saldos_produtor_snapshot + resultado_safra_snapshot + triggers
--   5. Cria views leves vw_saldos_produtor + vw_resultado_safra
-- =============================================================================


-- =============================================================================
-- BLOCO 1 — REFATORAR cotacoes
-- =============================================================================

ALTER TABLE cotacoes ADD COLUMN IF NOT EXISTS vigente_a_partir_de timestamptz;

UPDATE cotacoes
SET vigente_a_partir_de = (data::text || 'T09:00:00-03:00')::timestamptz
WHERE vigente_a_partir_de IS NULL;

ALTER TABLE cotacoes ALTER COLUMN vigente_a_partir_de SET NOT NULL;
ALTER TABLE cotacoes DROP COLUMN data;

ALTER TABLE cotacoes DROP CONSTRAINT IF EXISTS cotacoes_organizacao_id_produto_id_data_key;

CREATE INDEX IF NOT EXISTS idx_cotacoes_ativa
  ON cotacoes (organizacao_id, produto_id, vigente_a_partir_de DESC);


-- =============================================================================
-- BLOCO 2 — cotacao_id em movimentacoes_conta
-- =============================================================================

ALTER TABLE movimentacoes_conta
  ADD COLUMN IF NOT EXISTS cotacao_id uuid REFERENCES cotacoes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_movimentacoes_conta_cotacao_id
  ON movimentacoes_conta (cotacao_id)
  WHERE cotacao_id IS NOT NULL;


-- =============================================================================
-- BLOCO 3 — lotes MULTI-PRODUTO via lote_itens
-- =============================================================================

CREATE TABLE IF NOT EXISTS lote_itens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_id     uuid NOT NULL REFERENCES lotes(id) ON DELETE CASCADE,
  produto_id  uuid NOT NULL REFERENCES produtos(id) ON DELETE RESTRICT,
  peso_kg     numeric(12,3) NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lote_id, produto_id)
);

ALTER TABLE lote_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can view lote_itens"
  ON lote_itens FOR SELECT
  USING (
    lote_id IN (
      SELECT id FROM lotes
      WHERE organizacao_id = (
        SELECT organizacao_id FROM usuarios WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "admin caixa_cacau can manage lote_itens"
  ON lote_itens FOR ALL
  USING (
    lote_id IN (
      SELECT id FROM lotes
      WHERE organizacao_id = (
        SELECT organizacao_id FROM usuarios
        WHERE id = auth.uid()
        AND (funcoes && ARRAY['admin','caixa_cacau'])
      )
    )
  );

-- Migrar lote real existente em produção
INSERT INTO lote_itens (lote_id, produto_id, peso_kg)
SELECT id, produto_id, peso_total_kg
FROM lotes
WHERE produto_id IS NOT NULL
ON CONFLICT (lote_id, produto_id) DO NOTHING;

-- Remover produto_id de lotes
ALTER TABLE lotes DROP COLUMN IF EXISTS produto_id;

-- Trigger: manter peso_total_kg como soma de lote_itens
CREATE OR REPLACE FUNCTION fn_sincronizar_peso_lote()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE lotes
  SET peso_total_kg = (
    SELECT COALESCE(SUM(peso_kg), 0)
    FROM lote_itens
    WHERE lote_id = COALESCE(NEW.lote_id, OLD.lote_id)
  )
  WHERE id = COALESCE(NEW.lote_id, OLD.lote_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sincronizar_peso_lote ON lote_itens;
CREATE TRIGGER trg_sincronizar_peso_lote
  AFTER INSERT OR UPDATE OR DELETE ON lote_itens
  FOR EACH ROW EXECUTE FUNCTION fn_sincronizar_peso_lote();


-- =============================================================================
-- BLOCO 4 — saldos_produtor_snapshot
-- =============================================================================

CREATE TABLE IF NOT EXISTS saldos_produtor_snapshot (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id        uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  produtor_id           uuid NOT NULL REFERENCES produtores(id) ON DELETE CASCADE,
  produto_id            uuid NOT NULL REFERENCES produtos(id) ON DELETE RESTRICT,
  safra_id              uuid NOT NULL REFERENCES safras(id) ON DELETE RESTRICT,
  kg_entregue           numeric(12,3) NOT NULL DEFAULT 0,
  kg_convertido         numeric(12,3) NOT NULL DEFAULT 0,
  saldo_kg              numeric(12,3) GENERATED ALWAYS AS (kg_entregue - kg_convertido) STORED,
  valor_convertido_rs   numeric(14,2) NOT NULL DEFAULT 0,
  ultima_atualizacao    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organizacao_id, produtor_id, produto_id, safra_id)
);

ALTER TABLE saldos_produtor_snapshot ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can view saldos_produtor_snapshot"
  ON saldos_produtor_snapshot FOR SELECT
  USING (
    organizacao_id = (SELECT organizacao_id FROM usuarios WHERE id = auth.uid())
  );

CREATE POLICY "service_role can manage saldos_produtor_snapshot"
  ON saldos_produtor_snapshot FOR ALL
  USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_saldos_snapshot_org_produtor
  ON saldos_produtor_snapshot (organizacao_id, produtor_id);

CREATE INDEX IF NOT EXISTS idx_saldos_snapshot_org_safra
  ON saldos_produtor_snapshot (organizacao_id, safra_id);


-- =============================================================================
-- BLOCO 5 — resultado_safra_snapshot
-- =============================================================================

CREATE TABLE IF NOT EXISTS resultado_safra_snapshot (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id        uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  safra_id              uuid NOT NULL REFERENCES safras(id) ON DELETE RESTRICT,
  produto_id            uuid NOT NULL REFERENCES produtos(id) ON DELETE RESTRICT,
  receita_bruta_rs      numeric(14,2) NOT NULL DEFAULT 0,
  custo_aquisicao_rs    numeric(14,2) NOT NULL DEFAULT 0,
  taxa_cooperativa_rs   numeric(14,2) NOT NULL DEFAULT 0,
  funrural_rs           numeric(14,2) NOT NULL DEFAULT 0,
  resultado_liquido_rs  numeric(14,2) GENERATED ALWAYS AS (
                          receita_bruta_rs - custo_aquisicao_rs
                          - taxa_cooperativa_rs - funrural_rs
                        ) STORED,
  total_kg_vendido      numeric(12,3) NOT NULL DEFAULT 0,
  preco_medio_kg        numeric(10,4) GENERATED ALWAYS AS (
                          CASE WHEN total_kg_vendido > 0
                          THEN receita_bruta_rs / total_kg_vendido
                          ELSE 0 END
                        ) STORED,
  ultima_atualizacao    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organizacao_id, safra_id, produto_id)
);

ALTER TABLE resultado_safra_snapshot ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can view resultado_safra_snapshot"
  ON resultado_safra_snapshot FOR SELECT
  USING (
    organizacao_id = (SELECT organizacao_id FROM usuarios WHERE id = auth.uid())
  );

CREATE POLICY "service_role can manage resultado_safra_snapshot"
  ON resultado_safra_snapshot FOR ALL
  USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_resultado_snapshot_org_safra
  ON resultado_safra_snapshot (organizacao_id, safra_id);


-- =============================================================================
-- BLOCO 6 — TRIGGER saldos_produtor_snapshot
-- =============================================================================

CREATE OR REPLACE FUNCTION fn_atualizar_saldos_produtor_snapshot()
RETURNS TRIGGER AS $$
DECLARE
  v_produtor_id   uuid;
  v_safra_id      uuid;
  v_org_id        uuid;
BEGIN
  IF NEW.tipo NOT IN ('entrega', 'conversao') THEN RETURN NEW; END IF;
  IF NEW.produto_id IS NULL OR NEW.quantidade_produto IS NULL THEN RETURN NEW; END IF;

  SELECT produtor_id INTO v_produtor_id
  FROM contas_produtor WHERE id = NEW.conta_id;

  IF NEW.lote_id IS NOT NULL THEN
    SELECT safra_id INTO v_safra_id
    FROM lotes WHERE id = NEW.lote_id;
  END IF;

  IF v_safra_id IS NULL THEN RETURN NEW; END IF;

  v_org_id := NEW.organizacao_id;

  INSERT INTO saldos_produtor_snapshot
    (organizacao_id, produtor_id, produto_id, safra_id,
     kg_entregue, kg_convertido, valor_convertido_rs)
  VALUES (v_org_id, v_produtor_id, NEW.produto_id, v_safra_id, 0, 0, 0)
  ON CONFLICT (organizacao_id, produtor_id, produto_id, safra_id) DO NOTHING;

  IF NEW.tipo = 'entrega' THEN
    UPDATE saldos_produtor_snapshot
    SET kg_entregue        = kg_entregue + NEW.quantidade_produto,
        ultima_atualizacao = now()
    WHERE organizacao_id = v_org_id AND produtor_id = v_produtor_id
      AND produto_id = NEW.produto_id AND safra_id = v_safra_id;

  ELSIF NEW.tipo = 'conversao' THEN
    UPDATE saldos_produtor_snapshot
    SET kg_convertido       = kg_convertido + NEW.quantidade_produto,
        valor_convertido_rs = valor_convertido_rs + COALESCE(NEW.valor_financeiro, 0),
        ultima_atualizacao  = now()
    WHERE organizacao_id = v_org_id AND produtor_id = v_produtor_id
      AND produto_id = NEW.produto_id AND safra_id = v_safra_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_atualizar_saldos_produtor_snapshot ON movimentacoes_conta;
CREATE TRIGGER trg_atualizar_saldos_produtor_snapshot
  AFTER INSERT ON movimentacoes_conta
  FOR EACH ROW EXECUTE FUNCTION fn_atualizar_saldos_produtor_snapshot();


-- =============================================================================
-- BLOCO 7 — TRIGGER resultado_safra_snapshot
-- =============================================================================

CREATE OR REPLACE FUNCTION fn_atualizar_resultado_safra_snapshot()
RETURNS TRIGGER AS $$
DECLARE
  v_produto_id uuid;
BEGIN
  IF NEW.status NOT IN ('confirmada','entregue','paga') THEN RETURN NEW; END IF;

  FOR v_produto_id IN (
    SELECT produto_id FROM lote_itens WHERE lote_id = NEW.lote_id
  ) LOOP
    WITH proporcao AS (
      SELECT
        CASE WHEN l.peso_total_kg > 0
          THEN li.peso_kg / l.peso_total_kg
          ELSE 1.0
        END AS fator
      FROM lote_itens li
      JOIN lotes l ON l.id = li.lote_id
      WHERE li.lote_id = NEW.lote_id AND li.produto_id = v_produto_id
    ),
    valores AS (
      SELECT
        ROUND(NEW.valor_bruto * p.fator, 2)                  AS receita,
        ROUND(COALESCE(NEW.valor_taxa, 0) * p.fator, 2)      AS taxa,
        ROUND(NEW.valor_bruto * p.fator * 0.0163, 2)         AS funrural,
        ROUND(NEW.quantidade_kg * p.fator, 3)                AS kg_vendido
      FROM proporcao p
    )
    INSERT INTO resultado_safra_snapshot
      (organizacao_id, safra_id, produto_id,
       receita_bruta_rs, custo_aquisicao_rs, taxa_cooperativa_rs,
       funrural_rs, total_kg_vendido)
    SELECT
      NEW.organizacao_id, NEW.safra_id, v_produto_id,
      v.receita, 0, v.taxa, v.funrural, v.kg_vendido
    FROM valores v
    ON CONFLICT (organizacao_id, safra_id, produto_id) DO UPDATE SET
      receita_bruta_rs    = resultado_safra_snapshot.receita_bruta_rs + EXCLUDED.receita_bruta_rs,
      taxa_cooperativa_rs = resultado_safra_snapshot.taxa_cooperativa_rs + EXCLUDED.taxa_cooperativa_rs,
      funrural_rs         = resultado_safra_snapshot.funrural_rs + EXCLUDED.funrural_rs,
      total_kg_vendido    = resultado_safra_snapshot.total_kg_vendido + EXCLUDED.total_kg_vendido,
      ultima_atualizacao  = now();
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_atualizar_resultado_safra_snapshot ON vendas_externas;
CREATE TRIGGER trg_atualizar_resultado_safra_snapshot
  AFTER INSERT OR UPDATE OF status ON vendas_externas
  FOR EACH ROW EXECUTE FUNCTION fn_atualizar_resultado_safra_snapshot();


-- =============================================================================
-- BLOCO 8 — VIEWS LEVES
-- =============================================================================

CREATE OR REPLACE VIEW vw_saldos_produtor AS
SELECT
  s.id, s.organizacao_id, s.produtor_id, s.produto_id, s.safra_id,
  s.kg_entregue, s.kg_convertido, s.saldo_kg, s.valor_convertido_rs,
  s.ultima_atualizacao,
  p.nome AS produtor_nome, p.cpf AS produtor_cpf,
  pr.nome AS produto_nome, pr.unidade AS produto_unidade,
  sf.descricao AS safra_descricao, sf.ano AS safra_ano
FROM saldos_produtor_snapshot s
JOIN produtores p  ON p.id = s.produtor_id
JOIN produtos   pr ON pr.id = s.produto_id
JOIN safras     sf ON sf.id = s.safra_id;

CREATE OR REPLACE VIEW vw_resultado_safra AS
SELECT
  r.id, r.organizacao_id, r.safra_id, r.produto_id,
  r.receita_bruta_rs, r.custo_aquisicao_rs, r.taxa_cooperativa_rs,
  r.funrural_rs, r.resultado_liquido_rs, r.total_kg_vendido,
  r.preco_medio_kg, r.ultima_atualizacao,
  pr.nome AS produto_nome, pr.unidade AS produto_unidade,
  sf.descricao AS safra_descricao, sf.ano AS safra_ano
FROM resultado_safra_snapshot r
JOIN produtos pr ON pr.id = r.produto_id
JOIN safras   sf ON sf.id = r.safra_id;


-- =============================================================================
-- BLOCO 9 — BACKFILL HISTÓRICO
-- =============================================================================

INSERT INTO saldos_produtor_snapshot
  (organizacao_id, produtor_id, produto_id, safra_id,
   kg_entregue, kg_convertido, valor_convertido_rs)
SELECT
  mc.organizacao_id,
  cp.produtor_id,
  mc.produto_id,
  l.safra_id,
  SUM(CASE WHEN mc.tipo = 'entrega'   THEN mc.quantidade_produto ELSE 0 END),
  SUM(CASE WHEN mc.tipo = 'conversao' THEN mc.quantidade_produto ELSE 0 END),
  SUM(CASE WHEN mc.tipo = 'conversao' THEN COALESCE(mc.valor_financeiro, 0) ELSE 0 END)
FROM movimentacoes_conta mc
JOIN contas_produtor cp ON cp.id = mc.conta_id
JOIN lotes l ON l.id = mc.lote_id
WHERE mc.tipo IN ('entrega', 'conversao')
  AND mc.produto_id IS NOT NULL
  AND mc.quantidade_produto IS NOT NULL
  AND l.safra_id IS NOT NULL
GROUP BY mc.organizacao_id, cp.produtor_id, mc.produto_id, l.safra_id
ON CONFLICT (organizacao_id, produtor_id, produto_id, safra_id) DO UPDATE SET
  kg_entregue         = EXCLUDED.kg_entregue,
  kg_convertido       = EXCLUDED.kg_convertido,
  valor_convertido_rs = EXCLUDED.valor_convertido_rs,
  ultima_atualizacao  = now();

INSERT INTO resultado_safra_snapshot
  (organizacao_id, safra_id, produto_id,
   receita_bruta_rs, taxa_cooperativa_rs, funrural_rs, total_kg_vendido)
SELECT
  ve.organizacao_id, ve.safra_id, li.produto_id,
  ROUND(SUM(ve.valor_bruto * (li.peso_kg / NULLIF(l.peso_total_kg, 0))), 2),
  ROUND(SUM(COALESCE(ve.valor_taxa, 0) * (li.peso_kg / NULLIF(l.peso_total_kg, 0))), 2),
  ROUND(SUM(ve.valor_bruto * (li.peso_kg / NULLIF(l.peso_total_kg, 0)) * 0.0163), 2),
  ROUND(SUM(ve.quantidade_kg * (li.peso_kg / NULLIF(l.peso_total_kg, 0))), 3)
FROM vendas_externas ve
JOIN lotes l ON l.id = ve.lote_id
JOIN lote_itens li ON li.lote_id = ve.lote_id
WHERE ve.status IN ('confirmada','entregue','paga')
GROUP BY ve.organizacao_id, ve.safra_id, li.produto_id
ON CONFLICT (organizacao_id, safra_id, produto_id) DO UPDATE SET
  receita_bruta_rs    = EXCLUDED.receita_bruta_rs,
  taxa_cooperativa_rs = EXCLUDED.taxa_cooperativa_rs,
  funrural_rs         = EXCLUDED.funrural_rs,
  total_kg_vendido    = EXCLUDED.total_kg_vendido,
  ultima_atualizacao  = now();
