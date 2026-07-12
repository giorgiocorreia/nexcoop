# Auditoria de Segurança e Arquitetura — NexCoop

Data: 2026-07-12
Escopo: leitura de código (server actions, rotas de API, clients Supabase, middleware). Nenhuma correção foi aplicada — apenas diagnóstico.

---

## Falhas críticas (segurança / multi-tenant)

### 1. IDOR em server actions — problema mais grave
`atualizarStatusVenda`, `editarVenda` (`lib/comercializacao/vendas.actions.ts:37,68`) e `editarLote` (`lib/comercializacao/lotes.actions.ts`) usam `createAdminClient()` (bypassa RLS) e filtram só por `.eq('id', id)`, **sem `organizacao_id` e sem chamar `getUsuarioLogado()`**.

Qualquer usuário autenticado de qualquer organização que descubra/adivinhe um UUID consegue editar vendas e lotes de outra cooperativa.

**Correção:** toda mutação com admin client precisa (a) autenticar o usuário e (b) incluir `.eq('organizacao_id', usuario.organizacao_id)` na cláusula, ou fazer um SELECT de posse antes de escrever.

### 2. Parceiro (contador) recebe acesso total à org, não só ao módulo contábil
`app/api/parceiros/acessar-org/route.ts:25` valida `modulos_acesso.includes('contabil')` **só no momento de setar o cookie**. Depois, `getOrgContext()` (`lib/supabase/impersonation.ts:38`) devolve `createAdminClient()` com o `orgId` do cookie — acesso admin irrestrito a financeiro, comercialização, loja etc. É escalonamento de privilégio: o escopo de módulo nunca é reaplicado por request.

**Correção:** revalidar `modulos_acesso` a cada request que usa `parceiro_org_id`, não apenas ao criar o cookie.

### 3. Rota de debug em produção
`app/api/debug-vendas/route.ts` — `GET` público, sem autenticação, com `createAdminClient()` e **org ID hardcoded** (COOPAIBI). Vaza dados reais.

**Correção:** deletar a rota.

### 4. `app/api/nfe/sincronizar` sem autenticação
`POST` recebe `nota_id`/`referencia`, usa admin client e atualiza `notas_entrega` por id, sem verificar usuário nem org. Outro IDOR — permite forçar sincronização/alteração de notas de qualquer org.

**Correção:** exigir sessão autenticada + checar que a nota pertence à org do usuário antes de atualizar.

### 5. Webhook do WhatsApp sem verificação de origem
`app/api/whatsapp/webhook/route.ts` processa qualquer POST sem validar assinatura/token da Evolution API. Qualquer um pode injetar mensagens no fluxo do agente. Há também 7 `console.log` despejando headers e corpo de mensagens (dado pessoal) nos logs.

**Correção:** validar um secret/assinatura do provedor; remover logs de payload completo em produção.

---

## Falhas médias

### 6. Uso difundido do admin client enfraquece a RLS como linha de defesa
`getUsuarioLogado()` sempre lê o perfil via admin client, e quase toda action segue o mesmo padrão. Isso funciona, mas centraliza tudo no service role — cada action vira responsável manual pelo isolamento de org, e as falhas #1 e #4 mostram que isso já escapou.

### 7. Vazamento de mensagens de erro cru
19 pontos em `app/api` retornam `error.message` / `String(e)` direto no JSON de resposta. Expõe detalhes internos do Postgres/Supabase ao cliente.

**Correção:** padronizar respostas de erro genéricas para o cliente e logar o detalhe só server-side.

### 8. Ausência de validação Zod nas actions
Apesar de `zod` estar nas dependências, actions como `criarVenda`/`editarVenda` confiam no shape do `form` vindo do cliente sem parse — números negativos, campos inesperados passam direto pro insert.

**Correção:** schema Zod na fronteira de cada action antes de tocar o banco.

---

## Higiene do repositório

### 9. Lixo versionado
- `middleware.ts.bak`
- `tsc_out.txt`, `tsc_output.txt`
- `GerarPage.txt`, `MensalidadesLista.txt`
- `onboarding_humani.xlsx` (ainda não commitado)
- `.claude/worktrees/` com cópias inteiras de migrations antigas (confunde buscas — o grep de `auth_org_id` só bateu dentro de worktrees, não no código ativo)

**Correção:** remover do versionamento e adicionar ao `.gitignore`.

---

## Crítica arquitetural — o que eu faria diferente

- **Inverter a dependência do admin client.** Hoje o default de fato é service role + filtro manual. Tornar a RLS o mecanismo primário (usar `createServerClient` com o JWT do usuário na maioria das reads/writes) e reservar o admin client para os poucos casos genuínos de cross-org (relatórios de super_admin, jobs). Cada `createAdminClient()` numa action é uma oportunidade de IDOR.

- **Um único `getCtx()` central e obrigatório.** Hoje existem pelo menos três variantes (`getUsuarioLogado`, `getOrgContext`, `getCtx` local da loja). Consolidar num helper único que sempre devolve `orgId` e força o filtro — idealmente um wrapper tipo `withOrg(async (ctx) => ...)` para que seja impossível escrever uma action sem escopo de org.

- **Reaplicar escopo de módulo do parceiro em cada request**, não só no set do cookie.

- **Camada de validação (Zod) na fronteira de toda action**, já que a lib está instalada mas subutilizada.

- **Testes de isolamento multi-tenant.** Não há nenhum hoje. Um punhado de testes "usuário da org A não consegue tocar recurso da org B" teria pego as falhas #1 e #4.

- **CI com `tsc --noEmit` + guard.** O `guard-deploy.mjs` existe, mas os artefatos `tsc_out.txt`/`tsc_output.txt` versionados sugerem checagem manual/local em vez de CI.

---

## Prioridade de correção

1. IDOR em server actions (#1)
2. `nfe/sincronizar` sem autenticação (#4)
3. Rota de debug em produção (#3)
4. Escopo do parceiro não revalidado (#2)
5. Webhook do WhatsApp sem verificação de origem (#5)
6. Itens médios (#6, #7, #8)
7. Higiene do repositório (#9)
