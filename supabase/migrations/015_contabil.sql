-- Migration 015: Módulo Contábil — Estrutura Base

-- Exercícios contábeis
CREATE TABLE exercicios_contabeis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  ano INTEGER NOT NULL,
  data_abertura DATE NOT NULL DEFAULT CURRENT_DATE,
  data_encerramento DATE,
  status TEXT NOT NULL DEFAULT 'ABERTO' CHECK (status IN ('ABERTO','ENCERRADO')),
  encerrado_por UUID REFERENCES auth.users(id),
  encerrado_em TIMESTAMPTZ,
  hash_fechamento TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, ano)
);

-- Plano de contas hierárquico
CREATE TABLE plano_contas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  codigo TEXT NOT NULL,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('ATIVO','PASSIVO','PATRIMONIO_LIQUIDO','RECEITA','DESPESA')),
  natureza TEXT NOT NULL CHECK (natureza IN ('DEVEDORA','CREDORA')),
  parent_id UUID REFERENCES plano_contas(id),
  nivel INTEGER NOT NULL DEFAULT 1,
  aceita_lancamento BOOLEAN NOT NULL DEFAULT FALSE,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, codigo)
);

-- Partidas dobradas
CREATE TABLE partidas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  lancamento_id UUID NOT NULL REFERENCES lancamentos(id) ON DELETE CASCADE,
  conta_debito_id UUID NOT NULL REFERENCES plano_contas(id),
  conta_credito_id UUID NOT NULL REFERENCES plano_contas(id),
  valor NUMERIC(15,2) NOT NULL,
  historico TEXT,
  classificado_por UUID REFERENCES auth.users(id),
  classificado_em TIMESTAMPTZ DEFAULT NOW(),
  exercicio_id UUID REFERENCES exercicios_contabeis(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comentários contábeis
CREATE TABLE comentarios_contabeis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  lancamento_id UUID NOT NULL REFERENCES lancamentos(id) ON DELETE CASCADE,
  autor_id UUID NOT NULL REFERENCES auth.users(id),
  texto TEXT NOT NULL,
  resolvido BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE exercicios_contabeis ENABLE ROW LEVEL SECURITY;
ALTER TABLE plano_contas ENABLE ROW LEVEL SECURITY;
ALTER TABLE partidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE comentarios_contabeis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_acessa_exercicios" ON exercicios_contabeis FOR ALL USING (
  org_id IN (SELECT org_id FROM usuarios WHERE id = auth.uid())
);
CREATE POLICY "org_acessa_plano_contas" ON plano_contas FOR ALL USING (
  org_id IN (SELECT org_id FROM usuarios WHERE id = auth.uid())
);
CREATE POLICY "org_acessa_partidas" ON partidas FOR ALL USING (
  org_id IN (SELECT org_id FROM usuarios WHERE id = auth.uid())
);
CREATE POLICY "org_acessa_comentarios" ON comentarios_contabeis FOR ALL USING (
  org_id IN (SELECT org_id FROM usuarios WHERE id = auth.uid())
);
