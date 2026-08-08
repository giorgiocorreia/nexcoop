-- ============================================================================
-- 096 — site_leads: quem se interessa pelo site vira registro no sistema
-- ============================================================================
--
-- Os formulários do site da COOPAIBI (adesão de cooperado, proposta de
-- parceria, agendamento de entrega de cacau) sempre foram PHP chamando
-- mail(): o lead virava um e-mail em contato@coopaibi.com.br e morria na
-- caixa de entrada. Ninguém consegue dizer quantos interessados chegaram no
-- mês, quais foram respondidos, quais viraram cooperado.
--
-- A Fase 1 do PLANO_MODULO_SITE já previa "endpoint de captação" para
-- resolver isso. A implementação anterior (app/api/site/[slug]/interesse)
-- gravava em site_conteudos com tipo='pagina' e ativo=false, e o comentário
-- do próprio arquivo registra que era paliativo por não haver migration
-- disponível na ocasião. Esta tabela é o lugar certo.
--
-- Motivo de fazer isto AGORA: com a virada de DNS o cPanel deixa de servir o
-- site, e os .php dos formulários morrem junto. Ou os formulários passam a
-- ser atendidos aqui, ou param de funcionar.
-- ============================================================================

CREATE TABLE IF NOT EXISTS site_leads (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id  uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,

  -- Qual formulário originou. Os três do site hoje; a lista cresce junto
  -- com os formulários.
  tipo            text NOT NULL CHECK (tipo IN ('cooperado', 'parceria', 'agendamento_cacau')),

  -- Campos comuns aos três, promovidos a coluna para dar para listar,
  -- ordenar e buscar sem abrir o jsonb.
  nome            text NOT NULL,
  email           text,
  telefone        text,
  mensagem        text,

  -- O resto de cada formulário, que difere bastante entre eles: o de
  -- cooperado tem CPF/área/perfil, o de parceria tem empresa/cargo/cota, o
  -- de cacau tem quantidade/data preferencial. Promover tudo a coluna
  -- deixaria a tabela cheia de nulos.
  dados           jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Acompanhamento. `novo` é o estado de chegada; o resto a org atualiza.
  status          text NOT NULL DEFAULT 'novo'
                  CHECK (status IN ('novo', 'em_contato', 'convertido', 'descartado')),
  observacoes     text,

  -- Procedência, útil para saber que página converte e para investigar
  -- envio automatizado.
  origem          text,
  user_agent      text,
  ip              text,

  criado_em       timestamptz NOT NULL DEFAULT now(),
  atualizado_em   timestamptz NOT NULL DEFAULT now()
);

-- Listagem do painel: por org, mais recentes primeiro, com filtro de status.
CREATE INDEX IF NOT EXISTS idx_site_leads_org_criado
  ON site_leads (organizacao_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_site_leads_org_status
  ON site_leads (organizacao_id, status, criado_em DESC);

CREATE OR REPLACE FUNCTION set_site_leads_atualizado()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.atualizado_em := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_site_leads_atualizado ON site_leads;
CREATE TRIGGER trg_site_leads_atualizado
  BEFORE UPDATE ON site_leads
  FOR EACH ROW EXECUTE FUNCTION set_site_leads_atualizado();

-- ── RLS ─────────────────────────────────────────────────────────────────────
-- Mesmo padrão de site_conteudos (085): membro lê o que é da própria org.
--
-- NÃO existe policy de INSERT de propósito. Quem grava é o servidor, pela
-- rota do formulário, com service_role — que ignora RLS. Um visitante
-- anônimo não tem sessão e não deve poder escrever direto na tabela: a
-- validação e o limite de tamanho estão na rota, e abrir INSERT público
-- daria para inundar a tabela sem passar por eles.
ALTER TABLE site_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "membros leem site_leads da propria org" ON site_leads
  FOR SELECT USING (
    organizacao_id = (select organizacao_id from usuarios where id = auth.uid())
  );

CREATE POLICY "membros atualizam site_leads da propria org" ON site_leads
  FOR UPDATE USING (
    organizacao_id = (select organizacao_id from usuarios where id = auth.uid())
  )
  WITH CHECK (
    organizacao_id = (select organizacao_id from usuarios where id = auth.uid())
  );

COMMENT ON TABLE  site_leads          IS 'Interessados vindos dos formulários do site público da organização.';
COMMENT ON COLUMN site_leads.dados    IS 'Campos específicos de cada formulário, que não viraram coluna.';
COMMENT ON COLUMN site_leads.origem   IS 'Página/URL de onde o formulário foi enviado.';

-- Reverter:
-- DROP POLICY IF EXISTS "membros atualizam site_leads da propria org" ON site_leads;
-- DROP POLICY IF EXISTS "membros leem site_leads da propria org" ON site_leads;
-- DROP TRIGGER IF EXISTS trg_site_leads_atualizado ON site_leads;
-- DROP FUNCTION IF EXISTS set_site_leads_atualizado();
-- DROP TABLE IF EXISTS site_leads;
