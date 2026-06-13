create table if not exists changelog_entries (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  modulo text not null,
  itens jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_changelog_entries_data on changelog_entries (data desc);

alter table changelog_entries enable row level security;

-- Apenas super_admin pode ler
create policy "super_admin_select_changelog"
  on changelog_entries for select
  to authenticated
  using (
    (select role from usuarios where id = auth.uid()) = 'super_admin'
  );

-- Apenas super_admin pode inserir/editar/excluir
create policy "super_admin_all_changelog"
  on changelog_entries for all
  to authenticated
  using (
    (select role from usuarios where id = auth.uid()) = 'super_admin'
  )
  with check (
    (select role from usuarios where id = auth.uid()) = 'super_admin'
  );
