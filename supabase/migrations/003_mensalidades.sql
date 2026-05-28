-- =============================================================================
-- Mensalidades: quota-parte em cooperados + tabela de cobranças mensais
-- =============================================================================
-- Execute no Supabase Dashboard → SQL Editor
-- =============================================================================

-- Adiciona quota_parte aos cooperados (valor da cota capital, base p/ mensalidade)
alter table cooperados
  add column if not exists quota_parte numeric(15,2) default 0;

-- Tabela principal
create table mensalidades (
  id               uuid primary key default gen_random_uuid(),
  organizacao_id   uuid not null references organizacoes(id) on delete cascade,
  cooperado_id     uuid not null references cooperados(id) on delete cascade,
  mes_referencia   date not null,             -- sempre dia 1 do mês
  valor            numeric(15,2) not null check (valor >= 0),
  status           text not null default 'pendente'
                     check (status in ('pendente', 'pago', 'vencido')),
  data_vencimento  date not null,
  data_pagamento   date,
  observacoes      text,
  usuario_id       uuid references usuarios(id) on delete set null,
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now(),
  constraint unique_cooperado_mes unique (cooperado_id, mes_referencia)
);

create index on mensalidades (organizacao_id);
create index on mensalidades (cooperado_id);
create index on mensalidades (mes_referencia);
create index on mensalidades (status);

-- RLS
alter table mensalidades enable row level security;

create policy "same_org" on mensalidades
  for all using (organizacao_id = auth_org_id());

-- Trigger atualizado_em
create trigger trg_mensalidades_atualizado
  before update on mensalidades
  for each row execute function set_atualizado_em();
