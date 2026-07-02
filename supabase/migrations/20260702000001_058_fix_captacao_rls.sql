-- ============================================================
-- NextCoop — Corrige RLS de oportunidades/logs/perfil_captacao
-- Políticas originais (008) usavam apenas "using", sem "with check",
-- mesmo padrão já corrigido nas tabelas do radar pela migration 010.
-- ============================================================

-- oportunidades
drop policy if exists "oportunidades_org" on oportunidades;
create policy "oportunidades_org" on oportunidades
  for all
  using (organizacao_id = (select organizacao_id from usuarios where id = auth.uid()))
  with check (organizacao_id = (select organizacao_id from usuarios where id = auth.uid()));

-- oportunidade_logs
drop policy if exists "logs_org" on oportunidade_logs;
create policy "logs_org" on oportunidade_logs
  for all
  using (oportunidade_id in (
    select id from oportunidades where organizacao_id = (
      select organizacao_id from usuarios where id = auth.uid()
    )
  ))
  with check (oportunidade_id in (
    select id from oportunidades where organizacao_id = (
      select organizacao_id from usuarios where id = auth.uid()
    )
  ));

-- perfil_captacao
drop policy if exists "perfil_captacao_org" on perfil_captacao;
create policy "perfil_captacao_org" on perfil_captacao
  for all
  using (organizacao_id = (select organizacao_id from usuarios where id = auth.uid()))
  with check (organizacao_id = (select organizacao_id from usuarios where id = auth.uid()));
