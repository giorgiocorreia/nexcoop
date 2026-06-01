-- =============================================================================
-- Fix COOPAIBI — corrige estado do banco em produção
-- =============================================================================
-- Execute no Supabase Dashboard → SQL Editor
-- Roda como postgres (bypassa RLS) — seguro para uso administrativo.
--
-- Problemas corrigidos:
--   1. onboarding_concluido = false  →  true  (causa do loop de redirect)
--   2. funcoes = '{}'               →  {'admin'}  (migration 007 não aplicou ao seed)
--   3. vinculo = null               →  'diretoria'
--   4. CNPJ ausente preenchido
--   5. Giorgio garantido como super_admin sem org vinculada
-- =============================================================================

do $$
declare
  v_org_id        uuid := '3ad97dc2-f87f-4e67-950e-387854d5bccc';
  v_admin_id      uuid := '22543201-bc5e-476c-9fdb-59242c25224a';
  v_giorgio_email text := 'gio.pessoal@gmail.com';
  v_rows          int;
begin

  -- ── 1. Organização COOPAIBI ────────────────────────────────────────────────
  update organizacoes
  set
    onboarding_concluido = true,
    cnpj                 = '54305114000179'
  where id = v_org_id;

  get diagnostics v_rows = row_count;
  raise notice '[1] organizacoes atualizada: % linha(s)', v_rows;

  if v_rows = 0 then
    raise warning '[1] org COOPAIBI não encontrada — verifique o org_id: %', v_org_id;
  end if;

  -- ── 2. Admin da COOPAIBI ───────────────────────────────────────────────────
  update usuarios
  set
    funcoes = array['admin'],
    vinculo = 'diretoria'
  where id = v_admin_id;

  get diagnostics v_rows = row_count;
  raise notice '[2] admin COOPAIBI atualizado: % linha(s)', v_rows;

  if v_rows = 0 then
    raise warning '[2] usuário admin não encontrado — verifique o id: %', v_admin_id;
  end if;

  -- ── 3. Super_admin Giorgio ─────────────────────────────────────────────────
  update usuarios
  set
    role           = 'super_admin',
    organizacao_id = null,
    nome_completo  = 'Giorgio Correia',
    ativo          = true
  where email = v_giorgio_email;

  get diagnostics v_rows = row_count;
  raise notice '[3] Giorgio super_admin atualizado: % linha(s)', v_rows;

  if v_rows = 0 then
    raise warning '[3] usuário Giorgio não encontrado — verifique o email: %', v_giorgio_email;
  end if;

  raise notice '=== Fix COOPAIBI concluído ===';
end;
$$;
