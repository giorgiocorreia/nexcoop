-- Acesso do escritório contábil ao módulo fiscal da comercialização
ALTER TABLE empresas_parceiras
  ADD COLUMN IF NOT EXISTS acesso_fiscal BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN empresas_parceiras.acesso_fiscal IS
  'Quando true, parceiro contábil vê /comercializacao/fiscal na org cliente (modulo fiscal_comercializacao)';