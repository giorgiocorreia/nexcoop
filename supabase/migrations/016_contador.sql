-- Migration 016: Portal do Contador

CREATE TABLE escritorios_contabeis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social TEXT NOT NULL,
  cnpj TEXT,
  crc_responsavel TEXT,
  email_contato TEXT NOT NULL,
  telefone TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE contador_org (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  escritorio_id UUID REFERENCES escritorios_contabeis(id),
  nivel TEXT NOT NULL DEFAULT 'contador' CHECK (nivel IN ('contador','contador_aux')),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  convidado_em TIMESTAMPTZ DEFAULT NOW(),
  aceito_em TIMESTAMPTZ,
  UNIQUE(org_id, usuario_id)
);

ALTER TABLE escritorios_contabeis ENABLE ROW LEVEL SECURITY;
ALTER TABLE contador_org ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_gerencia_contadores" ON contador_org FOR ALL USING (
  org_id IN (SELECT org_id FROM usuarios WHERE id = auth.uid())
);
CREATE POLICY "contador_ve_seus_vinculos" ON contador_org FOR SELECT USING (
  usuario_id = auth.uid()
);
CREATE POLICY "contador_acessa_plano_contas" ON plano_contas FOR SELECT USING (
  org_id IN (SELECT org_id FROM contador_org WHERE usuario_id = auth.uid() AND ativo = TRUE)
);
CREATE POLICY "contador_acessa_partidas" ON partidas FOR ALL USING (
  org_id IN (SELECT org_id FROM contador_org WHERE usuario_id = auth.uid() AND ativo = TRUE)
);
CREATE POLICY "contador_acessa_comentarios" ON comentarios_contabeis FOR ALL USING (
  org_id IN (SELECT org_id FROM contador_org WHERE usuario_id = auth.uid() AND ativo = TRUE)
);
CREATE POLICY "contador_acessa_exercicios" ON exercicios_contabeis FOR SELECT USING (
  org_id IN (SELECT org_id FROM contador_org WHERE usuario_id = auth.uid() AND ativo = TRUE)
);
