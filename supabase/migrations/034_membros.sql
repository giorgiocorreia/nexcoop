-- Migration 034: Modelo unificado Membro/Produtor/Usuário
-- Nota: o número original era 033, mas 033_changelog.sql já existe.

-- Tabela de membros (vínculo societário, extensão 1:1 de produtores)
create table if not exists membros (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references organizacoes(id),
  produtor_id uuid not null unique references produtores(id),
  usuario_id uuid not null references usuarios(id),
  tipo_org_id uuid, -- FK para tipos_org quando essa tabela existir (backlog)
  numero_matricula text,
  data_admissao date,
  status text not null default 'ativo', -- ativo | inadimplente | desligado
  dados_societarios jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_membros_organizacao on membros(organizacao_id);
create index if not exists idx_membros_produtor on membros(produtor_id);
create index if not exists idx_membros_usuario on membros(usuario_id);

-- Colunas novas em produtores (todas opcionais, não afetam dados existentes)
alter table produtores add column if not exists usuario_id uuid references usuarios(id);
alter table produtores add column if not exists dados_fiscais jsonb not null default '{}';
alter table produtores add column if not exists is_consumidor_final boolean not null default false;

-- RLS para membros (mesmo padrão do restante do projeto)
alter table membros enable row level security;

create policy "membros_select_org" on membros
  for select using (
    organizacao_id = (select organizacao_id from usuarios where id = auth.uid())
  );

create policy "membros_insert_org" on membros
  for insert with check (
    organizacao_id = (select organizacao_id from usuarios where id = auth.uid())
  );

create policy "membros_update_org" on membros
  for update using (
    organizacao_id = (select organizacao_id from usuarios where id = auth.uid())
  );

create policy "membros_delete_org" on membros
  for delete using (
    organizacao_id = (select organizacao_id from usuarios where id = auth.uid())
  );
