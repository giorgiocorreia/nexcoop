# Plano de melhoria — Módulo Contábil

> Diagnóstico e roadmap (código, banco, contabilidade cooperativa, UX).  
> **Não é checklist de implementação imediata** — priorizar com o produto.  
> Elaborado em **07/08/2026** (sessão Grok / revisão contábil + parceiro + NF-e).

## 1. Estado atual (resumo)

### Superfície
- Telas em `app/(sistema)/contabil/*`: plano de contas, escrituração, balancete, DRE, balanço, razão, diário, sobras, conciliação, calendário, **NF-e** (consulta), exportações, de/para.
- Portal parceiro: `app/(sistema)/escritorio/*` + cookie `parceiro_org_id` para entrar no cliente.
- Kit UI: `PageLayout` + `MODULO_CONTABIL` + `COM_C`.

### Código
- Motor: `lib/contabil/actions.ts` (relatórios, plano, SPED auxiliar, conciliação…).
- Auto-classificação: `lib/contabil/classificacao-automatica.ts` (regras por texto).
- NF-e contábil (consulta): `app/(sistema)/contabil/nfe/*` — **independente** de `comercializacao/fiscal/*`.
- Fiscal operacional (cancelar, CC-e, docs lote): `/comercializacao/fiscal`.

### Modelo de dados
- `plano_contas`, `partidas` (1 débito + 1 crédito por linha), `exercicios_contabeis`, `configuracoes_contabeis`, `de_para_contas`, `nfe_importadas` (XML manual legado).
- Integração: `lancamentos` (financeiro) → `partidas` (escrituração).
- NF-e de entrada real: `notas_entrega` (comercialização) — status `processando` | `autorizada` | `emitida` | …
- Coluna de data de emissão na nota: **`emitida_em`** (não `emitido_em`).

### O que o módulo *parece* vs *é*
- **Parece:** contabilidade completa + SPED oficial.
- **É:** escrituração por partida simples + demonstrações em memória + SPED **auxiliar** + classificação do financeiro + consulta fiscal.

---

## 2. Problemas principais

### Contabilidade
| ID | Problema | Prioridade |
|----|----------|------------|
| C1 | Partida só 1 D + 1 C — multi-linha (impostos, rateio) limitada | Alta |
| C2 | Classificação automática só por regex em descrição | Alta |
| C3 | Plano seed genérico; catch-all de despesa | Alta |
| C4 | Ato cooperativo vs não-cooperativo frágil nos relatórios | Alta |
| C5 | SPED ECD simplificado (não entrega RFB) | Crítica (expectativa) |
| C6 | Exercício contábil sem trava clara em todos os fluxos | Alta |
| C8 | NF-e e partidas pouco amarradas | Alta |

### Engenharia
| ID | Problema | Prioridade |
|----|----------|------------|
| E1 | `createAdminClient` + `orgId` da UI sem `withOrg` único | Crítica |
| E2 | Balancete/DRE/SPED carregam todas as partidas e filtram em JS | Alta |
| E3 | Sem paginação em filas densas | Alta |
| E4 | Botões mortos / PDF placeholder em exportações | Alta |
| E7 | Inconsistência de nomes de coluna (ex.: `emitido_em` vs `emitida_em`) | Alta |
| E10 | Escopo de módulo do parceiro por request | Crítica |

### UX
| ID | Problema | Prioridade |
|----|----------|------------|
| U1 | ~13 itens contábeis planos na sidebar | Alta |
| U2 | Sem hub/dashboard contábil | Alta |
| U3 | Contexto parceiro (escritório × cliente) — parcialmente melhorado em 07/08 | Alta |
| U4 | Período (mês/ano) não global entre telas | Alta |
| U5 | Escrituração não destacada como jornada principal | Alta |
| U7 | Demonstrações sem drill-down para o razão | Alta |

---

## 3. Roadmap (fases)

### Fase 0 — Fundação (segurança + honestidade)
- Copy SPED: “base / auxiliar”, não “entrega RFB”.
- Remover ou implementar botões sem função.
- `getOrgContext` / `withOrg` em actions contábeis; revalidar `modulos_acesso` do parceiro a cada request.
- Inventário de personas (admin / contador / parceiro).

### Fase 1 — Posto de trabalho do contador (UX)
- Hub `/contabil` (pendentes, exercício, obrigações, alertas NF-e).
- Sidebar em grupos: Operação · Demonstrações · Fechamento · Fiscal · Obrigações.
- Seletor global de período (exercício + mês).
- Escrituração com bulk, motivo da regra `[Auto]`, desfazer.
- Drill-down balancete/DRE → razão → origem.
- Plano de contas: busca, editar, inativar, import CSV.

### Fase 2 — Motor e banco
- Journal multi-linha (ΣD = ΣC) com migração das partidas atuais.
- Trava de exercício ENCERRADO; estorno por contrapartida.
- Índices / views de saldo por conta-mês.
- Origem estruturada (`origem_tipo` + `origem_id`).
- Testes golden de balancete/DRE.

### Fase 3 — Cooperativa
- Plano modelo agro expandido.
- Regras de classificação configuráveis (tabela + UI).
- Eventos contábeis padrão da comercialização e loja.
- Wizard de sobras / pacote AGO.

### Fase 4 — Fiscal × contábil e parceiro
- Fila “NF-e sem partida”.
- Export XML em lote (entradas: feito em 07/08; saídas contábeis a espelhar).
- Portal multi-cliente do escritório.
- Permissões finas contador / contador_aux / admin.

### Fase 5 — SPED formal (opcional, grande)
- ECD registro a registro + PVA + assinatura.
- Feature flag por plano comercial.

### Fase 6 — Conciliação, PDF, mobile
- OFX, matching sugerido, PDF profissional, mobile das tabelas.

---

## 4. Releases sugeridas

| Release | Foco | Ordem de grandeza |
|---------|------|-------------------|
| **A** Contábil confiável | Hub, menu, período, segurança, queries, copy SPED | 4–6 semanas |
| **B** Posto do contador | Escrituração avançada, drill-down, regras v1, NF-e amarrada | 6–8 semanas |
| **C** Cooperativa + fechamento | Multi-linha, sobras, plano agro, eventos comerc./loja | 6–8 semanas |
| **D** Compliance | ECD validável (se for meta de produto) | Grande |

---

## 5. Critérios de sucesso

1. Nenhuma action contábil aceita `orgId` sem provar vínculo do usuário.
2. Balancete do mês &lt; 2s com 100k partidas (meta).
3. ≥ 80% de classificação correta em amostra auditada (mensalidade/loja).
4. Parceiro identifica em &lt; 5s se está no **meu escritório** ou no **cliente**.
5. Zero botão contábil sem função em produção.
6. SPED: ou aceite PVA (Release D), ou zero expectativa errada na UI.

---

## 6. Relacionados

- Status do módulo: `docs/MODULOS.md` § Contábil  
- Schema: `docs/SCHEMA.md` (015–024, 061–062, `notas_entrega`)  
- Segurança parceiro: `docs/AUDITORIA_SEGURANCA_2026-07-12.md`  
- Sessão 07/08: `CONTEXTO_NEXCOOP.md`, `CHANGELOG.md`
