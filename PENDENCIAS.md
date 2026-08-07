# Pendências — NexCoop

Lista de tarefas. Marque com `[x]` ao concluir.

---

## 🔐 Infraestrutura (ação manual)

- [x] Resetar chaves do Supabase (anon + service_role) e atualizar `.env.local` e Vercel
- [x] Hotmail/Outlook DMARC (TXT `_dmarc` no Registro.br + DKIM Zoho)
- [x] Domínio nexcoop.com.br ativo na Vercel
- [ ] Definir `EVOLUTION_WEBHOOK_SECRET` (valor aleatório forte) em `.env.local` e nas env vars da Vercel; garantir que o mesmo valor está configurado como header `x-webhook-secret` no painel/config da Evolution API (ver `app/api/whatsapp/_lib/evolution.ts` → `configurarWebhook`, que já envia esse header automaticamente ao registrar o webhook — só reexecutar o registro após definir a env). Sem essa env, o webhook rejeita tudo (fail-closed).

## 🎨 UI / Design

- [x] Redesign visual completo — kit `components/nexcoop/ui` (jul/2026)

## 🧩 Funcionalidades — concluídas

- [x] Classificação automática escrituração (migration 061)
- [x] Integração financeiro: mensalidades, cotas, loja, comercialização
- [x] Cônjuge produtor/cooperado + NF-e (migration 060)
- [x] `status_nfe` em Nova Compra (loja)
- [x] Safra obrigatória em `iniciarLote`
- [x] Filtros por função nos relatórios loja (vendas + caixa — server-side)
- [x] FOCUSNFE_AMBIENTE por módulo (`FOCUSNFE_AMBIENTE_LOJA`, `FOCUSNFE_AMBIENTE_COMERCIALIZACAO`)
- [x] `acesso_fiscal` parceiro contábil (migration 062)
- [x] Mensalidades ocultas para associações/centrais no sidebar
- [x] Extrato conta corrente na loja (`/loja/conta-corrente`)
- [x] Relatório vendas PDF A4 (`/api/loja/relatorio/vendas/pdf`)
- [x] Portal do Filiado MVP (`/filiado`)
- [x] Tesouraria / transferências (`/financeiro/tesouraria`)
- [x] Módulo Resultado por Safra (`/comercializacao/resultado`)
- [x] WhatsApp webhook + agente Mariana (`/api/whatsapp/webhook`)
- [x] Fluxo conversão/saque no caixa cacau (`registrarConversaoESaque`)
- [x] Tela de vendas lote → comprador completa (`/comercializacao/vendas`) — [antes "Vender produto"]
- [x] Extrato conta corrente: loja (`/loja/conta-corrente`) + produtor/cooperado PDF (`/api/comercializacao/extrato-produtor`)
- [x] Relatório de estoque — tela (`/loja/relatorios/estoque`)
- [x] DRE contábil (`/contabil/dre`)
- [x] Fix KPI "Saldo em caixa" transbordando o card (comercialização)
- [x] Promoção a cooperado desacoplada de login; acesso gerado sob demanda na ficha
- [x] Venda de lote como transferência interna sem NF-e — comprador é empresa do próprio cooperado (migrations 067/068)
- [x] Quebra de peso em vendas — comprador paga peso recebido, reduz valor a receber (migration 069)
- [x] Gerador de **recibos** em `/comercializacao/impressos` — PDF A4 com 2 vias + linha de corte, numeração sequencial, valor por extenso, competência (migrations 092/093)

## 🧩 Funcionalidades — pendentes

> Revisado por varredura de código em 2026-07-09. Itens acima foram movidos para "concluídas".

- [ ] Export **PDF A4** de estoque (tela existe, falta PDF) e de **compras** (sem tela nem PDF)
- [ ] Separação completa tokens Focus por org (hoje global por ambiente/módulo)
- [ ] `saldo_kg` em `contas_produtor` (hoje só via `saldos_produtor_snapshot`)
- [ ] **DRE gerencial integrado** comercialização + loja + custos (DRE contábil já existe; falta o operacional — com Marcos)
- [ ] Migração multi-org (`usuario_organizacoes`) — NÃO iniciado — ver `docs/PLANO_MULTI_ORG.md`
- [ ] Sistema de Módulos com cobrança (gate por `modulos_ativos` + Stripe) — ver `docs/PLANO_MODULOS.md`
- [ ] Portal filiado: cotas, documentos, assembleias (hoje só saldo + extrato PDF)
- [ ] Gestão caixa físico avançada (origem/destino multi-conta — tesouraria básica feita)
- [ ] Renomear cooperados → membros / terminologia dinâmica via `tipos_org` (hard-coded hoje)
- [ ] Teste smoke completo em produção pós-redesign

## 🔒 Segurança — auditoria 2026-07-12

> Ver detalhes em `docs/AUDITORIA_SEGURANCA_2026-07-12.md`. Ordem = prioridade.

- [x] IDOR em `vendas.actions.ts` (`atualizarStatusVenda`, `editarVenda`) e `lotes.actions.ts` (`editarLote`) — admin client sem checar `organizacao_id` nem usuário logado
- [x] `app/api/nfe/sincronizar` sem autenticação — atualiza `notas_entrega` por id sem checar org
- [x] Deletar rota de debug `app/api/debug-vendas` (pública, admin client, org hardcoded)
- [x] Escopo de módulo do parceiro contábil (`parceiro_org_id`) só é checado ao setar o cookie, não a cada request — reaplicar `modulos_acesso` por request
- [x] Webhook WhatsApp (`app/api/whatsapp/webhook`) sem validação de assinatura/origem + remover `console.log` de payload completo
- [ ] Padronizar erros de API (não retornar `error.message`/`String(e)` cru ao cliente)
- [ ] Validação Zod na fronteira das server actions (hoje `form` do cliente vai direto pro insert/update)
- [ ] Limpar lixo versionado: `middleware.ts.bak`, `tsc_out.txt`, `tsc_output.txt`, `GerarPage.txt`, `MensalidadesLista.txt`, `.claude/worktrees/` (migrations duplicadas)
- [ ] Consolidar helpers de contexto (`getUsuarioLogado`, `getOrgContext`, `getCtx` da loja) num único `withOrg()` obrigatório
- [ ] Testes de isolamento multi-tenant (org A não acessa recurso de org B)

## 📋 Bloqueado — aguardando contador (Contabahia)

> Contato no sistema (07/08/2026): **Érica Almeida** — `fiscal@contabahia.com.br`
> (escritório Contabahia Soluções Empresariais, vinculado à COOPAIBI).
>
> Revisado em 2026-07-16: comercialização resolvida fiscalmente —
> NF-e entrada (CFOP 1159/1102) e saída (NCM 18010000, CST ICMS 041 / depois 51
> com diferimento em notas novas) emitindo em produção; CSC NFC-e de produção obtido.
> O que resta de **dado fiscal da LOJA**:

- NCMs dos produtos da loja (campo existe desde migration 040; falta o dado produto a produto)
- CSTs ICMS/PIS/COFINS dos produtos da loja
- Ligar emissão real de NFC-e no PDV da loja (config pronta em lib/loja/fiscal-actions.ts)

## 📒 Contábil / parceiro — pós 07/08/2026

- [x] `/contabil/nfe` separado de `/comercializacao/fiscal` (consulta vs operação)
- [x] Export XML entradas com seleção guiada (2 cliques)
- [x] Fix gravação NF-e entrada: coluna `emitida_em` (não `emitido_em`)
- [x] UX parceiro: Meu escritório vs cliente (logo org, chip, cookie ao sair)
- [ ] **Dados:** re-sincronizar entradas históricas em `processando` sem chave (lotes 002–006) após deploy do fix — abrir Contábil → NF-e → Entradas ou lote e deixar o sync Focus gravar `autorizada`
- [ ] Confirmar migration **062** (`acesso_fiscal`) no banco de produção
- [ ] Roadmap médio/longo: `docs/PLANO_CONTABIL.md` (hub, período global, motor multi-linha, SPED formal, etc.)
- [ ] Segurança: revalidar `modulos_acesso` do parceiro **a cada request** (item já marcado x em auditoria; revalidar se regressão)

---

> Atualizado em: 2026-08-07 — sessão contábil/parceiro/NF-e (Grok); contato Contabahia = Érica