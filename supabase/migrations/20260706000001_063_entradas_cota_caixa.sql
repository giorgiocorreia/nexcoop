-- Migration 063: Entradas automáticas de integralização de cota no caixa da comercialização
--
-- Problema: pagamento de cota de cooperado (dinheiro/pix/cartão) gerava lançamento
-- no Financeiro mas não tinha nenhum rastro no caixa da comercialização — não é
-- venda de produto (não passa por movimentacoes_conta) e não é aporte/sangria manual
-- (não deve exigir reautenticação de admin, já é dinheiro de um pagamento já validado
-- no cadastro do cooperado). Reaproveita aportes_sangrias como o registro de entrada,
-- distinguindo por origem/forma_pagamento pra não confundir com aporte manual em espécie.

ALTER TABLE aportes_sangrias
  ADD COLUMN IF NOT EXISTS forma_pagamento text NOT NULL DEFAULT 'especie'
    CHECK (forma_pagamento IN ('especie', 'pix', 'cartao')),
  ADD COLUMN IF NOT EXISTS origem text NOT NULL DEFAULT 'manual'
    CHECK (origem IN ('manual', 'cota_cooperado'));

COMMENT ON COLUMN aportes_sangrias.forma_pagamento IS
  'Aporte manual pela tela de caixa é sempre espécie. Entrada automática de cota pode ser espécie/pix/cartão — só espécie mexe no saldo físico (saldo_especie_calculado); pix/cartão só somam nos totais informativos de sessoes_caixa.';
COMMENT ON COLUMN aportes_sangrias.origem IS
  'manual: operador registrou na tela de caixa (aporte/sangria de verdade, exige reautenticação de admin). cota_cooperado: gerado automaticamente ao registrar pagamento de cota no cadastro do cooperado, sem reautenticação.';

ALTER TABLE sessoes_caixa
  ADD COLUMN IF NOT EXISTS total_entradas_pix numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_entradas_cartao numeric(12,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN sessoes_caixa.total_entradas_pix IS
  'Soma de entradas via Pix não vindas de venda de produto (ex: integralização de cota). Não afeta saldo_especie_calculado.';
COMMENT ON COLUMN sessoes_caixa.total_entradas_cartao IS
  'Soma de entradas via cartão não vindas de venda de produto (ex: integralização de cota). Não afeta saldo_especie_calculado.';
