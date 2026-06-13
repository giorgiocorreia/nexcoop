-- Migration 035: reverter tabela membros (duplicava conceito de cooperados)
-- O vínculo societário já é representado pela tabela cooperados (existente em produção).
-- O link produtor <-> cooperado é feito via produtores.cooperado_id (coluna já existente).
drop table if exists membros cascade;
