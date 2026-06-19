-- Migration 042: fluxo de conferência de caixa

-- loja_caixas: campos de conferência
ALTER TABLE loja_caixas
  ADD COLUMN IF NOT EXISTS status_conferencia  varchar(20)    NOT NULL DEFAULT 'aguardando'
                                               CHECK (status_conferencia IN ('aguardando','conferido','divergente')),
  ADD COLUMN IF NOT EXISTS valor_fisico_especie  numeric(10,2)  NULL,
  ADD COLUMN IF NOT EXISTS valor_fisico_debito   numeric(10,2)  NULL,
  ADD COLUMN IF NOT EXISTS valor_fisico_credito  numeric(10,2)  NULL,
  ADD COLUMN IF NOT EXISTS conferido_por          uuid           NULL REFERENCES usuarios(id),
  ADD COLUMN IF NOT EXISTS conferido_em           timestamptz    NULL,
  ADD COLUMN IF NOT EXISTS observacao_conferencia text           NULL;

-- loja_vendas: nome do pagador PIX
ALTER TABLE loja_vendas
  ADD COLUMN IF NOT EXISTS pix_nome_pagador varchar(100) NULL;

COMMENT ON COLUMN loja_caixas.status_conferencia    IS 'aguardando | conferido | divergente';
COMMENT ON COLUMN loja_caixas.valor_fisico_especie  IS 'Dinheiro contado pelo operador no fechamento';
COMMENT ON COLUMN loja_caixas.valor_fisico_debito   IS 'Total débito informado pelo operador';
COMMENT ON COLUMN loja_caixas.valor_fisico_credito  IS 'Total crédito informado pelo operador';
COMMENT ON COLUMN loja_vendas.pix_nome_pagador      IS 'Nome do pagador informado pelo operador';
