-- 048_comercializacao_lotes_fiscal.sql

-- 1. lotes: tornar safra_id e produto_id opcionais + novos campos
ALTER TABLE lotes
  ALTER COLUMN safra_id DROP NOT NULL,
  ALTER COLUMN produto_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS produto_descricao text,
  ADD COLUMN IF NOT EXISTS data_fechamento date;

-- 2. movimentacoes_conta: vínculo com lote + NF-e de entrada
ALTER TABLE movimentacoes_conta
  ADD COLUMN IF NOT EXISTS lote_id uuid REFERENCES lotes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS chave_nfe_entrada text,
  ADD COLUMN IF NOT EXISTS xml_nfe_entrada text;

CREATE INDEX IF NOT EXISTS idx_movimentacoes_conta_lote_id
  ON movimentacoes_conta(lote_id);

-- 3. vendas_externas: campos fiscais NF-e de saída
ALTER TABLE vendas_externas
  ADD COLUMN IF NOT EXISTS chave_nfe          text,
  ADD COLUMN IF NOT EXISTS numero_nfe         text,
  ADD COLUMN IF NOT EXISTS serie_nfe          text,
  ADD COLUMN IF NOT EXISTS status_nfe         text DEFAULT 'pendente'
    CHECK (status_nfe IN ('pendente','autorizada','rejeitada','cancelada')),
  ADD COLUMN IF NOT EXISTS xml_nfe            text,
  ADD COLUMN IF NOT EXISTS data_emissao_nfe   timestamptz;

-- 4. compradores: campos fiscais completos para payload NF-e
ALTER TABLE compradores
  ADD COLUMN IF NOT EXISTS ie           text,
  ADD COLUMN IF NOT EXISTS logradouro   text,
  ADD COLUMN IF NOT EXISTS numero       text,
  ADD COLUMN IF NOT EXISTS complemento  text,
  ADD COLUMN IF NOT EXISTS bairro       text,
  ADD COLUMN IF NOT EXISTS cep          text,
  ADD COLUMN IF NOT EXISTS municipio    text,
  ADD COLUMN IF NOT EXISTS uf           text;

-- 5. produtos: campos fiscais para comercialização
ALTER TABLE produtos
  ADD COLUMN IF NOT EXISTS ncm                      varchar(8),
  ADD COLUMN IF NOT EXISTS cfop_saida_interna       varchar(5),
  ADD COLUMN IF NOT EXISTS cfop_saida_interestadual varchar(5),
  ADD COLUMN IF NOT EXISTS cst_icms                 varchar(3),
  ADD COLUMN IF NOT EXISTS cst_pis                  varchar(2),
  ADD COLUMN IF NOT EXISTS cst_cofins               varchar(2),
  ADD COLUMN IF NOT EXISTS fator_saca               numeric(6,3) DEFAULT 60.000;

COMMENT ON COLUMN produtos.fator_saca IS 'kg por saca. Cacau = 60. Usado para exibir sacas nos KPIs do lote.';
COMMENT ON COLUMN produtos.ncm IS 'NCM 8 dígitos. Cacau amêndoa seca = 18010000';
COMMENT ON COLUMN produtos.cfop_saida_interna IS 'CFOP saída mesmo estado. Cacau BA = 5101';
COMMENT ON COLUMN produtos.cfop_saida_interestadual IS 'CFOP saída outro estado. Cacau = 6101';
COMMENT ON COLUMN produtos.cst_icms IS 'CST ICMS. Cacau BA isento = 040';
COMMENT ON COLUMN produtos.cst_pis IS 'CST PIS. Cacau isento = 07';
COMMENT ON COLUMN produtos.cst_cofins IS 'CST COFINS. Cacau isento = 07';
