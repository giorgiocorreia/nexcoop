-- ============================================================
-- NextCoop — Cotas de Participação (exclusivo cooperativas)
-- ============================================================

-- Cotas por cooperado (uma linha por cooperado)
create table if not exists cotas_cooperado (
  id             uuid primary key default gen_random_uuid(),
  cooperado_id   uuid references cooperados(id)  on delete cascade not null,
  organizacao_id uuid references organizacoes(id) on delete cascade not null,
  quantidade     integer         not null default 0,
  valor_cota     numeric(15,2)   not null default 0,
  status         text            not null default 'pendente'
                   check (status in ('integralizada', 'parcial', 'pendente')),
  criado_em      timestamptz default now(),
  atualizado_em  timestamptz default now(),
  unique (cooperado_id)
);

-- Histórico de integralizações
create table if not exists cotas_integralizacao (
  id             uuid primary key default gen_random_uuid(),
  cota_id        uuid references cotas_cooperado(id) on delete cascade not null,
  cooperado_id   uuid references cooperados(id)      on delete cascade not null,
  organizacao_id uuid references organizacoes(id)    on delete cascade not null,
  data           date          not null default current_date,
  quantidade     integer       not null,
  valor_pago     numeric(15,2) not null,
  criado_em      timestamptz default now()
);

-- RLS
alter table cotas_cooperado    enable row level security;
alter table cotas_integralizacao enable row level security;

create policy "cotas_cooperado_org" on cotas_cooperado
  for all
  using      (organizacao_id = (select organizacao_id from usuarios where id = auth.uid()))
  with check (organizacao_id = (select organizacao_id from usuarios where id = auth.uid()));

create policy "cotas_integralizacao_org" on cotas_integralizacao
  for all
  using      (organizacao_id = (select organizacao_id from usuarios where id = auth.uid()))
  with check (organizacao_id = (select organizacao_id from usuarios where id = auth.uid()));

-- Trigger atualizado_em
create or replace function trg_set_atualizado_em()
returns trigger language plpgsql as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

create trigger trg_cotas_cooperado_atualizado
  before update on cotas_cooperado
  for each row execute function trg_set_atualizado_em();
