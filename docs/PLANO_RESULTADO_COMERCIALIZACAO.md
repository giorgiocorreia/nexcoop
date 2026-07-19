# Desenho técnico: Resultado da Comercialização — realizado + marcação a mercado

**Status:** Aprovação de desenho pendente — nada implementado
**Criado em:** 19/07/2026
**Contexto:** conversa Giorgio × Claude sobre acompanhamento de lucro da org.
Decisão de produto já tomada: decompor o resultado em **realizado** (transações
consumadas, base pra divisão de sobras no fim do exercício) e **ajuste a
mercado** (posição em aberto avaliada à cotação atual, painel de gestão diária).

---

## 1. Por que mudar — auditoria do modelo atual (migration 055)

O `resultado_safra_snapshot` de hoje mistura pontas incompatíveis:

| Problema | Efeito |
|---|---|
| Receita conta só kg **vendidos**; custo conta **todas** as notas de entrega autorizadas (vendidas ou não) | Subestima lucro enquanto há estoque; superestima quando kg à ordem vendido não tem nota |
| Custo = `notas_entrega.valor_total` (valor na entrega), não o que foi efetivamente convertido/pago | No regime à ordem o produtor fixa o preço depois — o custo real é outro |
| `LIMIT 1` no produto do lote (055 regrediu o rateio proporcional da 052) | Lote multi-produto joga todo o valor no primeiro produto |
| FUNRURAL hardcoded `0.0163` no trigger | Mudança de alíquota reescreve o histórico (o trigger recalcula do zero) |

O recálculo-do-zero a cada evento é a única coisa a **preservar**: torna a
migração segura (fórmula nova corrige o histórico inteiro na primeira execução).

---

## 2. Modelo conceitual

Lucro bruto corrente da Comercialização, por produto+safra:

```
lucro_corrente = REALIZADO + AJUSTE A MERCADO

REALIZADO  (só transações consumadas, nunca muda retroativamente)
  = LEAST(kg_vendido, kg_convertido)
    × (preco_medio_venda_liquido − custo_medio_convertido)
    onde preco_medio_venda_liquido já desconta taxa e FUNRURAL

AJUSTE A MERCADO  (flutua com a cotação — calculado na leitura, não armazenado)
  = estoque_fisico_kg × cotacao_atual        (ativo: kg entregues e não vendidos)
  − saldo_a_ordem_kg  × cotacao_atual        (passivo: kg entregues e não convertidos)

EXPOSIÇÃO (indicador de risco, exibido junto)
  = kg vendidos ainda sem custo fixado = GREATEST(kg_vendido − kg_convertido, 0)
```

Propriedades: todo número do realizado vem de transação real; no fechamento da
safra (tudo convertido e vendido) o ajuste zera e o total colapsa no realizado —
que é o valor definitivo, apto pra apuração de sobras.

Decisão embutida (default conservador): estoque e passivo à ordem avaliados
ambos a `cotacoes.preco_cooperado` (custo de reposição) — não antecipa margem
de venda futura. Alternativa (estoque a `preco_externo`) fica documentada mas
não é o default.

---

## 3. Mudanças de schema (migration 082 — via subagente nexcoop-migration-writer)

### 3.1 `resultado_safra_snapshot` — ganha a ponta de custo real

Novas colunas:

- `kg_convertido numeric(12,3) NOT NULL DEFAULT 0`
- `custo_convertido_rs numeric(14,2) NOT NULL DEFAULT 0`
- `lucro_realizado_rs numeric(14,2) GENERATED ALWAYS AS (...) STORED` — fórmula
  do REALIZADO acima (LEAST dos volumes × diferença das médias; 0 quando um dos
  volumes é 0)

Colunas existentes:

- `receita_bruta_rs`, `taxa_cooperativa_rs`, `funrural_rs`, `total_kg_vendido`:
  mantidas (ponta da venda continua igual, com fixes do §3.3)
- `custo_aquisicao_rs` e `resultado_liquido_rs` (GENERATED sobre ela): **manter
  por uma transição** com a tela antiga, marcar como deprecated no SCHEMA.md,
  e derrubar numa migration futura após validação dos números novos. Não
  reaproveitar o nome pra semântica nova (evita confundir histórico).

### 3.2 Novo trigger em `movimentacoes_conta` (tipo='conversao')

`trg_atualizar_custo_convertido` → recalcula do zero, pro (org, safra, produto)
afetado: `kg_convertido = SUM(quantidade_kg)` e `custo_convertido_rs =
SUM(valor)` das movimentações tipo `conversao`. Cobre INSERT/UPDATE/DELETE
(mesmo padrão de recálculo total do trigger de vendas). Atenção: descontar
estornos se existirem movimentações de estorno de conversão.

Nota: já existe `trg_atualizar_saldos_produtor_snapshot` nessa tabela — o novo
trigger convive (AFTER, nomes distintos); verificar ordem alfabética de firing
se houver dependência (não deve haver: escrevem em tabelas diferentes).

### 3.3 Fixes no trigger de vendas (`fn_atualizar_resultado_safra_snapshot`)

1. **Rateio multi-produto**: restaurar a proporção por `lote_itens` da migration
   052 (fator = peso do item ÷ peso do lote), eliminando o `LIMIT 1`.
2. **FUNRURAL parametrizado**: nova coluna `organizacoes.aliquota_funrural
   numeric(6,4) NOT NULL DEFAULT 0.0163`. O trigger lê da org. (Se um dia
   variar por venda, promover pra coluna em `vendas_externas` preenchida na
   action — fora de escopo agora.)
3. Manter os filtros existentes (`status_nfe NOT IN ('cancelada','devolvida')`
  com o fix de NULL da migration 068 — transferência interna conta).

### 3.4 View nova `vw_resultado_comercializacao` (marcação na leitura)

Por (org, safra, produto), JOIN de:

- `resultado_safra_snapshot` (realizado)
- agregado de `saldos_produtor_snapshot`: `SUM(kg_entregue)`, `SUM(saldo_kg)`
  (= passivo à ordem em kg)
- cotação ativa via LATERAL (`vigente_a_partir_de <= now() ORDER BY ... DESC
  LIMIT 1` — padrão documentado no SCHEMA.md)

Expõe: componentes do realizado, `estoque_kg = SUM(kg_entregue) −
total_kg_vendido`, `passivo_a_ordem_kg`, `ajuste_mercado_rs`,
`lucro_corrente_rs`, `exposicao_kg`, e a cotação usada (valor + vigência, pra
tela mostrar a base do cálculo). `security_invoker = on` (lição da 075).

Marcação **não é armazenada**: mudança de cotação reprecifica na leitura
automaticamente, sem trigger em `cotacoes` e sem job.

### 3.5 O que NÃO muda

- `saldos_produtor_snapshot` e seus triggers — intocados (a view só lê).
- Regra crítica 9: snapshots continuam escritos exclusivamente por trigger.
- Quebra de peso (069) segue fora do snapshot — reduz o a-receber do
  lançamento, não a receita bruta. (Revisar em fase 2 se deve virar dedução.)

---

## 4. Tela `/comercializacao/resultado` (subagente nexcoop-comercializacao, após o schema)

Passa a ler `vw_resultado_comercializacao`:

- KPIs por safra: **Lucro realizado** (destaque), **Ajuste a mercado** (com
  sinal e cor), **Lucro corrente** (soma), **Exposição** (kg a descoberto).
- Tabela por produto: kg vendido / kg convertido / estoque / à ordem, médias
  reais de venda e custo, realizado, ajuste, corrente.
- Rodapé com a cotação usada na marcação e sua vigência.
- Texto fixo curto: "Realizado = transações consumadas (base p/ sobras).
  Ajuste a mercado = posição em aberto na cotação atual — flutua diariamente."
- Ficha do lote (fase 2): receita real do lote + kg a descoberto do lote —
  **sem** "lucro do lote" (decisão registrada: não existe de forma honesta no
  regime à ordem).

Dashboard (fase 3): card "Resultado Comercialização" com realizado da safra
corrente, clicável pra tela — padrão KPI clicável já estabelecido.

---

## 5. Sequência de execução e validação

1. **Migration 082** (nexcoop-migration-writer): colunas + trigger de conversão
   + fix do trigger de vendas + view + `aliquota_funrural`. Executar no
   Dashboard SQL Editor; commit do arquivo em `supabase/migrations/`.
2. **Backfill/validação**: um UPDATE no-op em uma venda e uma conversão por
   (org, safra, produto) dispara os recálculos-do-zero; conferir com COOPAIBI:
   `kg_convertido` × extrato de conversões, realizado × conferência manual de
   uma safra.
3. **Tela nova** lendo a view, mantendo a antiga acessível até validação do
   Giorgio com dados reais.
4. **Limpeza** (migration futura): drop de `custo_aquisicao_rs` +
   `resultado_liquido_rs` antigos e do código que os lê.

Riscos conhecidos: (a) conversões antigas sem `cotacao_id`/valor consistente —
auditar antes do backfill; (b) vendas antecipadas (saldo de produto negativo,
migration 065) — `saldo_kg` negativo entra no passivo com sinal correto, mas
conferir na validação; (c) performance dos recálculos-do-zero em safra grande —
aceitável hoje (mesmo padrão atual), revisar se virar gargalo.

---

## 6. Relação com a divisão de sobras (fim do exercício)

- Base: **somente o realizado**, consolidado na DRE do Contábil no fechamento —
  ajuste a mercado nunca entra (à ordem em aberto é passivo no balanço).
- O rateio por cooperado (proporcional às operações, Lei 5.764/71) sai de
  `movimentacoes_conta`/`saldos_produtor_snapshot` por produtor — fundação já
  existe; destinações obrigatórias (reserva legal, FATES) a definir com o
  contador. Fora de escopo deste plano; registrado pra não perder.
