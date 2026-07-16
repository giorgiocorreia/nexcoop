-- 067 — tipo_documento em vendas_externas
--
-- Até aqui toda venda de lote no módulo Comercialização passava
-- obrigatoriamente pela emissão de NF-e de saída (Focus NFe). Existe um
-- segundo cenário legítimo: transferência de lote para uma empresa de um
-- produtor cooperado, onde a NF-e de venda é emitida pelo PRÓPRIO
-- comprador (fora do escopo do NexCoop) — a cooperativa não emite nota
-- fiscal nessa operação, só um documento interno de controle (sem valor
-- fiscal).
--
-- Essa migration só adiciona o campo que distingue os dois fluxos.
-- Os campos fiscais (chave_nfe, numero_nfe, status_nfe etc.) continuam
-- existindo e, para tipo_documento = 'transferencia_interna', ficam
-- NULL — tratado na aplicação, não aqui.
--
-- Rodar no SQL Editor do Supabase Dashboard.

alter table vendas_externas
  add column tipo_documento text not null default 'nfe_saida'
  check (tipo_documento in ('nfe_saida', 'transferencia_interna'));

comment on column vendas_externas.tipo_documento is
  'nfe_saida = cooperativa emite NF-e de venda (padrão). transferencia_interna = comprador é empresa do próprio cooperado e emite a NF-e por fora do NexCoop; aqui só existe um documento interno sem valor fiscal.';
