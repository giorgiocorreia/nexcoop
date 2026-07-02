-- ============================================================
-- NextCoop — Captação: colunas estruturadas em oportunidade_logs
--
-- Hoje os dados de contato/proposta (canal, valor solicitado, status,
-- link do documento, responsável) são guardados só como JSON dentro da
-- coluna "descricao" (texto livre). Isso funciona para exibir no
-- histórico, mas impede relatórios diretos (soma de valores solicitados,
-- filtro por status de proposta, etc.) sem parsear JSON em cada query,
-- e "responsavel_id" dentro do JSON não é uma FK de verdade.
--
-- Esta migration é ADITIVA: adiciona colunas nullable, não remove nem
-- altera "descricao". Registros antigos continuam com essas colunas
-- vazias e seguem sendo exibidos normalmente via parse do JSON — só
-- registros novos (após o deploy do código que usa estas colunas)
-- passam a preenchê-las. Não é necessário migrar dados históricos.
-- ============================================================

alter table oportunidade_logs
  add column if not exists canal                  text,
  add column if not exists responsavel_contato_id  uuid references usuarios(id),
  add column if not exists valor_solicitado        numeric(15,2),
  add column if not exists moeda                   text,
  add column if not exists status_proposta         text,
  add column if not exists documento_url           text,
  add column if not exists data_evento             date;

comment on column oportunidade_logs.canal is 'Canal do contato (email/reuniao/ligacao/whatsapp/outro). Preenchido apenas para acao=contato.';
comment on column oportunidade_logs.responsavel_contato_id is 'Quem fez o contato (FK real, diferente de usuario_id que é quem registrou o log).';
comment on column oportunidade_logs.valor_solicitado is 'Valor solicitado na proposta. Preenchido apenas para acao=proposta.';
comment on column oportunidade_logs.moeda is 'Moeda do valor_solicitado, copiada de oportunidades.moeda no momento do registro (snapshot histórico).';
comment on column oportunidade_logs.status_proposta is 'Status textual da proposta (Em elaboração/Enviada/Revisão solicitada). Preenchido apenas para acao=proposta.';
comment on column oportunidade_logs.documento_url is 'Link do documento da proposta. Preenchido apenas para acao=proposta.';
comment on column oportunidade_logs.data_evento is 'Data do contato ou de envio da proposta, conforme informado pelo usuário (pode diferir de criado_em).';

create index if not exists idx_oportunidade_logs_acao on oportunidade_logs(acao);
