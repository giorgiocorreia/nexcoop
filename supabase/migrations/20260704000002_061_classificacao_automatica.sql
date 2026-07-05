-- Classificação automática na escrituração (liga Financeiro → Contábil)
ALTER TABLE configuracoes_contabeis
  ADD COLUMN IF NOT EXISTS classificacao_automatica BOOLEAN NOT NULL DEFAULT TRUE;