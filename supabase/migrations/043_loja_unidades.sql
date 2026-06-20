-- Migration 043: unidades de medida dinâmicas na loja

-- 1. Remove CHECK constraint fixo de loja_produtos
ALTER TABLE loja_produtos
  DROP CONSTRAINT IF EXISTS loja_produtos_unidade_check;

-- 2. Cria tabela de unidades configuráveis por org
CREATE TABLE IF NOT EXISTS loja_unidades (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  nome       varchar(20) NOT NULL,
  sigla      varchar(10) NOT NULL,
  ativo      boolean NOT NULL DEFAULT true,
  criado_em  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, nome)
);

CREATE INDEX IF NOT EXISTS idx_loja_unidades_org ON loja_unidades(org_id);

ALTER TABLE loja_unidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_own_unidades" ON loja_unidades
  FOR ALL USING (
    org_id = (SELECT organizacao_id FROM usuarios WHERE id = auth.uid())
  );

-- 3. Insere unidades padrão para todas as orgs que já têm produtos
INSERT INTO loja_unidades (org_id, nome, sigla)
SELECT DISTINCT org_id, u.nome, u.sigla
FROM loja_produtos
CROSS JOIN (VALUES
  ('kg',       'kg'),
  ('litro',    'L'),
  ('unidade',  'un'),
  ('saco',     'sc'),
  ('caixa',    'cx'),
  ('fardo',    'fd'),
  ('tonelada', 't'),
  ('duzia',    'dz'),
  ('pacote',   'pct'),
  ('frasco',   'fr'),
  ('garrafa',  'gf'),
  ('balde',    'bd')
) AS u(nome, sigla)
ON CONFLICT DO NOTHING;
