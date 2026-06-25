-- Migration: 20260625000000_053_sincronizar_tipo_produtor.sql
-- Sincroniza produtores.tipo com cooperados.status via trigger

-- PARTE 1: Corrige dados existentes
UPDATE produtores p
SET tipo = CASE
  WHEN c.status = 'ativo' THEN 'cooperado'
  ELSE 'externo'
END
FROM cooperados c
WHERE p.cooperado_id = c.id
AND p.tipo != CASE
  WHEN c.status = 'ativo' THEN 'cooperado'
  ELSE 'externo'
END;

-- PARTE 2: Função e trigger de sincronização futura
CREATE OR REPLACE FUNCTION fn_sincronizar_tipo_produtor()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE produtores
  SET tipo = CASE
    WHEN NEW.status = 'ativo' THEN 'cooperado'
    ELSE 'externo'
  END
  WHERE cooperado_id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sincronizar_tipo_produtor
AFTER UPDATE OF status ON cooperados
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION fn_sincronizar_tipo_produtor();
