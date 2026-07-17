-- Migration 078: corrige warning "Function Search Path Mutable" do Security Advisor
-- Aplicar via: Supabase Dashboard → SQL Editor
-- Data: 2026-07-17
--
-- Contexto: o Security Advisor do Supabase reporta 22 funções do schema public
-- com search_path mutável (herdado do caller). O fix padrão é fixar o
-- search_path explicitamente com ALTER FUNCTION ... SET search_path = public.
-- Isso NÃO altera corpo/lógica de nenhuma função — apenas fecha o vetor
-- teórico de search_path hijacking (uma função SECURITY DEFINER poderia
-- ser enganada por um search_path manipulado pelo chamador).
--
-- ATENÇÃO — schema drift (funções sem código-fonte neste repo):
--   - get_org_id() e get_user_role(): já documentado como drift nas
--     migrations 076/077 (não existem em nenhum arquivo de migration deste
--     repo, foram criadas direto no Dashboard). Assumida assinatura ()
--     sem argumentos, mesma que funcionou no REVOKE das migrations
--     076/077. Se o ALTER abaixo falhar com "function does not exist",
--     conferir a assinatura real em Database → Functions no Dashboard.
--   - criar_categorias_padrao() e set_updated_at(): também não têm
--     código-fonte em nenhuma migration deste repo (drift). Assumida
--     assinatura () sem argumentos por serem, pelo nome, prováveis
--     funções de trigger. Mesma ressalva: conferir no Dashboard se o
--     ALTER falhar.
--
-- Assinaturas confirmadas via grep em supabase/migrations/*.sql (arquivo
-- de origem indicado ao lado de cada ALTER abaixo).

-- 011_cotas_cooperado.sql:46
ALTER FUNCTION public.trg_set_atualizado_em() SET search_path = public;

-- 025_produtores_contas_caixa.sql:448 (redefinida em 20260710000001_064_fix_saldos_produto_recompute.sql:36)
ALTER FUNCTION public.fn_atualizar_saldos_conta() SET search_path = public;

-- schema drift — assinatura confirmada no Dashboard (Database > Functions): p_org_id uuid
ALTER FUNCTION public.criar_categorias_padrao(uuid) SET search_path = public;

-- 008_captacao.sql:90
ALTER FUNCTION public.update_atualizado_em() SET search_path = public;

-- 025_produtores_contas_caixa.sql:418
ALTER FUNCTION public.fn_atualizar_estoque_fisico() SET search_path = public;

-- 025_produtores_contas_caixa.sql:496
ALTER FUNCTION public.fn_criar_conta_produtor() SET search_path = public;

-- schema drift (mesma ressalva das migrations 076/077) — conferir assinatura no Dashboard se falhar
ALTER FUNCTION public.get_org_id() SET search_path = public;

-- schema drift (mesma ressalva das migrations 076/077) — conferir assinatura no Dashboard se falhar
ALTER FUNCTION public.get_user_role() SET search_path = public;

-- 001_schema_mvp.sql:315
ALTER FUNCTION public.handle_new_user() SET search_path = public;

-- 013_conta_corrente.sql:64
ALTER FUNCTION public.creditar_cooperado(uuid, uuid, numeric, text, text, uuid) SET search_path = public;

-- 013_conta_corrente.sql:113
ALTER FUNCTION public.debitar_cooperado(uuid, uuid, numeric, text, text, uuid) SET search_path = public;

-- 026_comercializacao_externa.sql:167
ALTER FUNCTION public.fn_calcular_venda_externa() SET search_path = public;

-- 026_comercializacao_externa.sql:181 (redefinida em 20260625000003_054c_trigger_lote_status_pago.sql:5)
ALTER FUNCTION public.fn_atualizar_status_lote() SET search_path = public;

-- 029_notas_entrega.sql:33
ALTER FUNCTION public.proximo_numero_nota(uuid) SET search_path = public;

-- schema drift — não encontrada em nenhuma migration deste repo; conferir assinatura no Dashboard se falhar
ALTER FUNCTION public.set_updated_at() SET search_path = public;

-- 030_comprovantes_pagamento.sql:29
ALTER FUNCTION public.proximo_numero_comprovante_pagamento(uuid) SET search_path = public;

-- 001_schema_mvp.sql:281 (redefinida identicamente em 003_mensalidades.sql:43 e 045_cotas_cooperado.sql:54)
ALTER FUNCTION public.set_atualizado_em() SET search_path = public;

-- 045_cotas_cooperado.sql:68
ALTER FUNCTION public.sync_quota_parte() SET search_path = public;

-- 20260624000001_052_resultado_safra_schema.sql:96
ALTER FUNCTION public.fn_sincronizar_peso_lote() SET search_path = public;

-- 20260624000001_052_resultado_safra_schema.sql:200
ALTER FUNCTION public.fn_atualizar_saldos_produtor_snapshot() SET search_path = public;

-- 20260625000000_053_sincronizar_tipo_produtor.sql:18
ALTER FUNCTION public.fn_sincronizar_tipo_produtor() SET search_path = public;

-- 20260624000001_052_resultado_safra_schema.sql:258 (redefinida em 20260625000001_053_trigger_custo_aquisicao_notas_entrada.sql,
-- 20260625000001_054_vendas_devolucoes.sql, 20260625000005_055_trigger_custo_aquisicao_notas_entrada.sql
-- e 20260716000002_068_fix_snapshot_transferencia_interna.sql — todas sem argumentos)
ALTER FUNCTION public.fn_atualizar_resultado_safra_snapshot() SET search_path = public;

-- Rollback (comentado):
-- ALTER FUNCTION public.trg_set_atualizado_em() SET search_path = '';
-- ALTER FUNCTION public.fn_atualizar_saldos_conta() SET search_path = '';
-- ALTER FUNCTION public.criar_categorias_padrao(uuid) SET search_path = '';
-- ALTER FUNCTION public.update_atualizado_em() SET search_path = '';
-- ALTER FUNCTION public.fn_atualizar_estoque_fisico() SET search_path = '';
-- ALTER FUNCTION public.fn_criar_conta_produtor() SET search_path = '';
-- ALTER FUNCTION public.get_org_id() SET search_path = '';
-- ALTER FUNCTION public.get_user_role() SET search_path = '';
-- ALTER FUNCTION public.handle_new_user() SET search_path = '';
-- ALTER FUNCTION public.creditar_cooperado(uuid, uuid, numeric, text, text, uuid) SET search_path = '';
-- ALTER FUNCTION public.debitar_cooperado(uuid, uuid, numeric, text, text, uuid) SET search_path = '';
-- ALTER FUNCTION public.fn_calcular_venda_externa() SET search_path = '';
-- ALTER FUNCTION public.fn_atualizar_status_lote() SET search_path = '';
-- ALTER FUNCTION public.proximo_numero_nota(uuid) SET search_path = '';
-- ALTER FUNCTION public.set_updated_at() SET search_path = '';
-- ALTER FUNCTION public.proximo_numero_comprovante_pagamento(uuid) SET search_path = '';
-- ALTER FUNCTION public.set_atualizado_em() SET search_path = '';
-- ALTER FUNCTION public.sync_quota_parte() SET search_path = '';
-- ALTER FUNCTION public.fn_sincronizar_peso_lote() SET search_path = '';
-- ALTER FUNCTION public.fn_atualizar_saldos_produtor_snapshot() SET search_path = '';
-- ALTER FUNCTION public.fn_sincronizar_tipo_produtor() SET search_path = '';
-- ALTER FUNCTION public.fn_atualizar_resultado_safra_snapshot() SET search_path = '';
