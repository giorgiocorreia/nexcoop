# NexCoop — Contexto do Projeto

## Identificação
- **Produto:** NexCoop — SaaS multi-tenant para cooperativas, associações, sindicatos e outras organizações
- **Stack:** Next.js + TypeScript + Supabase + Vercel
- **Repositório:** giorgiocorreia/nexcoop (branch: main)
- **Pasta local:** C:\Users\Lenovo\Documents\nexcoop
- **Supabase project ID:** cufovlntqfobutwvfcea
- **URL produção:** nexcoop.com.br
- **Super admin:** gio.pessoal@gmail.com (Giorgio Correia, sem org)
- **Org admin COOPAIBI:** giorgio@coopaibi.com.br
- **IA:** process.env.ANTHROPIC_API_KEY, modelo padrão claude-haiku-4-5-20251001
- **Claude Code:** `claude --dangerously-skip-permissions`
- **Pagamentos:** Stripe (modo teste)
- **E-mail:** Zoho Mail (suporte@nexcoop.com.br, smtp.zoho.com:465) — SPF/DKIM configurados

---

## Organização de teste — COOPAIBI
- **Nome:** Cooperativa Mista Agropecuária de Ibirataia
- **CNPJ:** 54.305.114/0001-79
- **Plano:** Essencial
- **Território:** Médio Rio de Contas, Bahia (16 municípios)
- **Áreas:** cacau, agrofloresta, pecuária, mel, plantas medicinais

---

## Padrão visual
- Fundo geral: `#f8f7f4`
- Cards: branco, `border: 1px solid #e5e3dc`, `border-radius: 12px`, `font-family: system-ui`
- Sem libs de UI externas — tudo inline styles
- Cores por módulo: sidebar `#635BFF` | captação `#1D9E75` | contábil `#0F766E` | loja `#E07B30` | comercialização `#92400e`
- Tipografia: Sora (headings), Inter (body) via next/font/google
- Ícones: Tabler Icons via CDN em `layout.tsx`
- Componente `Btn`/`BtnLink` centralizado em `components/ui/Btn.tsx`
  - Padrão: cinza/outline neutro, hover scale+escurecer
  - Variante "azul": `#378ADD` bg/borda, texto branco, hover `#185FA5`
  - Variante "marrom-outline": outline `#92400e`, hover sólido marrom, texto branco
  - Variantes marrom/verde/roxo: ainda cinza neutro (pendente cores reais)
- Card azul reutilizável: fundo `#E6F1FB`, label `#185FA5`, valor `#042C53`
- `lib/comercializacao/fmt.ts` → `fmtReal()` para formatação pt-BR

---

## Migrations aplicadas
- 001–007: base (organizacoes, usuarios, cooperados, financeiro, assembleias, documentos, mensalidades)
- 008: captacao (oportunidades, oportunidade_logs, perfil_captacao)
- 009–013: captacao continuação
- 014: loja (schema apenas, 0% telas)
- 015–024: módulo contábil completo
- 025–029b: comercialização (produtores, contas, caixa, safras, lotes, vendas, NF-e entrada)
- 030: solicitacoes_aporte (pendente aplicar)
- 031: enderecos centralizada (pendente aplicar)
- 032: cotacoes_mercado_externo + config_precos_sugeridos
- 033: colunas em produtores (usuario_id, dados_fiscais, is_consumidor_final)
- 034/035: drop tabela membros (criada e revertida — conceito já existia como cooperados)

**Próxima migration:** 036

---

## Tabelas principais
- `organizacoes`
- `usuarios` (funcoes text[], vinculo text — pendente: somente_leitura boolean)
- `cooperados` (vínculo societário: CAF, DAP, quota_parte, status, matrícula, usuario_id)
- `produtores` (identidade cadastral: CPF, nome, endereço, dados produção/fiscais, cooperado_id, usuario_id, dados_fiscais, is_consumidor_final)
- `lancamentos`, `assembleias`, `documentos`, `mensalidades`, `notificacoes`
- `oportunidades`, `oportunidade_logs`, `perfil_captacao`
- `sessoes_caixa`, `movimentos_caixa`, `saldos_produto`, `notas_entrega`
- `lotes`, `vendas_externas`, `cotacoes`, `cotacoes_mercado_externo`, `config_precos_sugeridos`
- `plano_contas`, `lancamentos_contabeis`, `audit_logs`
- `profissionais_parceiros`, `empresas_parceiras`

---

## Modelo Membro/Produtor/Usuário (13/06/2026)
- `produtores` = identidade cadastral única (base de tudo, CPF/nome/endereço/dados produção)
- `cooperados` = vínculo societário 1:1 (via produtores.cooperado_id) — CAF, DAP, quota_parte, status, matrícula
- `usuarios` = login; cooperados sempre têm usuario_id (acesso ao Portal do Filiado)
- **Assimetria:** Usuário/Cooperado → cria produtor espelho automático; Produtor → não cria cooperado (botão "Promover a cooperado")
- **3 server actions** em `lib/cooperados/actions.ts`:
  - `criarUsuarioComCooperadoOpcional` — usuário com checkbox "é cooperado?"
  - `criarCooperado` — cria cadeia completa usuario+cooperado+produtor
  - `promoverProdutorACooperado` — promove produtor externo existente
- **Backlog futuro:** renomear `cooperados` → `membros` (terminologia genérica via tipos_org)
- **flag `somente_leitura`** em usuarios (pendente migration) — para presidente COOPAIBI ver sem editar

---

## Status dos módulos
| Módulo | Status |
|---|---|
| Autenticação / Onboarding / Configurações org | ✅ |
| Cooperados / Filiados | ✅ |
| Financeiro / Assembleias / Documentos / Mensalidades | ✅ |
| Stripe (modo teste) | ✅ |
| Super Admin — painel, orgs, changelog | ✅ |
| Captação (CRM/Kanban + Radar CAR/Bahia) | ✅ |
| Contábil completo (migrations 015–024, 13 telas) | ✅ |
| Comercialização / Caixa Cacau | ✅ |
| NF-e entrada via Focus NFe | ✅ (homologação) |
| Dashboard Admin (cotação cacau + TradingView) | ✅ |
| Audit logs | ✅ |
| Gestão de usuários (Configurações → Usuários) | ✅ (convidar + cadastrar) |
| Portal do Filiado | ❌ (planejado, chat dedicado) |
| Loja Agropecuária | ⏸ (migration 014, 0% telas) |
| Super Admin — Módulos/Usuários/Planos | ❌ |
| Captação — Alertas, MI, Perfil org | ❌ |

---

## Ficha do Produtor (13/06/2026)
- Tela unificada `/comercializacao/produtores/[id]`
- Layout: botões → dados cadastrais → extrato → card saldos
- "Voltar" à esquerda, demais botões à direita (todos padrão Btn)
- Dados cadastrais: leitura (campos vazios ocultos) / editar ao clicar (todos visíveis)
- Card Saldos no fim: kg × cotação atual (estimativa), saldo financeiro, total estimado
- Modal "Caixa fechado": intercepta ações → 2 etapas → abre caixa → redireciona com produtor_id+acao
- "Ver perfil" removido da listagem — fica só "Ver ficha"
- Botão "Promover a cooperado" visível apenas se cooperado_id === null

---

## Configurações → Usuários (13/06/2026)
- Botão "+ Convidar usuário" (já existia) — envia e-mail de convite
- Botão "+ Cadastrar usuário" (novo) — admin preenche tudo + senha temporária gerada
  - Modal com checkbox "é cooperado?" → chama `criarUsuarioComCooperadoOpcional()`
  - Exibe senha temporária ao final (destacada, botão "Copiar credenciais")
- Botão "Enviar e-mail de boas-vindas" (pendente) — após promoção de produtor a cooperado
  - Envia: credenciais + link /login + instrução troca senha primeiro acesso
  - Template: mesmo padrão dos 6 templates existentes
  - Link: /login (provisório — /login?org=slug quando Portal do Filiado existir)

---

## NF-e de Entrada — Focus NFe (FUNCIONANDO, 12/06/2026)

### Arquivos
```
lib/focusnfe/client.ts
lib/focusnfe/emitir-nfe-entrada.ts
lib/comercializacao/nfe.actions.ts
components/comercializacao/ModalNfeEntrada.tsx
```

### Configuração
- Série 2 (homologação), tokens: FOCUSNFE_TOKEN_HOMOLOGACAO, FOCUSNFE_TOKEN_PRODUCAO
- FOCUSNFE_AMBIENTE=homologacao
- NCM: 18010000, CFOP: 1159 (cooperado) / 1102 (externo)
- ICMS CST 41, PIS/COFINS CST 72
- modalidade_frete: '9', FUNRURAL 1,63%

### Armadilha de fuso resolvida
```ts
const agoraBrasilia = new Date(Date.now() - 3*60*60*1000)
const dataEmissao = agoraBrasilia.toISOString().replace('Z','-03:00')
```

### Pendente
- Testar CFOP 1159 (cooperado) — só testado 1102 (externo)
- NF-e de saída (venda moageira)
- Aguardando dados do contador Marcos (Contabahia, mrogerio@contabahia.com.br): regime tributário, certificado A1, série/número inicial, CFOP produtor rural sem IE, CST/CSOSN, FUNRURAL, NCMs com ST

---

## Dashboard Admin — Cotação Cacau (13/06/2026)
- Card visível apenas para organizacoes.tipo === 'cooperativa'
- Fontes: precodocacau.com.br (fonte='cepea') + Yahoo Finance (CC=F + USDBRL=X)
- Cron: /api/cron/cotacoes-cacau, 1x/dia "0 8 * * *" (limite Hobby Vercel)
- Botão "Aplicar cotação" → registrarCotacao() upsert em cotacoes
- Widgets TradingView: símbolo COCOA e FX_IDC:USDBRL

---

## Serviços ativos
- **Focus NFe** — R$89,90/mês, homologação
- **Jina.ai** (`https://r.jina.ai/` + url) — Radar, só CAR/Bahia funciona
- **Zoho Mail** — suporte@nexcoop.com.br
- **Supabase Storage** — documentos, logos, manuais
- **Vercel** — deploy, env vars, cron (Hobby: máx 1x/dia — SEMPRE "0 H * * *")
- **TradingView widgets** — symbol-overview

---

## Regras críticas de arquitetura
- **NUNCA usar `auth_org_id()`** — sempre subquery: `(select organizacao_id from usuarios where id = auth.uid())`
- **Writes de nível org via `createAdminClient()`** (bypassa RLS)
- **Permissões apenas via `lib/permissoes.ts`** — nunca inline
- **Types em `types/database.ts`** — atualizar manualmente a cada nova tabela
- **Migrations via Supabase Dashboard SQL Editor** — `supabase link`/`db push` não funcionam
- Joins PostgREST: FK ambígua deve ser referenciada explicitamente (ex: `sessoes_caixa!sessao_caixa_id`)
- Estoque físico e virtual (`saldos_produto`) são independentes — não criar constraint bloqueando
- pdf-lib para PDFs (pdfkit incompatível com Vercel serverless)
- Regex com flag /s requer `target: es2018+` no tsconfig

---

## Lições críticas de infra
1. Vercel Hobby: cron máx 1x/dia — schedule errado falha build silenciosamente
2. CRON_SECRET manual pode ficar com `\r` ou vazio — Vercel usa seu próprio secret interno
3. Para destravar deploys: `vercel login → vercel link → vercel --prod --yes`
4. Regex `/s` exige `target: es2018+` — erro TS1501 falha build silenciosamente

---

## Fluxo de trabalho Giorgio → Claude → Claude Code
1. Giorgio descreve o que quer
2. Claude prepara mockup visual (quando aplicável) para aprovação
3. Claude gera instrução como **arquivo .txt para download** (nunca inline)
4. Giorgio passa o .txt ao Claude Code para execução
5. Giorgio reporta resultado de volta
6. Sempre terminar com `git add + commit + push`

---

## Backlog priorizado
1. Modal caixa fechado (em andamento)
2. Botão "Enviar e-mail de boas-vindas" ao cooperado (após promoção)
3. Flag `somente_leitura` em usuarios (presidente COOPAIBI)
4. Migration 031 (enderecos centralizada)
5. Testar NF-e cooperado (CFOP 1159)
6. Fluxo fiscal completo: NF-e saída + ZIP XMLs + comprovante térmico 80mm
7. Portal do Filiado (chat dedicado): /filiado mobile-first, login CPF+senha, /login?org=slug
8. tipos_org configurável (super_admin sem deploy)
9. Renomear cooperados → membros (terminologia genérica)
10. Níveis de acesso parceiro contábil (responsavel/operador/consultor)
11. Remover "Mensalidades" sidebar para cooperativas
12. BotaoPdfSessao no Diário de Caixa + renomear "Imprimir Relatório"
13. Btn.tsx variantes marrom/verde/roxo com cores reais
14. Loja Agropecuária (retomar após Comercialização estável)
15. Captação — Radar avançado, alertas, geração de MI
16. Stripe live, 2FA, Sobras/REFAC
17. Fluxo convite contador (embolado — chat separado)

---

*Última atualização: 13/06/2026*
