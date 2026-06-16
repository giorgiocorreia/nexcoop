-- Migration 039: Loja Fase 5 — view auxiliar de estoque
-- Aplicar MANUALMENTE no Supabase SQL Editor

-- Nota: estoque_minimo e ativo já existem em loja_produtos desde migration 014.
-- Esta migration apenas cria a view de custo médio ponderado.

CREATE OR REPLACE VIEW vw_estoque_loja AS
SELECT
  p.id                                                        AS produto_id,
  p.nome,
  p.unidade,
  p.preco_normal                                              AS preco_venda,
  p.estoque_minimo,
  p.ativo,
  p.estoque_atual,
  COALESCE(
    SUM(l.quantidade_atual * l.preco_custo) /
    NULLIF(SUM(l.quantidade_atual), 0),
    0
  )                                                           AS custo_medio,
  CASE
    WHEN p.estoque_atual <= COALESCE(p.estoque_minimo, 0) THEN true
    ELSE false
  END                                                         AS em_alerta
FROM loja_produtos p
LEFT JOIN loja_lotes l
  ON l.produto_id = p.id
  AND l.quantidade_atual > 0
GROUP BY p.id;
