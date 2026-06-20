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

**Próxima migration:** 044

## Tabelas principais

### Core
- `organizacoes` — orgs multi-tenant (modulos_ativos text[])
- `usuarios` — login, role, funcoes text[], organizacao_id
- `cooperados` — vínculo societário (CAF, DAP, quota_parte, status, matrícula)
- `produtores` — identidade cadastral (CPF, nome, cooperado_id, usuario_id, tipo)

### Comercialização
- `sessoes_caixa`, `aportes_sangrias`, `saldos_produto`
- `notas_entrega`, `lotes`, `contas_produtor`, `movimentacoes_conta`
- `cotacoes` (produto_id, data, preco_externo, preco_cooperado)
- `produtos` (comercialização — cacau, agrofloresta, etc.)

### Loja Agropecuária
- `loja_vendas` — pago_especie, pago_pix, pago_cartao, pago_saldo, tipo_cartao, cartao_nsu, cartao_autorizacao, pix_identificador, pix_nome_pagador, status_conferencia (via loja_caixas)
- `loja_venda_itens`
- `loja_produtos` — preco_normal, desconto_cooperado, desconto_cooperado_pct, unidade (string livre), ncm, cfop_saida
- `loja_caixas` — status, valor_abertura, status_conferencia, valor_fisico_especie, valor_fisico_debito, valor_fisico_credito, conferido_por, conferido_em
- `loja_lotes` — FIFO por data_validade
- `loja_compras`, `loja_compra_itens`
- `loja_fornecedores`
- `loja_sangrias`
- `loja_estoque_movimentos`
- `loja_notas_fiscais`
- `loja_unidades` — unidades dinâmicas por org

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

- `loja_caixas → usuarios`: usar `usuarios!loja_caixas_usuario_id_fkey`
- Migration 042 adicionou `conferido_por` FK → causou ambiguidade
