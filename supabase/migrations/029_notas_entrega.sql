-- Migration 029: Notas de entrega de produto (comprovante interno)

create table notas_entrega (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references organizacoes(id),
  movimentacao_id uuid not null references movimentacoes_conta(id),
  numero_sequencial integer not null,
  status text not null default 'emitida' check (status in ('rascunho', 'emitida', 'cancelada')),

  -- Snapshot dos dados no momento da emissão (imutabilidade)
  snapshot jsonb not null default '{}',

  -- Controle
  emitida_por uuid references usuarios(id),
  emitida_em timestamptz default now(),
  cancelada_em timestamptz,
  cancelada_por uuid references usuarios(id),
  motivo_cancelamento text,

  created_at timestamptz default now(),

  -- Unicidade: uma movimentação = um comprovante ativo por org
  unique(organizacao_id, numero_sequencial),
  unique(movimentacao_id)
);

-- Índices
create index on notas_entrega(organizacao_id);
create index on notas_entrega(movimentacao_id);
create index on notas_entrega(status);

-- Sequência por org: função que retorna próximo número
create or replace function proximo_numero_nota(p_org_id uuid)
returns integer
language plpgsql
as $$
declare
  v_numero integer;
begin
  select coalesce(max(numero_sequencial), 0) + 1
    into v_numero
    from notas_entrega
   where organizacao_id = p_org_id;
  return v_numero;
end;
$$;

-- RLS
alter table notas_entrega enable row level security;

create policy "usuarios da org veem suas notas"
  on notas_entrega for select
  using (
    organizacao_id = (select organizacao_id from usuarios where id = auth.uid())
  );

create policy "usuarios da org inserem notas"
  on notas_entrega for insert
  with check (
    organizacao_id = (select organizacao_id from usuarios where id = auth.uid())
  );

create policy "usuarios da org atualizam notas"
  on notas_entrega for update
  using (
    organizacao_id = (select organizacao_id from usuarios where id = auth.uid())
  );
