-- Migration 072: ponte Comercialização -> Loja Agropecuária (produtos.loja_produto_id)
-- Aplicar via: Supabase Dashboard -> SQL Editor
-- Data: 2026-07-17

-- Contexto: hoje o catálogo de produtos da Comercialização (tabela `produtos`,
-- migration 025) e o catálogo de produtos da Loja Agropecuária (tabela
-- `loja_produtos`, migration 012) são completamente independentes, sem
-- nenhuma referência entre si.
--
-- Esta coluna cria o vínculo necessário para o fluxo "Enviar para a Loja":
-- quando um produtor entrega um produto pela Comercialização (ex.: "Luvas de
-- couro", manufatura artesanal, paga na hora da entrega), um operador poderá
-- transformar essa entrega em estoque vendável na Loja (via
-- loja_compras/loja_compra_itens/loja_lotes, atualizando
-- loja_produtos.estoque_atual). O `loja_produto_id` indica qual produto da
-- Loja recebe esse estoque.
--
-- Coluna nullable: produtos sem vínculo continuam funcionando normalmente no
-- fluxo atual da Comercialização, sem nenhum impacto.

ALTER TABLE produtos
  ADD COLUMN loja_produto_id uuid REFERENCES loja_produtos(id) ON DELETE SET NULL;

COMMENT ON COLUMN produtos.loja_produto_id IS
  'Vínculo opcional com loja_produtos(id) — permite mapear qual produto da Loja Agropecuária recebe o estoque quando uma entrega deste produto (Comercialização) for enviada para a Loja.';

-- Rollback (comentado):
-- ALTER TABLE produtos DROP COLUMN loja_produto_id;
