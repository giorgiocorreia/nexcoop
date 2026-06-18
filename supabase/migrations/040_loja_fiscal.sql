-- Migration 040: Fase 6 Loja — preparação fiscal
-- Adiciona NCM e CFOP em loja_produtos
-- Adiciona colunas fiscais em organizacoes
-- Cria tabela loja_notas_fiscais

-- 1. loja_produtos: NCM e CFOP de saída
ALTER TABLE loja_produtos
  ADD COLUMN IF NOT EXISTS ncm varchar(8) NULL,
  ADD COLUMN IF NOT EXISTS cfop_saida varchar(5) NULL DEFAULT '5102';

COMMENT ON COLUMN loja_produtos.ncm IS 'Código NCM de 8 dígitos — obrigatório para emissão de NF-e/NFC-e';
COMMENT ON COLUMN loja_produtos.cfop_saida IS 'CFOP padrão de saída. 5102=interna, 6102=interestadual';

-- 2. organizacoes: configuração fiscal da loja
ALTER TABLE organizacoes
  ADD COLUMN IF NOT EXISTS loja_nfce_csc_id varchar(6) NULL,
  ADD COLUMN IF NOT EXISTS loja_nfce_csc_token varchar(36) NULL,
  ADD COLUMN IF NOT EXISTS loja_regime_tributario varchar(20) NULL DEFAULT 'simples',
  ADD COLUMN IF NOT EXISTS loja_nfce_serie varchar(3) NULL DEFAULT '001',
  ADD COLUMN IF NOT EXISTS loja_nfe_saida_serie varchar(3) NULL DEFAULT '001';

COMMENT ON COLUMN organizacoes.loja_nfce_csc_id IS 'CSC ID para NFC-e — obtido na SEFAZ do estado';
COMMENT ON COLUMN organizacoes.loja_nfce_csc_token IS 'CSC Token para NFC-e — obtido na SEFAZ do estado';
COMMENT ON COLUMN organizacoes.loja_regime_tributario IS 'simples | presumido | real';
COMMENT ON COLUMN organizacoes.loja_nfce_serie IS 'Série NFC-e (padrão 001)';
COMMENT ON COLUMN organizacoes.loja_nfe_saida_serie IS 'Série NF-e de saída (padrão 001)';

-- 3. loja_notas_fiscais: registro de todas as notas emitidas pela loja
CREATE TABLE IF NOT EXISTS loja_notas_fiscais (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  venda_id      uuid NOT NULL REFERENCES loja_vendas(id) ON DELETE RESTRICT,
  tipo          varchar(4) NOT NULL CHECK (tipo IN ('nfe', 'nfce')),
  referencia    varchar(80) NOT NULL UNIQUE,
  chave_acesso  varchar(44) NULL,
  numero        varchar(9) NULL,
  serie         varchar(3) NULL,
  status        varchar(30) NOT NULL DEFAULT 'processando'
                CHECK (status IN ('processando','autorizada','rejeitada','cancelada','erro')),
  xml_url       text NULL,
  danfe_url     text NULL,
  destinatario_nome varchar(60) NULL,
  destinatario_doc  varchar(18) NULL,
  motivo_rejeicao   text NULL,
  emitido_em    timestamptz NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loja_notas_fiscais_org     ON loja_notas_fiscais(org_id);
CREATE INDEX IF NOT EXISTS idx_loja_notas_fiscais_venda   ON loja_notas_fiscais(venda_id);
CREATE INDEX IF NOT EXISTS idx_loja_notas_fiscais_status  ON loja_notas_fiscais(status);

-- RLS
ALTER TABLE loja_notas_fiscais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_own_notas_fiscais" ON loja_notas_fiscais
  FOR ALL USING (
    org_id = (SELECT organizacao_id FROM usuarios WHERE id = auth.uid())
  );
