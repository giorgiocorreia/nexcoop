-- ============================================================
-- Migration 045: Sistema de Cotas de Cooperados
-- ============================================================

-- 1. Grupos de colaboradores (por org)
CREATE TABLE IF NOT EXISTS public.grupos_colaboradores (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id UUID NOT NULL REFERENCES public.organizacoes(id) ON DELETE CASCADE,
  nome           TEXT NOT NULL,
  cnpj           TEXT NULL,
  descricao      TEXT NULL,
  ativo          BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organizacao_id, nome)
);

-- 2. Cotas dos cooperados
CREATE TABLE IF NOT EXISTS public.cotas_cooperado (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cooperado_id   UUID NOT NULL REFERENCES public.cooperados(id) ON DELETE CASCADE,
  organizacao_id UUID NOT NULL REFERENCES public.organizacoes(id) ON DELETE CASCADE,
  tipo_cota      TEXT NOT NULL CHECK (tipo_cota IN ('plena', 'colaboradora')),
  quantidade     INTEGER NOT NULL DEFAULT 1 CHECK (quantidade >= 1),
  valor_cota     NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (valor_cota >= 0),
  status         TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('integralizada', 'parcial', 'pendente')),
  grupo_id       UUID NULL REFERENCES public.grupos_colaboradores(id) ON DELETE SET NULL,
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (cooperado_id, tipo_cota)
);

-- 3. Representantes dos grupos
CREATE TABLE IF NOT EXISTS public.grupo_representantes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id       UUID NOT NULL REFERENCES public.grupos_colaboradores(id) ON DELETE CASCADE,
  cooperado_id   UUID NOT NULL REFERENCES public.cooperados(id) ON DELETE CASCADE,
  organizacao_id UUID NOT NULL REFERENCES public.organizacoes(id) ON DELETE CASCADE,
  ativo          BOOLEAN NOT NULL DEFAULT TRUE,
  indicado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  indicado_por   UUID NULL REFERENCES public.usuarios(id) ON DELETE SET NULL,
  UNIQUE (grupo_id, cooperado_id)
);

-- 4. Índices
CREATE INDEX IF NOT EXISTS idx_cotas_cooperado_cooperado    ON public.cotas_cooperado(cooperado_id);
CREATE INDEX IF NOT EXISTS idx_cotas_cooperado_org          ON public.cotas_cooperado(organizacao_id);
CREATE INDEX IF NOT EXISTS idx_cotas_cooperado_grupo        ON public.cotas_cooperado(grupo_id);
CREATE INDEX IF NOT EXISTS idx_grupos_colaboradores_org     ON public.grupos_colaboradores(organizacao_id);
CREATE INDEX IF NOT EXISTS idx_grupo_representantes_grupo   ON public.grupo_representantes(grupo_id);
CREATE INDEX IF NOT EXISTS idx_grupo_representantes_coop    ON public.grupo_representantes(cooperado_id);

-- 5. Trigger atualizado_em
CREATE OR REPLACE FUNCTION public.set_atualizado_em()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.atualizado_em = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_cotas_atualizado
  BEFORE UPDATE ON public.cotas_cooperado
  FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();

CREATE TRIGGER trg_grupos_atualizado
  BEFORE UPDATE ON public.grupos_colaboradores
  FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();

-- 6. Trigger sincronizar quota_parte em cooperados
CREATE OR REPLACE FUNCTION public.sync_quota_parte()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_total NUMERIC;
BEGIN
  SELECT COALESCE(SUM(quantidade * valor_cota), 0)
    INTO v_total
    FROM public.cotas_cooperado
   WHERE cooperado_id = COALESCE(NEW.cooperado_id, OLD.cooperado_id);

  UPDATE public.cooperados
     SET quota_parte = v_total
   WHERE id = COALESCE(NEW.cooperado_id, OLD.cooperado_id);

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_quota_parte_insert
  AFTER INSERT OR UPDATE ON public.cotas_cooperado
  FOR EACH ROW EXECUTE FUNCTION public.sync_quota_parte();

CREATE TRIGGER trg_sync_quota_parte_delete
  AFTER DELETE ON public.cotas_cooperado
  FOR EACH ROW EXECUTE FUNCTION public.sync_quota_parte();

-- 7. RLS
ALTER TABLE public.cotas_cooperado        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grupos_colaboradores   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grupo_representantes   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_cotas_cooperado" ON public.cotas_cooperado
  USING (organizacao_id = (SELECT organizacao_id FROM public.usuarios WHERE id = auth.uid()));

CREATE POLICY "org_grupos_colaboradores" ON public.grupos_colaboradores
  USING (organizacao_id = (SELECT organizacao_id FROM public.usuarios WHERE id = auth.uid()));

CREATE POLICY "org_grupo_representantes" ON public.grupo_representantes
  USING (organizacao_id = (SELECT organizacao_id FROM public.usuarios WHERE id = auth.uid()));

-- 8. Chaves de configuração de valor padrão de cota por org
-- (inserir apenas se a org COOPAIBI já existir; adapte o org_id se necessário)
-- Estas chaves serão inseridas via aplicação no onboarding; não há INSERT fixo aqui.
