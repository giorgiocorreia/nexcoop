-- ============================================================
-- 060_conjuge_produtor_cooperado.sql
--
-- Cadastro do cônjuge em cooperados/produtores, para permitir
-- emitir a NF-e de entrada em nome do cônjuge quando a CAF/DAP é
-- conjunta (comum em agricultura familiar) — sem que o cônjuge
-- precise virar um produtor separado com saldo/conta próprios.
--
-- Aditiva: colunas nullable, não altera dados existentes.
-- ============================================================

alter table cooperados
  add column if not exists conjuge_nome text,
  add column if not exists conjuge_cpf  text;

alter table produtores
  add column if not exists conjuge_nome             text,
  add column if not exists conjuge_cpf              text,
  add column if not exists conjuge_ie_produtor_rural text;

comment on column produtores.conjuge_nome is 'Nome do cônjuge do produtor. Permite emitir NF-e de entrada em nome dele(a) quando a CAF/DAP é conjunta.';
comment on column produtores.conjuge_cpf is 'CPF do cônjuge (só dígitos). Usado como cpf_destinatario alternativo na emissão de NF-e.';
comment on column produtores.conjuge_ie_produtor_rural is 'IE de produtor rural do cônjuge, se diferente da do titular (produtores.ie_produtor_rural).';

comment on column cooperados.conjuge_nome is 'Nome do cônjuge do cooperado. Espelhado em produtores.conjuge_nome pelo mesmo vínculo cooperado→produtor.';
comment on column cooperados.conjuge_cpf is 'CPF do cônjuge do cooperado (só dígitos).';

-- notas_entrega: snapshot de quem efetivamente saiu como destinatário na NF-e,
-- para o histórico não mudar se o cadastro do produtor/cônjuge for editado depois.
alter table notas_entrega
  add column if not exists destinatario_nome text,
  add column if not exists destinatario_cpf  text,
  add column if not exists destinatario_ie   text,
  add column if not exists emitido_como text check (emitido_como in ('titular', 'conjuge'));

comment on column notas_entrega.destinatario_nome is 'Nome usado como destinatário na NF-e emitida (snapshot no momento da emissão).';
comment on column notas_entrega.destinatario_cpf is 'CPF usado como destinatário na NF-e emitida (snapshot no momento da emissão).';
comment on column notas_entrega.destinatario_ie is 'IE de produtor rural usada na NF-e emitida (snapshot no momento da emissão).';
comment on column notas_entrega.emitido_como is 'Se a nota foi emitida no CPF do titular do cadastro ou do cônjuge.';
