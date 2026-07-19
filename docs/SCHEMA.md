# NexCoop — Schema do Banco de Dados

## Migrations aplicadas

| Migration | Descrição |
|---|---|
| 001–007 | Base: organizacoes, usuarios, cooperados, financeiro, assembleias, documentos, mensalidades |
| 008–013 | Captação: oportunidades, logs, perfil |
| 014 | Loja: schema inicial |
| 015–024 | Módulo contábil completo |
| 025–029b | Comercialização: produtores, contas, caixa, safras, lotes, vendas, NF-e entrada |
| 030 | solicitacoes_aporte |
| 031 | enderecos centralizada |
| 032 | cotacoes_mercado_externo + config_precos_sugeridos |
| 033 | produtores: usuario_id, dados_fiscais, is_consumidor_final |
| 034/035 | drop tabela membros (criada e revertida) |
| 036 | perfil de usuário |
| 037 | loja_compras expandida |
| 038 | loja_sangrias — **nota (17/07/2026): nenhum arquivo `038_*.sql` existe no repo; tabela foi criada direto em produção (schema drift), formalizada retroativamente pela migration 073** |
| 039 | vw_estoque_loja |
| 040 | NCM/CFOP em loja_produtos, colunas fiscais em organizacoes, loja_notas_fiscais |
| 041 | cartao_nsu, cartao_autorizacao, pix_identificador, desconto_total, pago_saldo em loja_vendas |
| 042 | status_conferencia, valor_fisico_*, conferido_por, conferido_em em loja_caixas; pix_nome_pagador em loja_vendas |
| 043 | loja_unidades: remove CHECK fixo de loja_produtos.unidade, cria tabela dinâmica com 12 unidades padrão |
| 044 | loja_compras: chave_acesso_nfe, serie_nfe, data_emissao_nfe, emitente_nfe, cnpj_emitente, valor_nfe, status_nfe |
| 045 | grupos_colaboradores, cotas_cooperado (tipo_cota, grupo_id), grupo_representantes, triggers, RLS |
| 046 | cota_pagamentos: formas de pagamento, parcelas, vencimentos, RLS |
| 047 | índices de performance: cooperados(organizacao_id) e cooperados(organizacao_id, numero_matricula) |
| 048 | lotes (nullable safra_id/produto_id, +produto_descricao, +data_fechamento), movimentacoes_conta (+lote_id, +chave_nfe_entrada, +xml_nfe_entrada), vendas_externas (+campos NF-e saída), compradores (+endereço completo), produtos (+ncm, +CFOPs, +CSTs, +fator_saca) |

| 049 | lotes.status CHECK: adiciona 'rascunho' |
| 050 | lancamento_id FK em vendas_externas e distribuicao_resultado |
| 051 | loja_caixas: campos de fechamento completos (valor_fechamento, totais por forma, saldo_final_especie, conferência) |
| 052 | cotacoes: data→vigente_a_partir_de (timestamptz); movimentacoes_conta: +cotacao_id; lotes: -produto_id, +lote_itens (multi-produto); saldos_produtor_snapshot; resultado_safra_snapshot; triggers; vw_saldos_produtor; vw_resultado_safra |
| 053 | produtores.tipo sincronizado com cooperados.status via trigger trg_sincronizar_tipo_produtor |
| 054–059 | vendas_devolucoes, trigger lote_status_pago, impressos_numeracao, lancamentos_sessao_caixa, fix RLS captação, colunas estruturadas oportunidade_logs |
| 060 | cooperados/produtores: +conjuge_nome, +conjuge_cpf (+conjuge_ie_produtor_rural em produtores); notas_entrega: +destinatario_nome, +destinatario_cpf, +destinatario_ie, +emitido_como — permite emitir NF-e de entrada em nome do cônjuge |
| 061 | configuracoes_contabeis: +classificacao_automatica BOOLEAN DEFAULT TRUE — toggle na escrituração automática Financeiro → Contábil |
| 062 | empresas_parceiras: +acesso_fiscal BOOLEAN — parceiro contábil acessa /comercializacao/fiscal na org cliente |
| 063 | entradas_cota_caixa |
| 064 | fix recompute de saldos_produto: trigger passa a RECALCULAR (SUM da ledger) em vez de incremental, cobre INSERT/UPDATE/DELETE |
| 065 | contas_produtor: +CHECK saldo_financeiro >= 0 (venda antecipada — saldo de produto pode ficar negativo, saldo em R$ nunca) |
| 066 | propriedades_rurais (NOVA) — lista de propriedades por cooperado (0..N), substitui os campos soltos em cooperados |
| 067 | vendas_externas: +tipo_documento CHECK ('nfe_saida'\|'transferencia_interna') default 'nfe_saida' — venda de lote para empresa do próprio cooperado, sem NF-e da cooperativa (comprador emite por fora) |
| 068 | fix fn_atualizar_resultado_safra_snapshot: `status_nfe NOT IN (...)` nunca é TRUE quando status_nfe é NULL (SQL) — vendas tipo_documento='transferencia_interna' (status_nfe sempre NULL) agora contam em receita_bruta_rs/taxa_cooperativa_rs/funrural_rs/total_kg_vendido |
| 069 | vendas_quebras_peso (NOVA) — quebra de peso no destino (cacau quente); comprador paga o peso recebido, aplicação reduz o valor a receber do lançamento; cooperativa absorve. Não altera NF-e, valor_bruto nem resultado_safra_snapshot |
| 070 | fix vendas_externas.status_nfe: DEFAULT 'pendente' (migration 048) nunca foi atualizado quando a 054 dropou 'pendente' do CHECK — todo INSERT sem status_nfe explícito quebrava desde 25/06/2026; corrige DEFAULT para 'rascunho' e inclui 'erro' no CHECK (usado por emitir-nfe-saida.ts em falha de emissão) |
| 071 | fix vendas_externas_status_check (026 tinha 'paga', código sempre grava 'pago' — quebra ao "Confirmar pagamento") e lotes_status_check (049 nunca incluiu 'pago', mas trigger da 054c e devolucao.ts já gravam 'pago' no lote) — recria ambos os CHECKs com 'pago' |
| 072 | produtos: +loja_produto_id (FK nullable para loja_produtos, ON DELETE SET NULL) — ponte Comercialização → Loja Agropecuária, permite mapear qual produto da Loja recebe o estoque quando uma entrega for enviada pra lá ("Enviar para a Loja") |
| 073 | loja_sangrias (formalização de schema drift — tabela já existia em produção desde jul/2026, nunca versionada em migration; RLS + índices seguindo padrão de 012/028); aportes_sangrias e loja_sangrias: +origem_transferencia ('comercializacao'\|'loja'), +referencia_transferencia_id (uuid não-FK, gerado em código para linkar as duas pontas de uma transferência entre módulos) |
| 074 | sessoes_caixa: +valor_contado_especie numeric(12,2) nullable — dinheiro contado fisicamente pelo operador no fechamento, apenas registro de auditoria (nunca usado em cálculo); saldo_final_especie continua sendo sempre o valor calculado pelo sistema. Mesmo padrão de loja_caixas.valor_fisico_especie (042/051) |
| 075 | fix Security Advisor "Security Definer View": vw_saldos_produtor e vw_resultado_safra (criadas na 052) recebem security_invoker = on — passam a rodar com privilégios/RLS de quem consulta em vez do dono; sem mudança de comportamento (único consumidor hoje usa createAdminClient/service_role, que já ignora RLS de qualquer forma) |
| 076 | fix Security Advisor "Public/Signed-In Users Can Execute SECURITY DEFINER Function": REVOKE EXECUTE de anon/authenticated em get_org_id(), get_user_role() (schema drift — não existem em nenhuma migration nem são usadas no código, criadas direto no Dashboard) e handle_new_user() (trigger de signup, 001_schema_mvp.sql:315 — continua funcionando pois triggers ignoram GRANT/REVOKE de roles de API). Nenhum DROP, apenas fecha exposição via /rest/v1/rpc/* |
| 077 | complementa a 076: REVOKE EXECUTE de PUBLIC (não só anon/authenticated) nas mesmas 3 funções (get_org_id, get_user_role, handle_new_user) — anon/authenticated herdavam EXECUTE via GRANT automático de PUBLIC no CREATE FUNCTION, então o REVOKE da 076 sozinho não bastou; Security Advisor continuava acusando após "Rerun linter" |
| 078 | fix Security Advisor "Function Search Path Mutable": `ALTER FUNCTION ... SET search_path = public` em 22 funções do schema public (triggers de atualizado_em/timestamps, saldos/estoque de produtor, snapshots de comercialização, creditar/debitar_cooperado, numeração de notas/comprovantes etc.); sem alteração de corpo/lógica. get_org_id(), get_user_role(), criar_categorias_padrao() e set_updated_at() são schema drift — sem código-fonte em nenhuma migration deste repo, assinatura () assumida (conferir em Database → Functions no Dashboard se o ALTER falhar) |
| 079 | loja_compra_parcelas (NOVA) — parcelas de compra a prazo na Loja Agropecuária |
| 080 | loja_compra_parcelas: +lancamento_id — vínculo com lancamentos (Financeiro) por parcela |
| 081 | fix bug de produção causado pelas 076/077: GRANT EXECUTE em get_org_id() e get_user_role() de volta para `authenticated` — o REVOKE da 077 quebrou toda RLS policy que chama essas funções (elas rodam com o privilégio do role `authenticated` quando chamadas dentro de policy, não do dono da função), causando `42501 permission denied for function get_org_id` em qualquer query de usuário comum (não service_role) em tabela com policy dependente. `anon`/`PUBLIC` continuam sem EXECUTE (mantém o ganho de segurança da 077 contra RPC anônimo); `handle_new_user()` não recebe grant de volta (trigger, não precisa). Security Advisor volta a acusar warning nas 2 funções para `authenticated` — aceito, é o uso legítimo de RLS; correção definitiva é reescrever as policies com subquery inline (regra 1 do CLAUDE.md), migration futura |
| 082 | Resultado da Comercialização — realizado + marcação a mercado (docs/PLANO_RESULTADO_COMERCIALIZACAO.md). `resultado_safra_snapshot`: +kg_convertido, +custo_convertido_rs, +lucro_realizado_rs (GENERATED, fórmula do REALIZADO — LEAST(kg_vendido,kg_convertido) × diferença de médias líquidas, protegida contra divisão por zero). `organizacoes`: +aliquota_funrural numeric(6,4) default 0.0163 (substitui o hardcoded no trigger). `movimentacoes_conta`: +safra_id (NOVO — coluna que não existia; ver divergência abaixo) + trigger `trg_estampar_safra_conversao` (BEFORE INSERT, só tipo='conversao') que estampa a safra 'em_andamento' da org. Trigger novo `trg_atualizar_custo_convertido` (AFTER INSERT/UPDATE/DELETE em movimentacoes_conta, tipo='conversao') recalcula do zero kg_convertido/custo_convertido_rs por (org,safra,produto), convive com `trg_atualizar_saldos_produtor_snapshot`. `fn_atualizar_resultado_safra_snapshot` reescrita: restaura rateio multi-produto por `lote_itens` (fator = peso do item ÷ peso do lote, eliminando o `LIMIT 1` que a 055/068 tinham introduzido) e lê FUNRURAL de `organizacoes.aliquota_funrural` em vez de 0.0163 fixo; mantém os filtros NULL-safe de status_nfe da 068. View nova `vw_resultado_comercializacao` (security_invoker=on) — realizado (snapshot) + marcação a mercado calculada na leitura via cotação ativa (LATERAL, preco_cooperado). **Divergência do plano**: `movimentacoes_conta` não tem (nunca teve) vínculo de lote/safra em linhas tipo='conversao' — `registrarConversaoESaque` grava só (conta_id, produto_id, quantidade, valor), sem lote_id; por isso a coluna `safra_id` é nova nesta migration, estampada por heurística (safra 'em_andamento' da org no momento do INSERT) em vez de derivada de um lote como o trigger de vendas faz. Ver comentário completo no topo do arquivo da migration. `custo_aquisicao_rs`/`resultado_liquido_rs` (052): **deprecated** — mantidos só por transição com a tela antiga, não usar em código novo (usar `lucro_realizado_rs`/`custo_convertido_rs`), remoção prevista em migration futura após validação com a COOPAIBI |

| 083 | fix `saldos_produtor_snapshot` congelado desde o backfill único da 052 (24/06/2026) — o trigger antigo dependia de `NEW.lote_id` no INSERT pra resolver a safra, mas 'entrega' nasce sem lote_id (vínculo só chega depois via UPDATE em confirmarComposicaoLote) e 'conversao'/'ajuste_produto' nunca têm lote_id; resultado: snapshot nunca atualizou ao vivo, só o backfill único ficou congelado (confirmado com dados da COOPAIBI: 25 entregas/3.215,7 kg, 27 conversões/1.235,7 kg/R$25.862,12 e 3 ajuste_produto/−161 kg registrados depois de 24/06 e nunca refletidos). Generaliza `trg_estampar_safra_conversao` (082) → `fn_estampar_safra_movimentacao`/`trg_estampar_safra_movimentacao` (BEFORE INSERT, cobre agora 'entrega'/'ajuste_produto' além de 'conversao', dropando a função antiga). Recria `fn_atualizar_saldos_produtor_snapshot` — recálculo do zero por (org, produtor, produto, safra) direto de `movimentacoes_conta` via `fn_recalc_saldo_produtor`, sem depender de lote_id: `kg_entregue = SUM(quantidade_produto)` de tipo IN ('entrega','ajuste_produto') (ajuste é líquido, soma com o sinal que já vem gravado), `kg_convertido`/`valor_convertido_rs` de tipo='conversao'; 'estorno' fica de fora (nenhum INSERT hoje vinculado a produto de cacau). AFTER INSERT/UPDATE/DELETE, convive com `trg_estampar_safra_movimentacao` (BEFORE) e `trg_atualizar_custo_convertido` (082, tabela diferente). Combos sem movimentação líquida (soma zero) são DELETADOS em vez de mantidos com zero. Backfill: `DELETE FROM saldos_produtor_snapshot` + reinserção total a partir da ledger — remove linhas obsoletas do backfill da 052 que não correspondem mais a movimentação nenhuma |

| 084 | fix `fn_atualizar_resultado_safra_snapshot` (082): dois defeitos achados com dados reais da COOPAIBI (lote 001 nfe_saida contando FUNRURAL de R$202,73 corretamente; lotes 002/003 transferencia_interna, R$14.014,33+R$14.002,52, ficando fora do resultado por falta de `lote_itens`). (1) FUNRURAL zerado quando `tipo_documento = 'transferencia_interna'` (confirmado com o Giorgio: não há FUNRURAL nesse tipo de operação; a taxa da cooperativa `ve.valor_taxa` não é tocada). (2) Nova função `fn_produto_lote(lote_id)` resolve (produto_id, fator) com fallback: usa `lote_itens` quando existe, senão deriva de `movimentacoes_conta` vinculadas ao lote (tipo IN ('entrega','ajuste_produto'), agrupadas por produto_id) SE mono-produto (fator=1.0) — usada em TODOS os pontos do trigger que dependiam de `lote_itens` (loop de produtos a recalcular, receita, taxa, funrural, kg, custo_aquisicao). Causa raiz confirmada por grep no repo inteiro: NENHUM código de aplicação insere em `lote_itens` desde a 052 (só o backfill único daquela migration, a partir do então existente `lotes.produto_id`, dropado na mesma 052) — `iniciarLote`/`confirmarComposicaoLote` (app/(sistema)/comercializacao/lotes/actions.ts) nunca gravam lote_itens; não é exclusivo de transferencia_interna, é qualquer lote criado após 24/06/2026. Backfill: `lote_itens` populado para todo lote sem itens mas com movimentações mono-produto vinculadas (cobre 002/003, deixa a tabela consistente para outros consumidores — documento-transferencia.ts, emitir-nfe-saida.ts, tela de detalhe do lote). Recálculo do histórico via touch em `vendas_externas.observacoes` (mesmo truque da 068/082). Fora de escopo: corrigir o código de aplicação para gravar lote_itens no fluxo normal (reportado, não alterado) |

**Próxima migration:** 085

### Comercialização — observações (22/06/2026)
- notas_entrega.status: aceita 'autorizada' | 'processando' | 'rejeitada' | 'emitida' | 'cancelada'
- notas_entrega: campos chave_nfe, numero_nfe, serie, xml_url, danfe_url, referencia,
  motivo_rejeicao, valor_unitario, valor_total, quantidade_kg, cfop, produtor_id já existem
- vendas_externas: campos fiscais chave_nfe, numero_nfe, serie_nfe, status_nfe,
  xml_nfe, data_emissao_nfe já existem (sem migration adicional)
- `danfe_url` NÃO existe em vendas_externas — gerar URL via `https://focusnfe.com.br/danfe/{chave_nfe}`
- compradores: campos ie, logradouro, numero, bairro, cep, municipio, uf
  já existiam no banco — apenas expostos no formulário nesta sessão
- lotes: safra_id deve ser preenchido ao criar (hoje não é obrigatório na UI)

### loja_compras — campos fiscais (migration 044)
- `chave_acesso_nfe` TEXT — chave 44 dígitos
- `serie_nfe` TEXT
- `data_emissao_nfe` DATE
- `emitente_nfe` TEXT — razão social do emitente
- `cnpj_emitente` TEXT
- `valor_nfe` NUMERIC(12,2)
- `status_nfe` TEXT DEFAULT 'sem_chave' CHECK IN ('com_chave','sem_chave','sem_nota')

## Tabelas principais

### Core
- `organizacoes` — orgs multi-tenant (modulos_ativos text[]); +aliquota_funrural numeric(6,4) default 0.0163 (migration 082, usado por fn_atualizar_resultado_safra_snapshot em vez do valor hardcoded)
- `usuarios` — login, role, funcoes text[], organizacao_id
- `cooperados` — vínculo societário (CAF, DAP, quota_parte, status, numero_matricula AANNNN)
- `produtores` — identidade cadastral (CPF, nome, cooperado_id, usuario_id, tipo)

### Comercialização
- `sessoes_caixa`, `aportes_sangrias`, `saldos_produto`
- `notas_entrega`, `contas_produtor`
- `lotes` — codigo, peso_total_kg, status (aberto|em_venda|entregue), produto_descricao, data_fechamento, safra_id (nullable), produto_id (nullable)
- `movimentacoes_conta` — tipo='entrega' vincula ao lote via lote_id; campos +chave_nfe_entrada, +xml_nfe_entrada
- `compradores` — +ie, +logradouro, +numero, +complemento, +bairro, +cep, +municipio, +uf
- `vendas_externas` — +chave_nfe, +numero_nfe, +serie_nfe, +status_nfe, +xml_nfe, +data_emissao_nfe, +tipo_documento (migration 067)
- `cotacoes` — (org, produto, vigente_a_partir_de timestamptz, preco_externo, preco_cooperado)
  - SEM campo `data` — removido na migration 052
  - Cotação ativa: WHERE vigente_a_partir_de <= now() ORDER BY vigente_a_partir_de DESC LIMIT 1
  - UNIQUE antigo (org, produto, data) removido — múltiplas cotações no mesmo dia são permitidas
- `movimentacoes_conta` — +cotacao_id uuid FK → cotacoes (nullable; obrigatório apenas em tipo='conversao', validado na action)
- `movimentacoes_conta` — +safra_id uuid FK → safras (nullable; migration 082) — NÃO é gravado pela aplicação. Estampado automaticamente por trigger `trg_estampar_safra_movimentacao` (BEFORE INSERT; migration 083 generalizou o `trg_estampar_safra_conversao` da 082 de só tipo='conversao' para também 'entrega' e 'ajuste_produto'), usando a safra com status='em_andamento' da org no momento do INSERT. Não confundir com o vínculo lote→safra usado pelo trigger de vendas (`fn_atualizar_resultado_safra_snapshot`) — esse continua indireto via lote_id, setado só depois via confirmarComposicaoLote; `safra_id` em movimentacoes_conta é independente e alimenta `saldos_produtor_snapshot` (083)
- `contas_produtor` — +CHECK saldo_financeiro >= 0 (migration 065, NOT VALID + validada em produção). `saldos_produto.quantidade` PODE ficar negativo (venda antecipada / débito de produto); saldo_financeiro NUNCA. Cascata em `registrarSaquePorValor` (lib/comercializacao/caixa.actions.ts): cobre o que der do saldo em R$, converte o restante em produto
- `lotes` — codigo, peso_total_kg (mantido por trigger), status (rascunho|aberto|em_venda|entregue), produto_descricao (legacy, só para NF-es emitidas antes de 052), data_fechamento, safra_id
  - SEM produto_id — removido na migration 052
  - Produtos do lote vivem em `lote_itens`
- `lote_itens` (NOVA — migration 052) — lote_id FK, produto_id FK, peso_kg
  - UNIQUE (lote_id, produto_id)
  - Trigger trg_sincronizar_peso_lote mantém lotes.peso_total_kg atualizado
- `saldos_produtor_snapshot` (NOVA — migration 052; trigger recriado do zero na 083)
  - (org, produtor, produto, safra) UNIQUE
  - kg_entregue, kg_convertido, saldo_kg (GENERATED), valor_convertido_rs
  - Mantida por trigger trg_atualizar_saldos_produtor_snapshot em movimentacoes_conta (AFTER INSERT/UPDATE/DELETE, recálculo do zero via fn_recalc_saldo_produtor — 083; a versão da 052 era incremental/AFTER INSERT-only e dependia de lote_id, por isso ficou congelada entre 24/06 e a correção)
  - safra_id de cada movimentação vem de `movimentacoes_conta.safra_id`, estampado por `trg_estampar_safra_movimentacao` (083, generaliza a 082) — não depende mais de lote_id
- `resultado_safra_snapshot` (NOVA — migration 052; ganhou colunas na 082)
  - (org, safra, produto) UNIQUE
  - receita_bruta_rs, custo_aquisicao_rs (DEPRECATED — 082), taxa_cooperativa_rs, funrural_rs
  - resultado_liquido_rs (GENERATED, DEPRECATED — 082), preco_medio_kg (GENERATED), total_kg_vendido
  - kg_convertido, custo_convertido_rs (082) — mantidos por trg_atualizar_custo_convertido em movimentacoes_conta (tipo='conversao'), independente do trigger de vendas
  - lucro_realizado_rs (GENERATED — 082) — fórmula do REALIZADO (docs/PLANO_RESULTADO_COMERCIALIZACAO.md §2)
  - Ponta de vendas mantida por trigger trg_atualizar_resultado_safra_snapshot em vendas_externas; ponta de conversão mantida por trg_atualizar_custo_convertido em movimentacoes_conta — cada trigger só escreve nas suas próprias colunas
- `vw_saldos_produtor` (VIEW) — snapshot + JOIN produtores, produtos, safras
- `vw_resultado_safra` (VIEW) — snapshot + JOIN produtos, safras (legado — prefira `vw_resultado_comercializacao` em código novo)
- `vw_resultado_comercializacao` (VIEW — migration 082) — realizado (resultado_safra_snapshot) + marcação a mercado calculada na leitura (cotação ativa via LATERAL, preco_cooperado); expõe estoque_kg, passivo_a_ordem_kg, ajuste_mercado_rs, lucro_corrente_rs, exposicao_kg. security_invoker=on. Marcação nunca é armazenada — reprecifica a cada consulta
- `produtos` — cacau, agrofloresta; +ncm, +cfop_saida_interna, +cfop_saida_interestadual, +cst_icms, +cst_pis, +cst_cofins, +fator_saca (default 60)

### Loja Agropecuária
- `loja_vendas` — pago_especie, pago_pix, pago_cartao, pago_saldo, tipo_cartao, cartao_nsu, cartao_autorizacao, pix_identificador, pix_nome_pagador, status_conferencia (via loja_caixas)
- `loja_venda_itens`
- `loja_produtos` — preco_normal, desconto_cooperado, desconto_cooperado_pct, unidade (string livre), ncm, cfop_saida
- `loja_caixas` — status, valor_abertura, status_conferencia, valor_fisico_especie, valor_fisico_debito, valor_fisico_credito, conferido_por, conferido_em
- `loja_lotes` — FIFO por data_validade
- `loja_compras` — chave_acesso_nfe, serie_nfe, data_emissao_nfe, emitente_nfe, cnpj_emitente, valor_nfe, status_nfe ('com_chave'|'sem_chave'|'sem_nota', default 'sem_chave')
- `loja_compra_itens`
- `loja_fornecedores`
- `loja_sangrias`
- `loja_estoque_movimentos`
- `loja_notas_fiscais`
- `loja_unidades` — unidades dinâmicas por org

### Comercialização — transferência interna sem NF-e (migration 067)
- `vendas_externas.tipo_documento` TEXT NOT NULL DEFAULT 'nfe_saida', CHECK ('nfe_saida'|'transferencia_interna')
  - `nfe_saida` (padrão): fluxo atual, cooperativa emite NF-e de saída via Focus NFe
  - `transferencia_interna`: comprador é empresa do próprio cooperado, emite a NF-e de venda por fora do NexCoop. Cooperativa não emite NF-e nessa operação — só gera documento interno sem valor fiscal (rota `app/api/comercializacao/documento-transferencia/[id]/route.ts`). Campos fiscais (chave_nfe, status_nfe etc.) ficam NULL nesse caso.

### Cooperados — Propriedades
- `propriedades_rurais` (NOVA — migration 066) — cooperado_id FK, 0..N por cooperado. nome, area_total_ha, latitude, longitude, caf_numero, caf_situacao, caf_validade, dap_numero. Substitui os campos soltos que existiam em `cooperados` (nome_propriedade, area_total_ha etc. — mantidos na tabela por compatibilidade, não usados pela UI a partir da 066)

### Cooperados — Cotas
- `grupos_colaboradores` — grupos por org (com/sem CNPJ, criação inline)
- `cotas_cooperado` — tipo_cota (plena/colaboradora), grupo_id, quantidade, valor_unitario
- `grupo_representantes` — representante por grupo (1 a cada 10 membros)
- `cota_pagamentos` — forma (dinheiro/pix/cartao/promessa), parcelas, data_vencimento, status

### Outros
- `audit_logs` — imutável, `registrarLog()` em lib/audit/logger.ts
- `plano_contas`, `lancamentos_contabeis`
- `profissionais_parceiros`, `empresas_parceiras`

## RLS — padrão correto

```sql
-- CORRETO
organizacao_id = (select organizacao_id from usuarios where id = auth.uid())

-- ERRADO — não usar
organizacao_id = auth_org_id()
```

## Joins ambíguos conhecidos

- `loja_caixas → usuarios`: DUAS FKs — `usuario_id` (operador) e `conferido_por` (gerente). Join PostgREST quebra silenciosamente mesmo com hint. Solução definitiva: query separada (fetch caixas → collect usuario_ids → fetch usuarios → merge manual).
- Migration 042 adicionou `conferido_por` FK → causou ambiguidade

## Joins com ambiguidade conhecida

| Tabela | Situação | Solução |
|---|---|---|
| `movimentacoes_conta` | múltiplas FKs para `usuarios` | usar hint explícito quando necessário |
| `lote_itens` | join via lote para chegar em org | subquery em RLS policy |
| `saldos_produtor_snapshot` | escrita apenas via trigger/service_role | nunca usar createClient() para escrita |
