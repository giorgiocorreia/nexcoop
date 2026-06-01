-- Migration 017: De/Para e NF-e

-- Plano de contas do escritório de contabilidade
-- Cadastrado UMA VEZ pelo contador, reutilizado em todas as orgs clientes
CREATE TABLE plano_contas_externo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escritorio_id UUID NOT NULL REFERENCES escritorios_contabeis(id) ON DELETE CASCADE,
  codigo TEXT NOT NULL,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('ATIVO','PASSIVO','PATRIMONIO_LIQUIDO','RECEITA','DESPESA')),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(escritorio_id, codigo)
);

-- De/Para: conta interna NexCoop <-> conta do escritório
-- Específico por org — cada cooperativa faz seu próprio mapeamento
-- usando o plano de contas do escritório já cadastrado
CREATE TABLE de_para_contas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  contador_org_id UUID NOT NULL REFERENCES contador_org(id) ON DELETE CASCADE,
  conta_interna_id UUID NOT NULL REFERENCES plano_contas(id) ON DELETE CASCADE,
  conta_externa_id UUID NOT NULL REFERENCES plano_contas_externo(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, contador_org_id, conta_interna_id)
);

-- NF-e importadas pela org
CREATE TABLE nfe_importadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  chave_acesso TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada','saida')),
  numero TEXT,
  serie TEXT,
  data_emissao DATE NOT NULL,
  cnpj_emitente TEXT,
  nome_emitente TEXT,
  cnpj_destinatario TEXT,
  nome_destinatario TEXT,
  valor_total NUMERIC(15,2) NOT NULL,
  valor_icms NUMERIC(15,2) DEFAULT 0,
  valor_pis NUMERIC(15,2) DEFAULT 0,
  valor_cofins NUMERIC(15,2) DEFAULT 0,
  xml_original TEXT,
  lancamento_id UUID REFERENCES lancamentos(id),
  status TEXT NOT NULL DEFAULT 'importada' CHECK (status IN ('importada','vinculada','ignorada')),
  importado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, chave_acesso)
);

-- Itens da NF-e
CREATE TABLE nfe_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nfe_id UUID NOT NULL REFERENCES nfe_importadas(id) ON DELETE CASCADE,
  numero_item INTEGER NOT NULL,
  codigo_produto TEXT,
  descricao TEXT NOT NULL,
  ncm TEXT,
  cfop TEXT,
  unidade TEXT,
  quantidade NUMERIC(15,4),
  valor_unitario NUMERIC(15,4),
  valor_total NUMERIC(15,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE plano_contas_externo ENABLE ROW LEVEL SECURITY;
ALTER TABLE de_para_contas ENABLE ROW LEVEL SECURITY;
ALTER TABLE nfe_importadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE nfe_itens ENABLE ROW LEVEL SECURITY;

-- Contador acessa o plano do próprio escritório
CREATE POLICY "contador_acessa_plano_externo" ON plano_contas_externo FOR ALL USING (
  escritorio_id IN (
    SELECT escritorio_id FROM contador_org WHERE usuario_id = auth.uid()
  )
);

-- Org e contador acessam o De/Para da org
CREATE POLICY "acessa_depara" ON de_para_contas FOR ALL USING (
  org_id IN (SELECT org_id FROM usuarios WHERE id = auth.uid())
  OR org_id IN (SELECT org_id FROM contador_org WHERE usuario_id = auth.uid() AND ativo = TRUE)
);

-- Org acessa suas NF-es
CREATE POLICY "org_acessa_nfe" ON nfe_importadas FOR ALL USING (
  org_id IN (SELECT org_id FROM usuarios WHERE id = auth.uid())
);

-- Itens seguem a NF-e
CREATE POLICY "org_acessa_nfe_itens" ON nfe_itens FOR ALL USING (
  nfe_id IN (
    SELECT id FROM nfe_importadas WHERE org_id IN (
      SELECT org_id FROM usuarios WHERE id = auth.uid()
    )
  )
);

-- Liga o usuário contador ao escritório que ele representa
ALTER TABLE contador_org ADD COLUMN IF NOT EXISTS escritorio_id UUID REFERENCES escritorios_contabeis(id);
