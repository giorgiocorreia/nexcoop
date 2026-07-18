-- Migration 079: parcelas de compra a prazo na Loja Agropecuária
-- Aplicar via: Supabase Dashboard → SQL Editor
-- Data: 2026-07-17

-- ============================================================
-- Contexto
--
-- Hoje `loja_compras` sempre gera um lançamento financeiro já "pago"
-- na hora (lib/loja/actions.ts), sem suportar compra a prazo (boleto
-- parcelado, ex. 10/20/30 dias). Esta migration cria uma tabela
-- satélite `loja_compra_parcelas`, no mesmo padrão de `cota_pagamentos`
-- (migration 046), para registrar cada parcela individualmente com
-- seu próprio vencimento, status e forma de pagamento na baixa.
-- ============================================================

create table loja_compra_parcelas (
  id               uuid primary key default gen_random_uuid(),
  compra_id        uuid not null references loja_compras(id) on delete cascade,
  org_id           uuid not null references organizacoes(id) on delete cascade,
  numero_parcela   integer not null default 1,
  total_parcelas   integer not null default 1,
  valor            numeric(12,2) not null check (valor > 0),
  forma_pagamento  text null check (forma_pagamento in ('dinheiro','pix','cartao')),
  status           text not null default 'pendente' check (status in ('pago','pendente','vencido')),
  data_vencimento  date not null,
  data_pagamento   date null,
  registrado_por   uuid null references usuarios(id) on delete set null,
  observacoes      text null,
  criado_em        timestamptz not null default now()
);

create index idx_loja_compra_parcelas_compra      on loja_compra_parcelas(compra_id);
create index idx_loja_compra_parcelas_org         on loja_compra_parcelas(org_id);
create index idx_loja_compra_parcelas_status      on loja_compra_parcelas(status);
create index idx_loja_compra_parcelas_vencimento  on loja_compra_parcelas(data_vencimento);

alter table loja_compra_parcelas enable row level security;

-- Política de SELECT: qualquer membro da organização
create policy "org members can view loja_compra_parcelas"
  on loja_compra_parcelas for select
  using (org_id = (select organizacao_id from usuarios where id = auth.uid()));

-- Política de INSERT: restrita a admin ou gerente_loja
create policy "admin ou gerente_loja pode inserir loja_compra_parcelas"
  on loja_compra_parcelas for insert
  with check (
    org_id = (select organizacao_id from usuarios where id = auth.uid())
    and exists (
      select 1 from usuarios
      where id = auth.uid()
        and funcoes && array['admin', 'gerente_loja']
    )
  );

-- Política de UPDATE: restrita a admin ou gerente_loja (baixa da parcela:
-- status, forma_pagamento, data_pagamento)
create policy "admin ou gerente_loja pode atualizar loja_compra_parcelas"
  on loja_compra_parcelas for update
  using (
    org_id = (select organizacao_id from usuarios where id = auth.uid())
    and exists (
      select 1 from usuarios
      where id = auth.uid()
        and funcoes && array['admin', 'gerente_loja']
    )
  )
  with check (
    org_id = (select organizacao_id from usuarios where id = auth.uid())
    and exists (
      select 1 from usuarios
      where id = auth.uid()
        and funcoes && array['admin', 'gerente_loja']
    )
  );

-- Rollback (comentado):
-- DROP POLICY IF EXISTS "org members can view loja_compra_parcelas" ON loja_compra_parcelas;
-- DROP POLICY IF EXISTS "admin ou gerente_loja pode inserir loja_compra_parcelas" ON loja_compra_parcelas;
-- DROP POLICY IF EXISTS "admin ou gerente_loja pode atualizar loja_compra_parcelas" ON loja_compra_parcelas;
-- DROP TABLE IF EXISTS loja_compra_parcelas;
