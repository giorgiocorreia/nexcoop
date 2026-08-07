-- ============================================================================
-- 095 — site_conteudos: campos que faltavam para Notícias e Vídeos
-- ============================================================================
--
-- A 085 criou site_conteudos como tabela genérica ("paliativo", nas palavras
-- do próprio PLANO_MODULO_SITE), suficiente para listar evento e promoção.
-- Ao portar noticias.php e videos.php do site da COOPAIBI ficou claro o que
-- faltava: sem `slug` a notícia não tem URL própria (o site já publica
-- /noticias.php?slug=lei-municipal-n-12982025-...), sem corpo longo não há o
-- que abrir ao clicar, e sem `youtube_id` cada exibição de vídeo teria de
-- extrair o id da URL de novo.
--
-- `descricao` continua sendo o resumo/chamada; `conteudo` é o texto integral
-- em HTML, que só a notícia usa.
-- ============================================================================

ALTER TABLE site_conteudos
  -- URL própria da notícia. Único POR ORG: dois clientes podem ter uma
  -- notícia "assembleia-2026" sem colidir.
  ADD COLUMN IF NOT EXISTS slug       text,
  -- Corpo integral em HTML (só notícia usa hoje).
  ADD COLUMN IF NOT EXISTS conteudo   text,
  -- Vídeo: id do YouTube já extraído, e agrupamento na barra lateral.
  ADD COLUMN IF NOT EXISTS youtube_id text,
  ADD COLUMN IF NOT EXISTS categoria  text,
  -- Item em evidência: a notícia da faixa, o vídeo grande no topo da galeria.
  ADD COLUMN IF NOT EXISTS destaque   boolean NOT NULL DEFAULT false;

-- Slug é identificador de URL: só faz sentido em minúsculas, sem acento e
-- sem espaço. A restrição vale apenas quando há slug, porque vídeo e evento
-- não têm.
ALTER TABLE site_conteudos
  DROP CONSTRAINT IF EXISTS site_conteudos_slug_formato;
ALTER TABLE site_conteudos
  ADD CONSTRAINT site_conteudos_slug_formato
  CHECK (slug IS NULL OR slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

-- Índice parcial: só linhas com slug entram, e a unicidade é por org.
CREATE UNIQUE INDEX IF NOT EXISTS uq_site_conteudos_slug_por_org
  ON site_conteudos (organizacao_id, slug)
  WHERE slug IS NOT NULL;

-- Leitura das listas públicas: filtram por org + tipo + ativo e ordenam por
-- destaque/ordem. Sem isto cada visita ao site varre a tabela inteira.
CREATE INDEX IF NOT EXISTS idx_site_conteudos_org_tipo_ativo
  ON site_conteudos (organizacao_id, tipo, ativo, destaque DESC, ordem);

COMMENT ON COLUMN site_conteudos.slug       IS 'URL própria do conteúdo (notícia). Único por organização.';
COMMENT ON COLUMN site_conteudos.conteudo   IS 'Corpo integral em HTML. descricao continua sendo o resumo.';
COMMENT ON COLUMN site_conteudos.youtube_id IS 'Id do vídeo no YouTube, já extraído de url_externa.';
COMMENT ON COLUMN site_conteudos.categoria  IS 'Agrupamento livre (ex.: Palestras) usado na barra lateral de Vídeos.';
COMMENT ON COLUMN site_conteudos.destaque   IS 'Item em evidência na listagem do site.';
