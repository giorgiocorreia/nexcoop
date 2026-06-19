-- Migration 041: dados de pagamento complementares em loja_vendas

ALTER TABLE loja_vendas
  ADD COLUMN IF NOT EXISTS tipo_cartao        varchar(10)   NULL,
  ADD COLUMN IF NOT EXISTS cartao_nsu         varchar(50)   NULL,
  ADD COLUMN IF NOT EXISTS cartao_autorizacao varchar(50)   NULL,
  ADD COLUMN IF NOT EXISTS pix_identificador  varchar(100)  NULL,
  ADD COLUMN IF NOT EXISTS desconto_total     numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pago_saldo         numeric(10,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN loja_vendas.tipo_cartao        IS 'debito ou credito';
COMMENT ON COLUMN loja_vendas.cartao_nsu         IS 'NSU/comprovante da maquininha';
COMMENT ON COLUMN loja_vendas.cartao_autorizacao IS 'Código de autorização da operadora';
COMMENT ON COLUMN loja_vendas.pix_identificador  IS 'Identificador/comprovante do PIX';
COMMENT ON COLUMN loja_vendas.desconto_total     IS 'Total de descontos aplicados na venda';
COMMENT ON COLUMN loja_vendas.pago_saldo         IS 'Valor pago via saldo conta corrente cooperado';
