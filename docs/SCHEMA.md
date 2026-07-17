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
| 038 | loja_sangrias |
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

**Próxima migration:** 071

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
- `organizacoes` — orgs multi-tenant (modulos_ativos text[])
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
- `contas_produtor` — +CHECK saldo_financeiro >= 0 (migration 065, NOT VALID + validada em produção). `saldos_produto.quantidade` PODE ficar negativo (venda antecipada / débito de produto); saldo_financeiro NUNCA. Cascata em `registrarSaquePorValor` (lib/comercializacao/caixa.actions.ts): cobre o que der do saldo em R$, converte o restante em produto
- `lotes` — codigo, peso_total_kg (mantido por trigger), status (rascunho|aberto|em_venda|entregue), produto_descricao (legacy, só para NF-es emitidas antes de 052), data_fechamento, safra_id
  - SEM produto_id — removido na migration 052
  - Produtos do lote vivem em `lote_itens`
- `lote_itens` (NOVA — migration 052) — lote_id FK, produto_id FK, peso_kg
  - UNIQUE (lote_id, produto_id)
  - Trigger trg_sincronizar_peso_lote mantém lotes.peso_total_kg atualizado
- `saldos_produtor_snapshot` (NOVA — migration 052)
  - (org, produtor, produto, safra) UNIQUE
  - kg_entregue, kg_convertido, saldo_kg (GENERATED), valor_convertido_rs
  - Mantida por trigger trg_atualizar_saldos_produtor_snapshot em movimentacoes_conta
- `resultado_safra_snapshot` (NOVA — migration 052)
  - (org, safra, produto) UNIQUE
  - receita_bruta_rs, custo_aquisicao_rs, taxa_cooperativa_rs, funrural_rs
  - resultado_liquido_rs (GENERATED), preco_medio_kg (GENERATED), total_kg_vendido
  - Mantida por trigger trg_atualizar_resultado_safra_snapshot em vendas_externas
- `vw_saldos_produtor` (VIEW) — snapshot + JOIN produtores, produtos, safras
- `vw_resultado_safra` (VIEW) — snapshot + JOIN produtos, safras
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
