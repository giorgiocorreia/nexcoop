-- Migration 088: bucket de storage 'comprovantes' + policies
-- Necessário para a baixa de mensalidade com comprovante PIX (migration 087 +
-- lib/mensalidades/comprovante.actions.ts / MensalidadesAssociadoSection).
-- O upload usa createClient() (usuário autenticado) e getPublicUrl → bucket público.
-- Aplicar via: Supabase Dashboard → SQL Editor.

insert into storage.buckets (id, name, public)
values ('comprovantes', 'comprovantes', true)
on conflict (id) do nothing;

-- Usuário autenticado pode enviar comprovante.
create policy "comprovantes_insert_auth" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'comprovantes');

-- Leitura por usuário autenticado (bucket público também serve leitura via URL).
create policy "comprovantes_select_auth" on storage.objects
  for select to authenticated
  using (bucket_id = 'comprovantes');

-- Rollback (comentado):
-- drop policy if exists "comprovantes_insert_auth" on storage.objects;
-- drop policy if exists "comprovantes_select_auth" on storage.objects;
-- delete from storage.buckets where id = 'comprovantes';
