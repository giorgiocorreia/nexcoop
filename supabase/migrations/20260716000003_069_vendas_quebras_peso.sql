-- 069 — vendas_quebras_peso: quebra de peso no transporte/destino
--
-- Cacau comprado quente perde peso até chegar ao destino. O comprador paga
-- pelo peso RECEBIDO, não pelo peso faturado — então a quebra reduz o valor
-- a receber da venda (o lançamento financeiro é ajustado pela aplicação) e a
-- cooperativa absorve a diferença. Não é devolução: a mercadoria não volta e
-- não existe NF-e de devolução, por isso tabela própria sem campos fiscais.
--
-- IMPORTANTE — o que esta migration NÃO faz, de propósito:
-- - NÃO altera quantidade_kg/preco_kg da venda (valor_bruto é GENERATED e a
--   NF-e foi emitida com o peso de saída, que está correto).
-- - NÃO mexe em resultado_safra_snapshot: receita bruta e FUNRURAL seguem a
--   NF-e emitida, que não muda com a quebra. Não "corrigir" isso depois.
--
-- Rodar no SQL Editor do Supabase Dashboard.

create table vendas_quebras_peso (
  id              uuid primary key default gen_random_uuid(),
  organizacao_id  uuid not null references organizacoes(id) on delete cascade,
  venda_id        uuid not null references vendas_externas(id) on delete cascade,
  quantidade_kg   numeric(10,3) not null check (quantidade_kg > 0),
  -- snapshot do preco_kg da venda no momento do registro (não FK/leitura dinâmica)
  valor_unitario  numeric(10,4) not null check (valor_unitario > 0),
  valor_total     numeric(12,2) generated always as (
    round((quantidade_kg * valor_unitario)::numeric, 2)
  ) stored,
  motivo          text,
  criado_em       timestamptz not null default now()
);

create index on vendas_quebras_peso (venda_id);
create index on vendas_quebras_peso (organizacao_id, criado_em desc);

alter table vendas_quebras_peso enable row level security;

create policy "same_org" on vendas_quebras_peso
  for all using (
    organizacao_id = (select organizacao_id from usuarios where id = auth.uid())
  );

comment on table vendas_quebras_peso is
  'Quebra de peso constatada no destino (cacau quente perde peso). Comprador paga o peso recebido; a aplicação reduz o valor a receber do lançamento da venda. Cooperativa absorve. Não altera NF-e, valor_bruto nem resultado_safra_snapshot.';
