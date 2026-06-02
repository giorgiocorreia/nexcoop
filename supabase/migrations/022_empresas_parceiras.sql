-- Tabela genérica de empresas parceiras
CREATE TABLE empresas_parceiras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  razao_social TEXT NOT NULL,
  cnpj TEXT,
  email_contato TEXT NOT NULL,
  telefone TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN ('contabilidade','fornecedor','transportadora','assistencia_tecnica','certificadora','outro')),
  modulos_acesso TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('ativo','inativo','pendente')),
  site TEXT,
  cidade TEXT,
  estado TEXT,
  observacoes TEXT,
  convidado_em TIMESTAMPTZ DEFAULT NOW(),
  aceito_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profissionais da empresa parceira
CREATE TABLE profissionais_parceiros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas_parceiras(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES auth.users(id),
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  cargo TEXT,
  crc TEXT,
  nivel TEXT NOT NULL DEFAULT 'operador' CHECK (nivel IN ('responsavel','operador','consultor')),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  convidado_em TIMESTAMPTZ DEFAULT NOW(),
  aceito_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(empresa_id, email)
);

-- Migrar dados existentes de escritorios_contabeis para empresas_parceiras
-- (executar apenas se houver dados — safe com ON CONFLICT)
INSERT INTO empresas_parceiras (
  org_id, razao_social, cnpj, email_contato, telefone,
  tipo, modulos_acesso, status, created_at
)
SELECT
  co.org_id,
  ec.razao_social,
  ec.cnpj,
  ec.email_contato,
  ec.telefone,
  'contabilidade',
  ARRAY['contabil','financeiro_leitura','cooperados_leitura'],
  CASE WHEN co.ativo THEN 'ativo' ELSE 'inativo' END,
  ec.created_at
FROM escritorios_contabeis ec
JOIN contador_org co ON co.escritorio_id = ec.id
ON CONFLICT DO NOTHING;

-- Migrar profissionais de contador_org para profissionais_parceiros
INSERT INTO profissionais_parceiros (
  empresa_id, usuario_id, nome, email, nivel, ativo, convidado_em, aceito_em
)
SELECT
  ep.id,
  co.usuario_id,
  COALESCE(u.nome_completo, u.email, 'Contador'),
  COALESCE(u.email, ''),
  CASE co.nivel
    WHEN 'contador' THEN 'operador'
    WHEN 'contador_aux' THEN 'consultor'
    ELSE 'operador'
  END,
  co.ativo,
  co.convidado_em,
  co.aceito_em
FROM contador_org co
JOIN empresas_parceiras ep ON ep.org_id = co.org_id AND ep.tipo = 'contabilidade'
LEFT JOIN usuarios u ON u.id = co.usuario_id
ON CONFLICT DO NOTHING;

-- RLS
ALTER TABLE empresas_parceiras ENABLE ROW LEVEL SECURITY;
ALTER TABLE profissionais_parceiros ENABLE ROW LEVEL SECURITY;

-- Org acessa suas parceiras
CREATE POLICY "org_acessa_parceiras" ON empresas_parceiras FOR ALL USING (
  org_id IN (SELECT organizacao_id FROM usuarios WHERE id = auth.uid())
);

-- Profissional acessa as empresas onde trabalha
CREATE POLICY "profissional_acessa_empresa" ON empresas_parceiras FOR SELECT USING (
  id IN (SELECT empresa_id FROM profissionais_parceiros WHERE usuario_id = auth.uid() AND ativo = TRUE)
);

-- Org acessa profissionais das suas parceiras
CREATE POLICY "org_acessa_profissionais" ON profissionais_parceiros FOR ALL USING (
  empresa_id IN (SELECT id FROM empresas_parceiras WHERE org_id IN (
    SELECT organizacao_id FROM usuarios WHERE id = auth.uid()
  ))
);

-- Profissional acessa sua própria empresa
CREATE POLICY "profissional_acessa_seus_dados" ON profissionais_parceiros FOR SELECT USING (
  usuario_id = auth.uid()
  OR empresa_id IN (
    SELECT empresa_id FROM profissionais_parceiros
    WHERE usuario_id = auth.uid() AND nivel = 'responsavel' AND ativo = TRUE
  )
);

-- Políticas contábeis: profissional de empresa contábil acessa módulo contábil
CREATE POLICY "parceiro_contabil_acessa_plano" ON plano_contas FOR SELECT USING (
  org_id IN (
    SELECT ep.org_id FROM empresas_parceiras ep
    JOIN profissionais_parceiros pp ON pp.empresa_id = ep.id
    WHERE pp.usuario_id = auth.uid() AND pp.ativo = TRUE
    AND ep.tipo = 'contabilidade' AND ep.status = 'ativo'
    AND 'contabil' = ANY(ep.modulos_acesso)
  )
);

CREATE POLICY "parceiro_contabil_acessa_partidas" ON partidas FOR ALL USING (
  org_id IN (
    SELECT ep.org_id FROM empresas_parceiras ep
    JOIN profissionais_parceiros pp ON pp.empresa_id = ep.id
    WHERE pp.usuario_id = auth.uid() AND pp.ativo = TRUE
    AND ep.tipo = 'contabilidade' AND ep.status = 'ativo'
    AND 'contabil' = ANY(ep.modulos_acesso)
  )
);

CREATE POLICY "parceiro_contabil_acessa_exercicios" ON exercicios_contabeis FOR SELECT USING (
  org_id IN (
    SELECT ep.org_id FROM empresas_parceiras ep
    JOIN profissionais_parceiros pp ON pp.empresa_id = ep.id
    WHERE pp.usuario_id = auth.uid() AND pp.ativo = TRUE
    AND ep.tipo = 'contabilidade' AND ep.status = 'ativo'
  )
);
