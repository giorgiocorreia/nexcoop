-- 053_trigger_custo_aquisicao_notas_entrada.sql
-- Corrige fn_atualizar_resultado_safra_snapshot:
-- custo_aquisicao_rs calculado via notas_entrega.valor_total
-- (valor comprometido com produtor no momento da entrega)
-- em vez de movimentacoes_conta tipo conversao (pagamentos realizados)

CREATE OR REPLACE FUNCTION fn_atualizar_resultado_safra_snapshot()
RETURNS TRIGGER AS $$
DECLARE
  v_safra_id   uuid;
  v_org_id     uuid;
  v_produto_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_safra_id   := OLD.safra_id;
    v_org_id     := OLD.organizacao_id;
    v_produto_id := (
      SELECT li.produto_id FROM lote_itens li WHERE li.lote_id = OLD.lote_id LIMIT 1
    );
  ELSE
    v_safra_id   := NEW.safra_id;
    v_org_id     := NEW.organizacao_id;
    v_produto_id := (
      SELECT li.produto_id FROM lote_itens li WHERE li.lote_id = NEW.lote_id LIMIT 1
    );
  END IF;

  IF v_safra_id IS NULL OR v_produto_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

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
      CASE WHEN ve.status_nfe NOT IN ('cancelada','devolvida')
        THEN ve.valor_bruto ELSE 0 END
    ), 0),
    COALESCE((
      SELECT SUM(ne.valor_total)
      FROM notas_entrega ne
      JOIN movimentacoes_conta mc ON mc.id = ne.movimentacao_id
      JOIN lotes l ON l.id = mc.lote_id
      JOIN lote_itens li ON li.lote_id = l.id
      WHERE l.organizacao_id = v_org_id
        AND l.safra_id       = v_safra_id
        AND li.produto_id    = v_produto_id
        AND ne.status        = 'autorizada'
    ), 0),
    COALESCE(SUM(
      CASE WHEN ve.status_nfe NOT IN ('cancelada','devolvida')
        THEN COALESCE(ve.valor_taxa, 0) ELSE 0 END
    ), 0),
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
    AND ve.safra_id       = v_safra_id
    AND ve.lote_id IN (
      SELECT lote_id FROM lote_itens WHERE produto_id = v_produto_id
    )
  ON CONFLICT (organizacao_id, safra_id, produto_id)
  DO UPDATE SET
    receita_bruta_rs    = EXCLUDED.receita_bruta_rs,
    custo_aquisicao_rs  = EXCLUDED.custo_aquisicao_rs,
    taxa_cooperativa_rs = EXCLUDED.taxa_cooperativa_rs,
    funrural_rs         = EXCLUDED.funrural_rs,
    total_kg_vendido    = EXCLUDED.total_kg_vendido,
    ultima_atualizacao  = now();

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
