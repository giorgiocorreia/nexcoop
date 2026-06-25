-- Migration 054c: fn_atualizar_status_lote — adicionar transição para 'pago'
-- Adiciona case para status='pago' na função de trigger existente.
-- Executar no Supabase Dashboard SQL Editor.

CREATE OR REPLACE FUNCTION fn_atualizar_status_lote()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'confirmada' AND OLD.status = 'rascunho' THEN
    UPDATE lotes SET status = 'em_venda' WHERE id = NEW.lote_id;
  END IF;
  IF NEW.status = 'entregue' THEN
    UPDATE lotes SET status = 'entregue' WHERE id = NEW.lote_id;
  END IF;
  IF NEW.status = 'pago' THEN
    UPDATE lotes SET status = 'pago' WHERE id = NEW.lote_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
