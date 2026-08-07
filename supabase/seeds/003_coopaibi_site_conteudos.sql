-- =============================================================================
-- Seed: conteúdo do site da COOPAIBI vindo do MySQL do cPanel
-- =============================================================================
-- Execute no Supabase Dashboard → SQL Editor, DEPOIS da migration 095.
--
-- Origem: dump de `coopaibi_loja` exportado em 07/08/2026. O conteúdo inteiro
-- do site cabe em 4 linhas — 1 notícia e 3 vídeos. `acoes_eventos` e
-- `promocoes` estão vazias no MySQL (o 8º Festival que aparece na página de
-- Ações é hardcoded no acoes.php), então não há evento nem promoção a trazer.
--
-- Volume assim não justifica script de importação: é transcrição direta, com
-- os textos conferidos contra o que o site publica hoje.
--
-- Idempotente: ON CONFLICT no slug, e os vídeos são inseridos só se ainda não
-- houver vídeo com o mesmo youtube_id para a org.
-- =============================================================================

DO $$
DECLARE
  org_coopaibi uuid := '3ad97dc2-f87f-4e67-950e-387854d5bccc';
BEGIN

  -- ── NOTÍCIA ───────────────────────────────────────────────────────────────
  -- O slug é o que o site já publica hoje em /noticias.php?slug=... — mantê-lo
  -- preserva qualquer link que a cooperativa tenha compartilhado.
  INSERT INTO site_conteudos
    (organizacao_id, tipo, titulo, slug, descricao, conteudo, imagem_url, destaque, ativo, ordem)
  VALUES (
    org_coopaibi,
    'noticia',
    'Lei Municipal nº 1.298/2025 — COOPAIBI declarada de Utilidade Pública',
    'lei-municipal-n-12982025-coopaibi-declarada-de-utilidade-publica',
    'A Câmara Municipal de Ibirataia aprovou por unanimidade a Lei nº 1.298/2025, declarando a COOPAIBI de Utilidade Pública Municipal.',
    '<p>A Câmara Municipal de Ibirataia aprovou por unanimidade a Lei nº 1.298/2025, declarando a Cooperativa Mista Agropecuária de Ibirataia — COOPAIBI — de Utilidade Pública Municipal. O reconhecimento reforça a credibilidade institucional da cooperativa junto a patrocinadores e parceiros nacionais e internacionais, e consolida seu papel no desenvolvimento sustentável da agricultura familiar no Médio Rio de Contas.</p>',
    -- A imagem veio do cPanel (uploads/noticias/) e está copiada byte a byte
    -- em public/sites/coopaibi/uploads/. Caminho absoluto do próprio site,
    -- para não depender do cPanel continuar no ar depois da virada de DNS.
    '/sites/coopaibi/uploads/noticias/noticia_6a14aeecd5d5f.webp',
    true,
    true,
    0
  )
  ON CONFLICT (organizacao_id, slug) WHERE slug IS NOT NULL DO NOTHING;

  -- Se a notícia já tinha sido inserida sem imagem (primeira execução deste
  -- seed, antes de eu notar que o site publica uma), preenche agora.
  UPDATE site_conteudos
     SET imagem_url = '/sites/coopaibi/uploads/noticias/noticia_6a14aeecd5d5f.webp'
   WHERE organizacao_id = org_coopaibi
     AND slug = 'lei-municipal-n-12982025-coopaibi-declarada-de-utilidade-publica'
     AND imagem_url IS NULL;

  -- ── VÍDEOS ────────────────────────────────────────────────────────────────
  -- Atenção: no MySQL, os vídeos 2 e 3 ("Parte 2" e "Parte Final") apontam
  -- para o MESMO youtube_id (Oo63UyZKkMU). Provável erro de cadastro no admin
  -- do site antigo — um dos dois deve apontar para outro vídeo. Mantidos como
  -- estão para não inventar dado; a cooperativa corrige pelo painel.
  INSERT INTO site_conteudos
    (organizacao_id, tipo, titulo, descricao, url_externa, youtube_id, categoria, destaque, ativo, ordem)
  SELECT * FROM (VALUES
    (org_coopaibi, 'video',
     '8 Festival Nacional do AgroChocolate',
     'Abertura do 8 Festival Nacional do AgroChocolate. Palestrante: João Matheus, presidente da COOPAIBI.',
     'https://www.youtube.com/watch?v=VZeFJydhgJ0', 'VZeFJydhgJ0', 'Palestras', true, true, 0),
    (org_coopaibi, 'video',
     'Palestra 8 AgroChocolate - Parte 2',
     NULL,
     'https://www.youtube.com/watch?v=Oo63UyZKkMU', 'Oo63UyZKkMU', 'Palestras', false, true, 1),
    (org_coopaibi, 'video',
     'Palestra 8 AgroChocolate - Parte Final',
     NULL,
     'https://www.youtube.com/watch?v=Oo63UyZKkMU', 'Oo63UyZKkMU', 'Palestras', false, true, 2)
  ) AS novo(organizacao_id, tipo, titulo, descricao, url_externa, youtube_id, categoria, destaque, ativo, ordem)
  WHERE NOT EXISTS (
    SELECT 1 FROM site_conteudos existente
    WHERE existente.organizacao_id = novo.organizacao_id
      AND existente.tipo = 'video'
      AND existente.titulo = novo.titulo
  );

END $$;

-- Conferência
SELECT tipo, titulo, slug, youtube_id, categoria, destaque
FROM site_conteudos
WHERE organizacao_id = '3ad97dc2-f87f-4e67-950e-387854d5bccc'
ORDER BY tipo, ordem;
