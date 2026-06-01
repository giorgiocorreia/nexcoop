-- =============================================================================
-- Seed: Organização COOPAIBI + usuário admin
-- =============================================================================
-- ATENÇÃO: execute após criar o usuário admin no Supabase Auth Dashboard
-- e substitua os UUIDs abaixo pelos IDs reais gerados.
--
-- Passos:
--  1. No Supabase Dashboard → Authentication → Users → "Add user"
--     Email: admin@coopaibi.coop.br   Senha: (defina uma senha forte)
--  2. Copie o UUID gerado e substitua em admin_auth_id abaixo
--  3. Execute este script no SQL Editor do Supabase
-- =============================================================================

do $$
declare
  org_id        uuid := '3ad97dc2-f87f-4e67-950e-387854d5bccc';  -- aplicado em 2026-05-28
  admin_auth_id uuid := '22543201-bc5e-476c-9fdb-59242c25224a'; -- contato@coopaibi.com.br
begin

  -- Organização
  insert into organizacoes (
    id, nome, nome_curto, cnpj, tipo,
    email, telefone, cidade, estado,
    plano, ativo, onboarding_concluido
  ) values (
    org_id,
    'Cooperativa Agroindustrial de Ibitiara — COOPAIBI',
    'COOPAIBI',
    '54305114000179',
    'cooperativa',
    'contato@coopaibi.coop.br',
    null,
    'Ibitiara',
    'BA',
    'cooperativa',
    true,
    true   -- org criada via seed pelo super_admin; onboarding não é necessário
  )
  on conflict (id) do update set
    cnpj                 = excluded.cnpj,
    onboarding_concluido = true;

  -- Vincula o usuário admin à organização.
  -- funcoes e vinculo são obrigatórios após migration 007 (multi-role).
  -- role = 'org_admin' mantido para compatibilidade com o enum legado.
  update usuarios
  set
    organizacao_id = org_id,
    nome_completo  = 'Administrador COOPAIBI',
    role           = 'org_admin',
    funcoes        = array['admin'],
    vinculo        = 'diretoria',
    ativo          = true
  where id = admin_auth_id;

  -- Garante que o super_admin da plataforma (Giorgio) não tem org vinculada
  -- e mantém role = 'super_admin'. O trigger handle_new_user cria a conta
  -- com role = 'cooperado'; este UPDATE corrige isso.
  update usuarios
  set
    role           = 'super_admin',
    organizacao_id = null,
    nome_completo  = 'Giorgio Correia',
    ativo          = true
  where email = 'gio.pessoal@gmail.com';

  raise notice 'Seed COOPAIBI concluído. org_id = %', org_id;
end;
$$;
