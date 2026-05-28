-- =============================================================================
-- NextCoop — Storage: criação de buckets + políticas RLS completas
-- =============================================================================
-- Autocontido. Pode ser rodado múltiplas vezes (idempotente via ON CONFLICT).
-- NÃO usa auth_org_id() — usa subquery direta em `usuarios`.
-- Substitui / consolida 002_storage_policies.sql.
-- =============================================================================

-- ── 1. Buckets ────────────────────────────────────────────────────────────────

-- documentos: público para que getPublicUrl() funcione sem token
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documentos',
  'documentos',
  true,
  20971520,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/png', 'image/jpeg', 'image/webp'
  ]
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- avatares: logos de organização e fotos de cooperados (público, max 5 MB)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatares',
  'avatares',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ── 2. Remover políticas anteriores (idempotência) ───────────────────────────

drop policy if exists "documentos_upload"  on storage.objects;
drop policy if exists "documentos_read"    on storage.objects;
drop policy if exists "documentos_update"  on storage.objects;
drop policy if exists "documentos_delete"  on storage.objects;
drop policy if exists "avatares_upload"    on storage.objects;
drop policy if exists "avatares_read"      on storage.objects;
drop policy if exists "avatares_update"    on storage.objects;
drop policy if exists "avatares_delete"    on storage.objects;

-- ── 3. Políticas — bucket "documentos" ───────────────────────────────────────
-- Estrutura de path: {organizacao_id}/{categoria}/{timestamp}.{ext}

create policy "documentos_upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'documentos'
    and (storage.foldername(name))[1] = (
      select organizacao_id::text from usuarios where id = auth.uid()
    )
  );

create policy "documentos_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'documentos'
    and (storage.foldername(name))[1] = (
      select organizacao_id::text from usuarios where id = auth.uid()
    )
  );

create policy "documentos_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'documentos'
    and (storage.foldername(name))[1] = (
      select organizacao_id::text from usuarios where id = auth.uid()
    )
  );

-- exclusão: apenas org_admin e super_admin
create policy "documentos_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'documentos'
    and (storage.foldername(name))[1] = (
      select organizacao_id::text from usuarios where id = auth.uid()
    )
    and (
      select role from usuarios where id = auth.uid()
    ) in ('org_admin', 'super_admin')
  );

-- ── 4. Políticas — bucket "avatares" ─────────────────────────────────────────
-- Estrutura de path: {organizacao_id}/logo/logo.{ext}
--                    {organizacao_id}/cooperados/{cooperado_id}.{ext}

-- upload: qualquer membro autenticado da org (cooperado pode subir própria foto)
create policy "avatares_upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatares'
    and (storage.foldername(name))[1] = (
      select organizacao_id::text from usuarios where id = auth.uid()
    )
  );

-- leitura autenticada (bucket é público, mas mantém controle via RLS)
create policy "avatares_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatares');

-- substituição: apenas org_admin ou super_admin
create policy "avatares_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatares'
    and (storage.foldername(name))[1] = (
      select organizacao_id::text from usuarios where id = auth.uid()
    )
    and (
      select role from usuarios where id = auth.uid()
    ) in ('org_admin', 'super_admin')
  );

-- exclusão: apenas org_admin ou super_admin
create policy "avatares_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatares'
    and (storage.foldername(name))[1] = (
      select organizacao_id::text from usuarios where id = auth.uid()
    )
    and (
      select role from usuarios where id = auth.uid()
    ) in ('org_admin', 'super_admin')
  );
