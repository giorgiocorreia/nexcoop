-- migration 036: adicionar colunas de endereço e estado em usuarios
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS endereco  text;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS municipio text;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS estado    text;
