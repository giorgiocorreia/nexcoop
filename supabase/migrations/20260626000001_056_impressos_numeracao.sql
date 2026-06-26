-- Migration 056: adiciona controle de numeração de fichas de pesagem em organizacoes

ALTER TABLE organizacoes
  ADD COLUMN IF NOT EXISTS ultimo_numero_ficha integer NOT NULL DEFAULT 0;
