-- 065 — Venda antecipada de produto (saldo negativo em produto, nunca em R$)
--
-- Contexto: produtor sem saldo (ou com saldo insuficiente) pode vender
-- produto antecipado no caixa ("Pagar produtor") — o saldo de PRODUTO passa
-- a negativo (dívida em @/kg), e a liquidação acontece sozinha quando ele
-- entregar (o recompute da 064 já soma entrega normalmente). O saldo em R$
-- NUNCA pode ficar negativo — essa é a invariante que este arquivo trava.
--
-- ACHADO (2026-07-14): existia uma conta com saldo_financeiro negativo em
-- produção (contas_produtor.id = 82616660-5212-40cc-b39a-0bd9e076ede4,
-- produtor "Nilton Novaes Silva Junior", -R$360,00) — origem anterior a essa
-- mudança. Por isso a constraint entrou como NOT VALID nesta migration.
--
-- RESOLVIDO (2026-07-14, decisão do Giorgio): lançados ajuste_financeiro
-- (+R$360, zera o saldo) e ajuste_produto (+15kg, vira -15kg de débito em
-- Amêndoas secas de cacau — venda antecipada retroativa) na conta acima.
-- Constraint validada em produção via `ALTER TABLE contas_produtor VALIDATE
-- CONSTRAINT saldo_financeiro_nao_negativo;` — gap fechado, todas as linhas
-- hoje respeitam a invariante.
alter table contas_produtor
  add constraint saldo_financeiro_nao_negativo check (saldo_financeiro >= 0) not valid;

alter table contas_produtor
  validate constraint saldo_financeiro_nao_negativo;
