# Plano — Loja Agropecuária NexCoop

Módulo de venda balcão de insumos e produtos agropecuários para cooperativas.
Cor de identidade: `#E07B30` (laranja).

---

## Passo 0 ✅ — Infraestrutura de módulos

- `organizacoes.modulos_ativos` (text[]): lista de módulos habilitados por org
- `lib/org.ts` → `getModulosAtivos()`: lê os módulos ativos do usuário logado
- Sidebar condicional: itens de Loja e Comercialização ocultos se módulo inativo
- Middleware: bloqueia rotas `/loja/*` e `/comercializacao/*` conforme `modulos_ativos`

---

## Fase 1 ✅ — Tipos, actions e permissões

### Arquivos
- `lib/loja/types.ts` — tipos TypeScript completos (produto, categoria, compra, lote de estoque, venda)
- `lib/loja/actions.ts` — server actions CRUD
- `lib/permissoes.ts` — permissões adicionadas: `loja_admin`, `loja_operador`, `loja_caixa`

### Modelos principais
```
loja_categorias       id, org_id, nome, descricao, ativo
loja_produtos         id, org_id, categoria_id, nome, descricao, unidade, preco_venda,
                      desconto_cooperado boolean, desconto_cooperado_pct decimal, ativo
loja_compras          id, org_id, fornecedor, numero_nf, data_compra, valor_total,
                      valor_frete, outros_custos_valor, outros_custos_descricao, observacoes
loja_compra_itens     id, compra_id, produto_id, quantidade, preco_unitario, custo_rateado
loja_estoque          id, org_id, produto_id, compra_id, lote, quantidade_inicial,
                      quantidade_atual, custo_unitario, data_entrada (FIFO)
loja_vendas           id, org_id, usuario_id, cooperado_id, forma_pagamento, total, data
loja_venda_itens      id, venda_id, produto_id, estoque_id, quantidade, preco_unitario,
                      desconto_pct, subtotal
```

---

## Fase 2 ✅ — Catálogo de produtos e categorias

### Rotas implementadas
| Rota | Descrição |
|---|---|
| `/loja` | Dashboard: total de produtos, valor em estoque, compras recentes |
| `/loja/produtos` | Listagem com busca por nome e filtro por categoria |
| `/loja/produtos/novo` | Cadastro: nome, categoria, unidade, preço, desconto cooperado |
| `/loja/produtos/[id]` | Detalhes, edição, histórico de estoque por lote |
| `/loja/categorias` | Listagem, criação e edição de categorias |

---

## Fase 3 ✅ — Compras, rateio de custos e controle de estoque

### Rotas implementadas
| Rota | Descrição |
|---|---|
| `/loja/compras` | Listagem de compras com data, fornecedor, valor total |
| `/loja/compras/nova` | Registro de compra: fornecedor, NF, frete, outros custos + itens |
| `/loja/compras/[id]` | Detalhes: dados da NF, itens, custo rateado por item |
| `/loja/estoque` | Visão geral: produto, lotes disponíveis (FIFO), custo médio |
| `/loja/estoque/ajuste` | Ajuste manual: produto, quantidade (+ ou −), motivo |

### Regra de rateio de custos
Frete e outros custos são rateados proporcionalmente ao valor de cada item:
```
custo_rateado_item = (valor_item / valor_total_itens) × (valor_frete + outros_custos)
custo_unitario_lote = (preco_unitario + custo_rateado_item) / quantidade
```

### Migrations aplicadas
- **Migration 037**: `loja_compras` expandida com:
  - `numero_nf` varchar
  - `data_compra` date
  - `valor_frete` decimal default 0
  - `outros_custos_valor` decimal default 0
  - `outros_custos_descricao` varchar
  - `observacoes` text

---

## Fase 4 ⏳ — PDV (ponto de venda balcão)

> **Status:** não iniciada — executar em chat separado.

### Rotas a implementar
| Rota | Descrição |
|---|---|
| `/loja/pdv` | Tela principal do caixa: busca de produto, carrinho, finalização |
| `/loja/pdv/sangria` | Sangria de caixa (exige senha gerente/admin) |
| `/loja/vendas` | Histórico de vendas |
| `/loja/vendas/[id]` | Detalhes de uma venda |

### Fluxo de venda
1. Atendente busca produto (nome ou código)
2. Seleciona quantidade
3. Sistema mostra preço — desconto cooperado aplicado automaticamente se cooperado identificado
4. Desconto adicional: campo livre, porém acima do padrão exige senha de gerente/admin
5. Seleciona forma de pagamento:
   - **Dinheiro** — sempre disponível
   - **Pix** — sempre disponível
   - **Conta corrente** — só se: cooperado identificado + saldo suficiente + módulo `comercializacao` ativo
6. Confirma venda → baixa de estoque FIFO + registro em `loja_vendas` + `loja_venda_itens`
7. Se conta corrente: insere em `movimentacoes_conta` tipo `'compra_loja'` (valor negativo)

### Regras de negócio PDV
| Regra | Detalhe |
|---|---|
| Desconto padrão cooperado | `desconto_cooperado_pct` do produto, aplicado automaticamente |
| Desconto acima do padrão | exige senha de gerente ou admin (modal de autenticação) |
| Conta corrente — elegibilidade | cooperado com `modulo comercializacao` ativo + saldo ≥ valor da compra |
| Conta corrente — nomenclatura | "Conta corrente" e "Saldo em conta corrente" (nunca "fiado" ou "crédito") |
| Baixa de estoque | FIFO: consome o lote de `data_entrada` mais antigo primeiro |
| Sangria | exige senha de gerente/admin; registra em tabela de movimentos do PDV |
| Venda sem estoque | bloquear — não permitir vender produto sem lote disponível |

### Componentes a criar
- `components/loja/CarrinhoPDV.tsx` — estado local do carrinho
- `components/loja/BuscaProduto.tsx` — busca em tempo real com debounce
- `components/loja/ModalDescontoExtra.tsx` — autenticação de gerente/admin
- `components/loja/ModalFinalizarVenda.tsx` — seleção de forma de pagamento + confirmação
- `lib/loja/pdv.actions.ts` — server action `registrarVenda()` (transação: estoque + venda + conta)

---

## Fase 5 ⏳ — Relatórios e fechamento

> **Status:** não iniciada.

### Rotas previstas
| Rota | Descrição |
|---|---|
| `/loja/relatorios` | Vendas por período, produto mais vendido, margem |
| `/loja/relatorios/fechamento` | Fechamento de caixa PDV (sangrias, total por forma de pagamento) |

---

## Decisões técnicas consolidadas

| Decisão | Escolha |
|---|---|
| Controle de acesso à Loja | `modulos_ativos text[]` em `organizacoes` |
| Baixa de estoque | FIFO por `data_entrada` do lote |
| Rateio de frete/custos | proporcional ao valor (não à quantidade) de cada item |
| Conta corrente — tabelas | `contas_produtor` / `movimentacoes_conta` tipo `'compra_loja'` |
| Autenticação de desconto extra e sangria | `signInWithPassword` do gerente/admin (mesmo padrão de aporte/sangria do Comercialização) |
| Preço de custo no lote | inclui rateio de frete e outros custos |
| Tipos em types/database.ts | atualizar manualmente a cada nova tabela da Loja |

---

*Última atualização: 15/06/2026*
