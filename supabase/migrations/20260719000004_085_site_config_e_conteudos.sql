-- Migration 085: Módulo Site — site_config + site_conteudos (schema base)
-- Aplicar via: Supabase Dashboard → SQL Editor
-- Data: 2026-07-19
--
-- Fase 2 do módulo Site institucional multi-tenant (docs/PLANO_MODULO_SITE.md).
-- Cria apenas o schema (config por org + itens de conteúdo dinâmico). Nada de
-- middleware/rota/painel de edição aqui — isso vem em PRs de aplicação depois
-- que esta migration estiver aplicada em produção.
--
-- site_config: 1 linha por organização, controla slug (subdomínio), domínio
-- próprio (addon futuro), publicação, indexação e o conteúdo editorial (tema
-- + textos) como JSONB — sem editor visual, textos ficam em `conteudo` até
-- existir um painel de edição.
--
-- site_conteudos: itens de conteúdo dinâmico (eventos, vídeos, promoções,
-- notícias, páginas soltas) — N por organização.
--
-- IMPORTANTE (RLS): as páginas PÚBLICAS do site (subdomínio de visitante
-- anônimo) são servidas pelo server via createAdminClient() (service_role,
-- ignora RLS) — não via cliente anon do navegador. Por isso as policies
-- abaixo cobrem SOMENTE o acesso autenticado (membros da org, no
-- Configurações → Site do painel interno); não existe policy de SELECT para
-- `anon`, e isso é proposital, não um esquecimento.
-- ============================================================================

-- ── site_config ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS site_config (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id   uuid NOT NULL UNIQUE REFERENCES organizacoes(id) ON DELETE CASCADE,
  slug             text NOT NULL UNIQUE
                     CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,40}$'),
  dominio_custom   text UNIQUE,
  publicado        boolean NOT NULL DEFAULT false,
  indexavel        boolean NOT NULL DEFAULT false,
  tema             jsonb NOT NULL DEFAULT '{}'::jsonb,
  conteudo         jsonb NOT NULL DEFAULT '{}'::jsonb,
  secoes_ativas    text[] NOT NULL DEFAULT '{}',
  criado_em        timestamptz NOT NULL DEFAULT now(),
  atualizado_em    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE site_config IS
  'Configuração do site institucional por organização (1:1). slug = subdomínio (slug.nexcoop.com.br), dominio_custom = addon de domínio próprio. publicado/indexavel controlam a convivência com o site antigo durante a migração (ver docs/PLANO_MODULO_SITE.md).';
COMMENT ON COLUMN site_config.indexavel IS
  'Controla noindex/robots durante a convivência com o site institucional antigo (ex.: coopaibi.com.br em cPanel) — evita concorrência de SEO até a org decidir migrar o DNS.';

CREATE TRIGGER trg_site_config_atualizado
  BEFORE UPDATE ON site_config
  FOR EACH ROW EXECUTE FUNCTION trg_set_atualizado_em();

ALTER TABLE site_config ENABLE ROW LEVEL SECURITY;

-- SELECT: membros da própria org (painel interno). Leitura pública do site
-- NÃO passa por aqui — ver nota no topo do arquivo.
CREATE POLICY "membros leem site_config da propria org" ON site_config
  FOR SELECT USING (
    organizacao_id = (select organizacao_id from usuarios where id = auth.uid())
  );

-- INSERT/UPDATE/DELETE: só admin da org
CREATE POLICY "admin gerencia site_config da propria org" ON site_config
  FOR ALL USING (
    organizacao_id = (select organizacao_id from usuarios where id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()
        AND funcoes && ARRAY['admin']
    )
  )
  WITH CHECK (
    organizacao_id = (select organizacao_id from usuarios where id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()
        AND funcoes && ARRAY['admin']
    )
  );

-- ── site_conteudos ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS site_conteudos (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id   uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  tipo             text NOT NULL CHECK (tipo IN ('evento', 'video', 'promocao', 'noticia', 'pagina')),
  titulo           text NOT NULL,
  descricao        text,
  imagem_url       text,
  url_externa      text,
  data_evento      date,
  ordem            integer NOT NULL DEFAULT 0,
  ativo            boolean NOT NULL DEFAULT true,
  criado_em        timestamptz NOT NULL DEFAULT now(),
  atualizado_em    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE site_conteudos IS
  'Itens de conteúdo dinâmico do site institucional (eventos, vídeos, promoções, notícias, páginas soltas), N por organização. data_evento só se aplica a tipo=evento; url_externa cobre casos como link de vídeo do YouTube.';

CREATE INDEX IF NOT EXISTS idx_site_conteudos_org_tipo_ativo
  ON site_conteudos (organizacao_id, tipo, ativo);

CREATE TRIGGER trg_site_conteudos_atualizado
  BEFORE UPDATE ON site_conteudos
  FOR EACH ROW EXECUTE FUNCTION trg_set_atualizado_em();

ALTER TABLE site_conteudos ENABLE ROW LEVEL SECURITY;

-- SELECT: membros da própria org (painel interno). Leitura pública do site
-- NÃO passa por aqui — ver nota no topo do arquivo.
CREATE POLICY "membros leem site_conteudos da propria org" ON site_conteudos
  FOR SELECT USING (
    organizacao_id = (select organizacao_id from usuarios where id = auth.uid())
  );

-- INSERT/UPDATE/DELETE: só admin da org
CREATE POLICY "admin gerencia site_conteudos da propria org" ON site_conteudos
  FOR ALL USING (
    organizacao_id = (select organizacao_id from usuarios where id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()
        AND funcoes && ARRAY['admin']
    )
  )
  WITH CHECK (
    organizacao_id = (select organizacao_id from usuarios where id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()
        AND funcoes && ARRAY['admin']
    )
  );

-- ── Seed: COOPAIBI (piloto do módulo, ver docs/PLANO_MODULO_SITE.md) ───────

INSERT INTO site_config (organizacao_id, slug, publicado, indexavel)
VALUES ('3ad97dc2-f87f-4e67-950e-387854d5bccc', 'coopaibi', false, false)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Rollback (comentado):
-- DROP POLICY IF EXISTS "admin gerencia site_conteudos da propria org" ON site_conteudos;
-- DROP POLICY IF EXISTS "membros leem site_conteudos da propria org" ON site_conteudos;
-- DROP TRIGGER IF EXISTS trg_site_conteudos_atualizado ON site_conteudos;
-- DROP TABLE IF EXISTS site_conteudos;
-- DROP POLICY IF EXISTS "admin gerencia site_config da propria org" ON site_config;
-- DROP POLICY IF EXISTS "membros leem site_config da propria org" ON site_config;
-- DROP TRIGGER IF EXISTS trg_site_config_atualizado ON site_config;
-- DROP TABLE IF EXISTS site_config;
