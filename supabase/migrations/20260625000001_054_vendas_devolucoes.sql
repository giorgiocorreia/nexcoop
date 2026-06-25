-- Migration 054: vendas_externas_devolucoes + campos devolução em vendas_externas

-- 1. Adicionar campos em vendas_externas
ALTER TABLE vendas_externas
  ADD COLUMN IF NOT EXISTS quantidade_kg_original numeric(10,3),
  ADD COLUMN IF NOT EXISTS quantidade_kg_devolvida numeric(10,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_bruto_original numeric(12,2);

-- Backfill: guardar valores originais nas vendas existentes
UPDATE vendas_externas
SET
  quantidade_kg_original = quantidade_kg,
  valor_bruto_original = valor_bruto
WHERE quantidade_kg_original IS NULL;

-- Adicionar 'devolvida' ao CHECK de status_nfe
ALTER TABLE vendas_externas
  DROP CONSTRAINT IF EXISTS vendas_externas_status_nfe_check;

ALTER TABLE vendas_externas
  ADD CONSTRAINT vendas_externas_status_nfe_check
  CHECK (status_nfe IN ('rascunho','processando','autorizada','cancelada','rejeitada','devolvida'));

-- 2. Criar tabela vendas_externas_devolucoes
CREATE TABLE IF NOT EXISTS vendas_externas_devolucoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  venda_id uuid NOT NULL REFERENCES vendas_externas(id) ON DELETE CASCADE,
  quantidade_kg numeric(10,3) NOT NULL CHECK (quantidade_kg > 0),
  valor_unitario numeric(10,4) NOT NULL CHECK (valor_unitario > 0),
  valor_total numeric(12,2) GENERATED ALWAYS AS (
    ROUND((quantidade_kg * valor_unitario)::numeric, 2)
  ) STORED,
  chave_nfe_devolucao text CHECK (
    chave_nfe_devolucao IS NULL OR length(chave_nfe_devolucao) = 44
  ),
  xml_nfe_devolucao text,
  status text NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente','processada')),
  processada_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE vendas_externas_devolucoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON vendas_externas_devolucoes
  FOR ALL USING (
    organizacao_id = (
      SELECT organizacao_id FROM usuarios WHERE id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_devolucoes_venda ON vendas_externas_devolucoes(venda_id);
CREATE INDEX IF NOT EXISTS idx_devolucoes_org ON vendas_externas_devolucoes(organizacao_id, created_at DESC);

-- 3. Expandir trigger resultado_safra_snapshot para reagir a UPDATE
CREATE OR REPLACE FUNCTION fn_atualizar_resultado_safra_snapshot()
RETURNS TRIGGER AS $$
DECLARE
  v_safra_id uuid;
  v_produto_id uuid;
  v_org_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_safra_id  := OLD.safra_id;
    v_produto_id := OLD.produto_id;
    v_org_id    := OLD.organizacao_id;
  ELSE
    v_safra_id  := NEW.safra_id;
    v_produto_id := NEW.produto_id;
    v_org_id    := NEW.organizacao_id;
  END IF;

  IF v_safra_id IS NULL OR v_produto_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  INSERT INTO resultado_safra_snapshot (
    organizacao_id,
    safra_id,
    produto_id,
    receita_bruta_rs,
    custo_aquisicao_rs,
    taxa_cooperativa_rs,
    funrural_rs,
    total_kg_vendido
  )
  SELECT
    v_org_id,
    v_safra_id,
    v_produto_id,
    COALESCE(SUM(
      CASE WHEN ve.status_nfe NOT IN ('cancelada','devolvida')
        THEN ve.valor_bruto ELSE 0 END
    ), 0),
    0,
    0,
    COALESCE(SUM(
      CASE WHEN ve.status_nfe NOT IN ('cancelada','devolvida')
        THEN ROUND(ve.valor_bruto * 0.0163, 2) ELSE 0 END
    ), 0),
    COALESCE(SUM(
      CASE WHEN ve.status_nfe NOT IN ('cancelada','devolvida')
        THEN ve.quantidade_kg ELSE 0 END
    ), 0)
  FROM vendas_externas ve
  WHERE ve.organizacao_id = v_org_id
    AND ve.safra_id        = v_safra_id
    AND ve.produto_id      = v_produto_id
  ON CONFLICT (organizacao_id, safra_id, produto_id)
  DO UPDATE SET
    receita_bruta_rs  = EXCLUDED.receita_bruta_rs,
    funrural_rs       = EXCLUDED.funrural_rs,
    total_kg_vendido  = EXCLUDED.total_kg_vendido;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_atualizar_resultado_safra_snapshot ON vendas_externas;

CREATE TRIGGER trg_atualizar_resultado_safra_snapshot
  AFTER INSERT OR UPDATE OF quantidade_kg, valor_bruto, status_nfe
  ON vendas_externas
  FOR EACH ROW
  EXECUTE FUNCTION fn_atualizar_resultado_safra_snapshot();
