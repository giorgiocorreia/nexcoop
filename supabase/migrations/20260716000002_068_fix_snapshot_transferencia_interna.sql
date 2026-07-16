-- 068 — fn_atualizar_resultado_safra_snapshot: suportar tipo_documento = 'transferencia_interna'
--
-- Bug: `ve.status_nfe NOT IN ('cancelada','devolvida')` avalia para NULL (não TRUE)
-- quando status_nfe é NULL — em SQL, `NULL NOT IN (...)` nunca é verdadeiro.
-- Toda venda com tipo_documento = 'transferencia_interna' (migration 067) tem
-- status_nfe permanentemente NULL, pois não passa pelo fluxo Focus NFe.
-- Sem esta correção, essas vendas nunca entram em receita_bruta_rs,
-- taxa_cooperativa_rs, funrural_rs nem total_kg_vendido em
-- resultado_safra_snapshot — mesmo havendo dinheiro real mudando de mãos.
--
-- Mantém o comportamento anterior para tipo_documento = 'nfe_saida': uma venda
-- ainda sem status_nfe (NF-e não emitida) continua fora do somatório; só muda
-- o tratamento quando tipo_documento = 'transferencia_interna'.
--
-- Rodar no SQL Editor do Supabase Dashboard.

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
      CASE WHEN (ve.tipo_documento = 'transferencia_interna' OR ve.status_nfe IS NOT NULL)
            AND COALESCE(ve.status_nfe, '') NOT IN ('cancelada','devolvida')
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
      CASE WHEN (ve.tipo_documento = 'transferencia_interna' OR ve.status_nfe IS NOT NULL)
            AND COALESCE(ve.status_nfe, '') NOT IN ('cancelada','devolvida')
        THEN COALESCE(ve.valor_taxa, 0) ELSE 0 END
    ), 0),
    COALESCE(SUM(
      CASE WHEN (ve.tipo_documento = 'transferencia_interna' OR ve.status_nfe IS NOT NULL)
            AND COALESCE(ve.status_nfe, '') NOT IN ('cancelada','devolvida')
        THEN ROUND(ve.valor_bruto * 0.0163, 2) ELSE 0 END
    ), 0),
    COALESCE(SUM(
      CASE WHEN (ve.tipo_documento = 'transferencia_interna' OR ve.status_nfe IS NOT NULL)
            AND COALESCE(ve.status_nfe, '') NOT IN ('cancelada','devolvida')
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

-- Recalcula os snapshots existentes disparando o trigger para todas as
-- vendas_externas já em transferencia_interna (se houver alguma criada antes
-- desta correção). valor_bruto é coluna GENERATED — não pode ser alvo de SET,
-- por isso o toque usa observacoes (nullable, sem efeito colateral).
UPDATE vendas_externas
SET observacoes = observacoes
WHERE tipo_documento = 'transferencia_interna';
