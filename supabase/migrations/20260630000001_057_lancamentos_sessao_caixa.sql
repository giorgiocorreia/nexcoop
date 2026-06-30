-- Migration 057: Vincular lancamentos a sessoes_caixa (saídas avulsas de caixa)
--
-- Problema: saidas avulsas registradas no caixa criam lancamentos financeiros mas
-- não possuem FK de volta para a sessao_caixa, impossibilitando exibi-las no
-- Diário de Caixa. Esta migration adiciona a FK e o índice necessário.

ALTER TABLE lancamentos
  ADD COLUMN IF NOT EXISTS sessao_caixa_id uuid REFERENCES sessoes_caixa(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_lancamentos_sessao_caixa
  ON lancamentos(sessao_caixa_id)
  WHERE sessao_caixa_id IS NOT NULL;

COMMENT ON COLUMN lancamentos.sessao_caixa_id IS
  'Sessão de caixa que gerou este lançamento (somente saídas avulsas do módulo Comercialização)';
