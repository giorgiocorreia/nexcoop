# Plano de testes — Módulo Contábil

> Checklist e estratégia de teste para contábil, parceiro e NF-e relacionada.  
> Elaborado em **07/08/2026**. **Não executa testes** — é o plano para QA/dev.  
> Complementa: `docs/PLANO_CONTABIL.md` · status em `docs/MODULOS.md` § Contábil.

---

## 1. Objetivos

1. Garantir que **partida dobrada** e demonstrações batem com o financeiro/origem.
2. Evitar regressão dos bugs de **NF-e entrada** (`emitida_em`, falso “autorizada”).
3. Validar **isolamento multi-tenant** e **escopo do parceiro** (escritório × cliente).
4. Cobrir **jornadas reais** (admin COOPAIBI, contador Contabahia, emissão no lote).
5. Deixar claro o que é **smoke**, **regressão** e **aceitação contábil**.

---

## 2. Estado atual da automação

| Item | Situação |
|------|----------|
| Framework de teste no `package.json` | **Vitest 4 desde 08/08/2026** (`npm test`) — ver `docs/TESTES.md`. Playwright continua não configurado |
| Testes de contábil | **Inexistentes** como suíte formal — a suíte que existe cobre só o módulo Site |
| Verificação usual | Manual em produção/homolog + `npx tsc --noEmit` |

> **Atualização 08/08/2026:** a recomendação da tabela abaixo deixou de ser
> hipótese na camada unitária — Vitest está instalado e rodando, no mesmo
> formato de nexcore e nexfin (teste co-localizado, `environment: 'node'`).
> O caminho para o contábil é o mesmo que funcionou no Site: extrair a parte
> pura para `*-utils.ts` (regra 5 do `CLAUDE.md`) e testar de lá — o que hoje
> depende de `createAdminClient()` não é testável sem banco.

### Recomendação de stack (quando for automatizar)

| Camada | Ferramenta sugerida | O quê |
|--------|---------------------|--------|
| Unitário | Vitest (ou Jest) | regras de classificação, saldos, formatação SPED auxiliar |
| Integração | Vitest + Supabase local/service role em projeto de teste | partidas, balancete, sync status NF-e |
| E2E | Playwright | login parceiro, escrituração, export XML, período |
| Contrato | scripts Node + REST (como os `_tmp_*` da sessão) | contagens e status no banco |

Até a stack existir, **executar as seções 5–8 manualmente** com o roteiro abaixo.

---

## 3. Personas e contas

| Persona | Conta / papel | O que testa |
|---------|----------------|-------------|
| **P-Admin** | `giorgio@coopaibi.com.br` (org_admin COOPAIBI) | Menu contábil completo, classificação, exports |
| **P-Super** | `gio.pessoal@gmail.com` | Impersonation (se usado); não é o caminho do contador |
| **P-Parceiro** | `fiscal@contabahia.com.br` (Érica / Contabahia) | `/escritorio` → cliente → contábil/NF-e consulta |
| **P-Operador** | caixa_cacau (ex.: Luan) | Emissão NF-e entrada no lote (gera matéria para contábil) |
| **P-Negativo** | usuário de outra org (se existir) | Não vê dados da COOPAIBI |

**IDs úteis**
- COOPAIBI: `3ad97dc2-f87f-4e67-950e-387854d5bccc`
- Produção: `https://nexcoop.com.br`

---

## 4. Ambientes e dados

| Ambiente | Uso |
|----------|-----|
| **Produção** | Smoke pós-deploy (cuidado: não classificar/estornar em massa) |
| **Homolog Focus** | Emissão NF-e de teste (entrada/saída) |
| **Local** | UI e fluxos sem token Focus se env faltar |

### Fixtures desejáveis (criar em org de teste ou seed)

| Fixture | Conteúdo mínimo |
|---------|-----------------|
| F1 | Plano de contas seed cooperativa carregado |
| F2 | Exercício contábil do ano corrente **ABERTO** |
| F3 | ≥ 5 `lancamentos` financeiros pendentes de classificação |
| F4 | ≥ 3 partidas já classificadas (mensalidade, venda loja, NF-e) |
| F5 | ≥ 1 lote com NF-e entrada autorizada (chave + `emitida_em`) e 1 saída autorizada |
| F6 | ≥ 1 nota entrada `processando` com `referencia` Focus válida (para sync) |
| F7 | Parceiro Contabahia ativo com `modulos_acesso` contendo `contabil` |

### Pré-condições de env (E2E/integração)

- `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- Focus comercialização: `FOCUSNFE_TOKEN_*` + `FOCUSNFE_AMBIENTE*`
- Nunca commitar dumps com PII real em repositório público

---

## 5. Pirâmide e níveis

```
        /\
       /E2E\        smoke + jornadas críticas (parceiro, escrituração, NF-e)
      /------\
     / Integr.\     partidas, balancete, getNfeStatus, export ZIP
    /----------\
   /   Unitário \   regras classificação, calcularSaldo, formatação
  /--------------\
```

| Nível | Quando rodar | Dono |
|-------|--------------|------|
| Unitário | PR que mexe em `lib/contabil/*` | Dev |
| Integração | PR schema/actions contábeis | Dev |
| E2E smoke | Todo deploy produção contábil/parceiro/NF-e | QA / Giorgio |
| Regressão manual | Release A/B do `PLANO_CONTABIL` | QA |
| Aceite contábil | Amostra com Contabahia | Contador + produto |

---

## 6. Casos de teste — por área

Legenda: **P0** bloqueia release · **P1** regressão obrigatória · **P2** importante · **P3** nice-to-have  
Resultado: Pass / Fail / Bloqueado

### 6.1 Plano de contas

| ID | Caso | Persona | P | Passos | Esperado |
|----|------|---------|---|--------|----------|
| PC-01 | Seed plano cooperativa | P-Admin | P0 | Org sem contas → Carregar plano padrão | Árvore com níveis; contas `aceita_lancamento` nos analíticos |
| PC-02 | Seed não duplica | P-Admin | P1 | Rodar seed de novo | Erro de unique ou botão oculto; sem duplicar códigos |
| PC-03 | Nova conta (quando implementada) | P-Admin | P1 | Criar 1.1.1.99 analítica | Aparece na árvore; usável na escrituração |
| PC-04 | Conta sintética sem lançamento | P-Admin | P1 | Tentar classificar em conta pai | Bloqueado / não listada em selects |
| PC-05 | Parceiro só leitura no cliente | P-Parceiro | P1 | Abrir plano no cliente | Vê plano da org; sem destruir contas (política de produto) |

### 6.2 Escrituração e classificação automática

| ID | Caso | Persona | P | Passos | Esperado |
|----|------|---------|---|--------|----------|
| ES-01 | Lista pendentes | P-Admin | P0 | Financeiro gera lançamento → Escrituração | Aparece em Pendentes |
| ES-02 | Classificar manual D/C | P-Admin | P0 | Escolher débito, crédito, histórico | Some de pendentes; partida em `partidas`; Σ coerente |
| ES-03 | Auto mensalidade | P-Admin | P0 | Quitar mensalidade com auto on | Partida com hist. `[Auto]`; contas 4.1.1 / caixa ou banco |
| ES-04 | Auto desligada | P-Admin | P1 | Toggle off em config → lançar | Fica pendente |
| ES-05 | Não classifica cancelado | sistema | P1 | Lançamento cancelado | Sem partida |
| ES-06 | Transferência não auto | sistema | P1 | Tipo transferência | Sem classificação automática |
| ES-07 | Desfazer classificação | P-Admin | P2 | (quando existir) reabrir pendente | Partida estornada/removida com auditoria |
| ES-08 | Parceiro classifica no cliente | P-Parceiro | P1 | Cookie cliente → escrituração | Classifica só na org do cookie |

### 6.3 Demonstrações (balancete, DRE, balanço, razão, diário)

| ID | Caso | Persona | P | Passos | Esperado |
|----|------|---------|---|--------|----------|
| DE-01 | Balancete mês com movimento | P-Admin | P0 | Classificar 2 partidas no mês → balancete | Contas com débitos/créditos/saldos corretos (natureza) |
| DE-02 | Balancete mês sem movimento | P-Admin | P1 | Mês vazio | Vazio ou só saldos anteriores ≠ 0 |
| DE-03 | DRE ano | P-Admin | P0 | Receitas e despesas classificadas | Resultado = receitas − despesas (terminologia coop se aplicável) |
| DE-04 | Balanço patrimonial | P-Admin | P1 | Ativo/passivo/PL | Apresentação por grupo; totais conferíveis |
| DE-05 | Razão de uma conta | P-Admin | P1 | Conta + período | Linhas = partidas da conta; saldo progressivo |
| DE-06 | Diário do exercício | P-Admin | P1 | Exercício aberto | Ordenação por data; histórico legível |
| DE-07 | Consistência cruzada | P-Admin | P0 | Mesmo período: balancete vs razão vs diário | Mesmos totais de movimento |
| DE-08 | Performance basica | P-Admin | P2 | Org com muitos lançamentos | Página responde &lt; 5s (meta; depois &lt; 2s com otimização) |

**Aceite contábil (amostra):**
- Pegar 5 lançamentos classificados e recontar no Excel/planilha: débito = crédito por lançamento; saldo da conta no balancete bate com razão.

### 6.4 Sobras e exercício

| ID | Caso | Persona | P | Passos | Esperado |
|----|------|---------|---|--------|----------|
| SO-01 | Abrir exercício ano | P-Admin | P0 | Abrir 2026 | Status ABERTO; único por ano |
| SO-02 | Calcular sobras | P-Admin | P1 | Com DRE do ano | Fundos (reserva, REFAC, FATES) conforme config |
| SO-03 | Fechar exercício | P-Admin / contador | P1 | Fechar com hash | Status ENCERRADO; hash gravado |
| SO-04 | Lançar após fechado | P-Admin | P0 | (quando trava existir) classificar em ano encerrado | Bloqueado |
| SO-05 | Distribuição sobras | P-Admin | P2 | Rateio por critério | Linhas por cooperado; status pago/retido |

### 6.5 Conciliação e calendário

| ID | Caso | Persona | P | Passos | Esperado |
|----|------|---------|---|--------|----------|
| CO-01 | Import CSV extrato | P-Admin | P1 | Upload válido | Itens pendentes |
| CO-02 | Conciliar item | P-Admin | P1 | Ligar a lançamento | Status conciliado |
| CO-03 | Ignorar item | P-Admin | P2 | Ignorar | Some da fila ativa |
| CA-01 | Seed obrigações coop | P-Admin | P2 | Seed calendário | Obrigações do ano |
| CA-02 | Marcar entregue | P-Admin | P2 | Marcar obrigação do mês | Status entregue |

### 6.6 De/Para e exportações

| ID | Caso | Persona | P | Passos | Esperado |
|----|------|---------|---|--------|----------|
| DP-01 | Mapear conta interna → externa | P-Parceiro / admin | P1 | Salvar de/para | Persistido; listável |
| EX-01 | Gerar SPED ECD auxiliar | P-Admin | P1 | Exportações → ano | Download `.txt`; contém 0000/I050/I200-like |
| EX-02 | Copy honesta SPED | P-Admin | P0 | Ler texto da tela | Não promete “entrega RFB pronta” |
| EX-03 | Print balancete/DRE | P-Admin | P2 | Export PDF/print | Abre rota com período |

### 6.7 NF-e contábil (consulta) — `/contabil/nfe`

| ID | Caso | Persona | P | Passos | Esperado |
|----|------|---------|---|--------|----------|
| NC-01 | Abas saídas/entradas/devoluções | P-Parceiro | P0 | Abrir `/contabil/nfe` | 3 abas; sem botão Cancelar/CC-e |
| NC-02 | KPIs saídas | P-Parceiro | P0 | Aba saídas | Total/autorizadas/canceladas/valor coerentes com tabela |
| NC-03 | KPIs entradas | P-Parceiro | P0 | Aba entradas | Total/autorizadas/processando/valor |
| NC-04 | Export XML 2 passos | P-Parceiro | P0 | Exportar sem marcar → aviso + checkboxes; marcar → exportar → ZIP | ZIP baixa; contagem certa |
| NC-05 | Export sem seleção no 2º clique | P-Parceiro | P1 | Modo seleção sem marcar → Exportar | Erro orientando marcar |
| NC-06 | Cancelar seleção | P-Parceiro | P2 | Cancelar | Checkboxes somem |
| NC-07 | Sem Cancelar/CC-e | P-Parceiro | P0 | Inspecionar UI | Não existem |
| NC-08 | Sync silencioso entradas | P-Parceiro | P1 | Notas `processando` com Focus autorizada | Após load, viram `autorizada` + número (pós-fix `emitida_em`) |
| NC-09 | XML/DANFE link | P-Parceiro | P1 | Clicar XML/DANFE em autorizada | Abre documento |

### 6.8 NF-e operacional e emissão (alimenta contábil)

| ID | Caso | Persona | P | Passos | Esperado |
|----|------|---------|---|--------|----------|
| NF-01 | Fiscal operação tem CC-e/Cancelar | P-Admin | P0 | `/comercializacao/fiscal` | Botões presentes em autorizada |
| NF-02 | Emitir entrada — autorizada de verdade | P-Operador | P0 | Lote → emitir NF-e; esperar SEFAZ | UI “autorizada” **só com chave**; banco `status=autorizada`, `chave_nfe`, `numero_nfe`, **`emitida_em` preenchido** |
| NF-03 | Emitir entrada — SEFAZ lenta | P-Operador | P0 | Simular demora | UI “Aguardando SEFAZ”, não “autorizada” verde prematura |
| NF-04 | Reimprimir no lote | P-Operador | P0 | Após autorizada, botão Reimprimir | Abre DANFE; reload página mantém Reimprimir (persistido) |
| NF-05 | Sem CPF | P-Operador | P1 | Produtor sem CPF | Continua “Emitir NF-e” / bloqueio coerente |
| NF-06 | Saída processando → sync | P-Admin | P1 | Fiscal saídas | Sincronizar atualiza para autorizada |
| NF-07 | Não usar `emitido_em` no payload | Dev | P0 | Inspecionar update `notas_entrega` | Só `emitida_em` |

### 6.9 Parceiro e multi-tenant

| ID | Caso | Persona | P | Passos | Esperado |
|----|------|---------|---|--------|----------|
| PA-01 | Login parceiro | P-Parceiro | P0 | `/login` | Vai para `/escritorio`, não dashboard coop vazio |
| PA-02 | Identidade meu escritório | P-Parceiro | P0 | Painel | Label “Meu escritório contábil”; nome Contabahia |
| PA-03 | Entrar no cliente | P-Parceiro | P0 | Acessar contábil COOPAIBI | Logo NexCoop + logo/nome cliente; chip; “Meu escritório” |
| PA-04 | Voltar limpa cookie | P-Parceiro | P0 | Meu escritório / Voltar ao painel | `/escritorio` sem banner cliente; cookie limpo |
| PA-05 | Header não desloca | P-Parceiro | P1 | Página contábil no cliente | Header verde alinhado à sidebar (botão flutuante) |
| PA-06 | Isolamento org | P-Negativo | P0 | Tentar IDs da COOPAIBI | 403/vazio |
| PA-07 | Parceiro sem módulo | (config) | P1 | Remover `contabil` de `modulos_acesso` | Não entra / não lista contábil |
| PA-08 | Dashboard bloqueado | P-Parceiro | P1 | Abrir `/dashboard` | Redirect escritório ou plano de contas se em cliente |

### 6.10 Segurança e regressão técnica

| ID | Caso | P | Esperado |
|----|------|---|----------|
| SE-01 | `orgId` forjado na action | P0 | Recusa se usuário não tem vínculo |
| SE-02 | Sync NF-e sem auth | P0 | 401 |
| SE-03 | Sync NF-e outra org | P0 | 404/403 |
| SE-04 | Service role não vaza em client bundle | P1 | Só server |
| SE-05 | `npx tsc --noEmit` | P1 | Sem erros novos nas pastas contábil/parceiro |

---

## 7. Matriz de regressão mínima (smoke 30–45 min)

Rodar **após todo deploy** que toque contábil, parceiro, Focus ou `notas_entrega`:

| # | Roteiro | Persona |
|---|---------|---------|
| S1 | Login parceiro → escritório → entra COOPAIBI → contábil/NF-e (3 abas) | P-Parceiro |
| S2 | Entradas: KPIs visíveis; export 2 passos (marcar 1 + ZIP) | P-Parceiro |
| S3 | Saídas: lista autorizadas; sem Cancelar/CC-e | P-Parceiro |
| S4 | Meu escritório (cookie limpo) | P-Parceiro |
| S5 | Admin: Escrituração abre; pendentes ou classificados | P-Admin |
| S6 | Admin: Balancete mês atual não quebra | P-Admin |
| S7 | Lote com NF-e: Reimprimir só se `autorizada` no banco (checar número) | P-Operador |
| S8 | Emitir (homolog) ou reconsultar 1 entrada processando → grava `emitida_em` | P-Operador |

**Critério smoke:** S1–S6 e S7/S8 sem falha P0.

---

## 8. Casos de regressão dos bugs 07/08 (obrigatórios)

| Bug | Como provar que não voltou |
|-----|----------------------------|
| Falso “autorizada” no modal | Emitir e forçar Focus lento → UI = Aguardando, banco ≠ autorizada sem chave |
| `emitido_em` | Após autorizar, SELECT `emitida_em IS NOT NULL` e `chave_nfe` preenchida |
| Parceiro no dashboard | Login fiscal@ → path `/escritorio` |
| Contábil = fiscal | Contábil sem botão Cancelar/CC-e; fiscal com |
| Header empurrado | Parceiro no cliente: topo verde alinhado à sidebar |
| Export sem seleção | 1º Exportar só ativa checkboxes; não baixa ZIP vazio |

---

## 9. Consultas SQL de apoio (diagnóstico)

```sql
-- Entradas processando sem chave (dívida de dados)
SELECT id, referencia, status, numero_nfe, chave_nfe, emitida_em, created_at
FROM notas_entrega
WHERE organizacao_id = '3ad97dc2-f87f-4e67-950e-387854d5bccc'
  AND status = 'processando'
ORDER BY created_at DESC;

-- Autorizadas recentes
SELECT numero_nfe, chave_nfe, emitida_em, status
FROM notas_entrega
WHERE organizacao_id = '3ad97dc2-f87f-4e67-950e-387854d5bccc'
  AND status IN ('autorizada','emitida')
ORDER BY created_at DESC
LIMIT 20;

-- Partidas vs lançamentos (org)
SELECT COUNT(*) FROM partidas WHERE org_id = '3ad97dc2-...';
```

---

## 10. Critérios de aceite por release (ligação ao PLANO_CONTABIL)

| Release | Testes mínimos |
|---------|----------------|
| **A** Contábil confiável | Smoke §7 + SE-01–03 + DE-01/03/07 + EX-02 |
| **B** Posto do contador | ES-* completos + DE-05 drill-down + NC-* + PA-* |
| **C** Cooperativa | SO-* + auto-classificação amostral 80% + eventos comerc. |
| **D** SPED formal | Arquivo no PVA sem erro bloqueante + regressão full |

---

## 11. Registro de execução (template)

| Data | Ambiente | Executor | Smoke | Falhas | Build/commit |
|------|----------|----------|-------|--------|--------------|
| ____ | prod/homolog | ____ | Pass/Fail | IDs | ____ |

Anexar: prints de balancete, NF-e com chave, export ZIP, persona parceiro.

---

## 12. Ordem sugerida de implementação da automação (futuro)

1. Vitest: `calcularSaldo`, regras `REGRAS` da classificação, formatação competência/recibo se compartilhado.  
2. Integração: `classificarLancamento` + assert em `partidas`.  
3. Integração: mock Focus → `getNfeStatus` grava `autorizada` + `emitida_em`.  
4. Playwright: PA-01–04, NC-01–04, ES-02.  
5. CI: `tsc` + unitários em PR; E2E nightly ou pré-release.

---

## 13. Fora de escopo deste plano

- Testes da loja PDV e assembleias (exceto impacto contábil via lançamentos).  
- Carga (k6) — só após otimização de queries (Fase 2 do plano de melhoria).  
- Validação jurídica formal de SPED (contabilidade + RFB).

---

## 14. Referências

| Doc | Uso |
|------|-----|
| `docs/PLANO_CONTABIL.md` | O que melhorar no produto |
| `docs/MODULOS.md` | Status do módulo |
| `docs/SCHEMA.md` | `notas_entrega.emitida_em`, 062 |
| `docs/AUDITORIA_SEGURANCA_2026-07-12.md` | Parceiro / multi-tenant |
| `PENDENCIAS.md` | Re-sync dados processando |
| `CONTEXTO_NEXCOOP.md` | Contas e sessão atual |
