# NexCoop — Contexto do Projeto

## Identificação
- **Produto:** NexCoop — SaaS para cooperativas e associações brasileiras
- **Stack:** Next.js + TypeScript + Supabase + Vercel
- **Repositório:** giorgiocorreia/nexcoop (branch: main)
- **Pasta local:** `C:\Users\Lenovo\Documents\nexcoop`
- **Supabase project ID:** cufovlntqfobutwvfcea
- **URL produção:** nexcoop.com.br (fallback: nexcoop.vercel.app)
- **Super admin:** Giorgio Correia (gio.pessoal@gmail.com)
- **Pagamentos:** Stripe (modo teste)
- **Modelo IA:** `claude-haiku-4-5-20251001` via `process.env.ANTHROPIC_API_KEY`
- **SMTP:** Zoho Mail — suporte@nexcoop.com.br

---

## Organização de teste
- **Nome:** Cooperativa Mista Agropecuária de Ibirataia — COOPAIBI
- **CNPJ:** 54.305.114/0001-79
- **UUID:** `3ad97dc2-f87f-4e67-950e-387854d5bccc`
- **Plano atual:** Essencial
- **Território:** Médio Rio de Contas (cacau, agrofloresta, pecuária, mel, plantas medicinais)

---

## Padrão visual
- Fundo geral: `#f8f7f4`
- Cards: fundo branco, `border: 1px solid #e5e3dc`, `border-radius: 12px`
- Fonte: `system-ui`
- Sem bibliotecas de UI externas — tudo inline styles
- Tabler Icons via CDN no `app/layout.tsx`
- Cores por módulo: sidebar `#635BFF`, captação `#1D9E75`, contábil `#0F766E`, loja `#E07B30`, comercialização `#92400e`
- Tipografia: Sora (headings), Inter (body)

---

## Componentes UI centralizados
- `components/ui/Btn.tsx` — botão outline cinza neutro + hover scale + escurecer. Variantes: marrom, verde, roxo, cinza (todas cinza visualmente). `BtnLink` para links estilizados como botão.
- `lib/comercializacao/fmt.ts` — `fmtReal()` e `fmtNum()` para valores pt-BR

---

## Estrutura de usuários

### Separação de conceitos
- **`role`** — apenas para `super_admin`. Demais têm `role: 'membro'`
- **`funcoes text[]`** — funções operacionais do usuário
- **`vinculo text`** — `cooperado | funcionario | diretoria | externo`

### Funções e labels amigáveis
| Função | Label | Acesso |
|---|---|---|
| `admin` | Administrador | Tudo na org |
| `caixa_cacau` | Operador de Caixa | Módulo Comercialização |
| `financeiro` | Financeiro | Lançamentos, contas, relatórios |
| `tecnico` | Técnico Agrícola | Produção, cooperados, documentos |
| `conselho_fiscal` | Conselho Fiscal | Leitura financeiro e atas |
| `captador` | Captador de Recursos | Módulo captação |
| `gerente_loja` | Gerente de Loja | Módulo loja |
| `vendedor` | Vendedor | Módulo loja |

### Redirecionamento por função (middleware.ts)
- `caixa_cacau` → `/comercializacao`
- `admin` / `super_admin` → `/dashboard`
- Futuramente: `caixa_loja` / `vendedor` → `/loja`

### Arquivo central de permissões
`lib/permissoes.ts` — TODA verificação de permissão passa por aqui.

---

## Banco de dados — migrations aplicadas

| Migration | Descrição |
|---|---|
| 001–006 | Tabelas base: organizacoes, usuarios, cooperados, financeiro, assembleias, documentos |
| 007 | funcoes[], vinculo em usuarios; funcoes_disponiveis |
| 008 | oportunidades, oportunidade_logs, perfil_captacao |
| 009–014 | Loja Agropecuária (pausada) |
| 015–024 | Módulo Contábil completo |
| 025–027 | Comercialização: produtores, contas, movimentações |
| 028 | sessoes_caixa: snapshot_estoque, saldo_especie_calculado; aportes_sangrias |

### Próximas migrations planejadas
| Migration | Descrição |
|---|---|
| 029 | `notas_entrega` + comprovantes térmicos 80mm |
| 030 | `solicitacoes_aporte` |
| 031 | `enderecos` (centralizada para usuario, cooperado, produtor, org) |

---

## Módulo Comercialização — estado atual

### Implementado (Tesouraria Fase 1)
- Produtores: cadastro, ficha, perfil, busca por CPF/nome
- Caixa: abertura/fechamento, entrega, pagamento, saque, rateio, aporte/sangria
- Cotações: preço por produto por data
- Diário de Caixa: `/comercializacao/diario` com drill-down por sessão
- PDF fechamento A4 via pdf-lib (client-side)
- Comprovante de entrega

### Dashboard de Comercialização
- 4 métricas do dia: entregas, saldo, produtores, lotes
- Gráfico barras 7 dias (kg) — ativo após migration 029
- Card sessão de caixa: saldo, aportes, sangrias
- Modal abrir caixa + modal solicitar aporte
- Admin vê todas as sessões; atendente vê só a própria
- Alerta pendências de aporte (só admin)
- Botões navegação no cabeçalho: Produtores / Caixa / Diário

### Fluxo fiscal planejado
1. Entrega → NF-e entrada (NFe.io) + comprovante térmico 80mm
2. Fechamento lote → relatório composição PDF
3. Venda moageira → NF-e saída + ZIP XMLs + DANFE A4

### Arquitetura importante
- Estoque físico (`estoque_fisico`) e virtual (`saldos_produto`) são independentes
- `movimentacoes_conta` é ledger imutável
- Todo cooperado tem CPF; link cooperado→produtor criado automaticamente

---

## Módulo Contábil — implementado
- Plano de contas (cooperativa + associação)
- Escrituração, balancete, DRE, balanço patrimonial
- Livro razão/diário, sobras/REFAC
- Fechamento com hash SHA-256
- De/Para (só contador), NF-e
- Exportações SPED + PDF
- Conciliação bancária, calendário obrigações
- Portal contador, plano contas escritório
- Migrations 015–024

---

## Módulo Captação — implementado
- Kanban: Identificado → Contatado → Proposta → Aguardando → Resultado
- 3 abas: Abertas / A abrir / Vencidas
- Log imutável de movimentações
- Radar: Jina.ai + Claude Haiku (só CAR/Bahia funciona — HTML estático)
- Custo radar: ~R$0,017/varredura com 1 fonte

### Pendente no módulo
- Radar automático por perfil da org
- Alertas de prazo por e-mail
- Geração automática de MI
- Perfil de captação da org

---

## Tela de Perfil do Usuário
- Layout duas colunas: dados pessoais | vínculo + módulos + notificações + atividade
- Função exibida com label amigável (FUNCAO_LABEL em PerfilUsuarioClient.tsx)
- Módulos com acesso calculados pelas funções do usuário
- Campos: nome, CPF, telefone, e-mail (bloqueado), endereço, município
- Segurança: trocar senha com autenticação atual
- Pendente: modo somente leitura por padrão + editar ao clicar

---

## Convenções de código

### Regras críticas de banco (nunca violar)
- Nunca usar `auth_org_id()` — sempre subquery: `select organizacao_id from usuarios where id = auth.uid()`
- Writes org-level via `createAdminClient()`
- Toda permissão via `lib/permissoes.ts`
- Novas tabelas DB → adicionar em `lib/supabase/database.ts`

### Padrões
- Server Actions com `'use server'`
- Client components com `'use client'` só quando necessário
- Migrations sequenciais: atualmente em 028, próxima 029
- Nunca comparar `role` ou `funcoes` diretamente nos componentes

---

## Workflow Claude Code
- Executar: `claude --dangerously-skip-permissions`
- Instruções como arquivo `.txt` para download — nunca inline no chat
- Arquivos > 100 linhas: `.txt` com nome versionado (ex: `caixa_page_v2.txt`)
- Sem localhost — Vercel é o ambiente de teste
- SQL migrations: rodar no Supabase SQL Editor
- Todo commit deve incluir: `git add -A && git commit -m "..." && git push`

---

## Backlog geral (priorizado)

### Imediato
1. Migration 029 — notas_entrega + comprovantes térmicos 80mm
2. Migration 030 — solicitacoes_aporte
3. Migration 031 — tabela enderecos centralizada
4. Títulos "boiando" — remover h1 soltos nas páginas
5. Perfil — modo somente leitura + editar ao clicar
6. Changelog — tela /admin/changelog no superadmin
7. Expandir Btn para outros módulos

### Comercialização
- NF-e entrada via NFe.io
- Comprovantes térmicos 80mm (QZ Tray para impressão direta)
- Tesouraria Fase 2: multi-conta
- Tesouraria Fase 3: CSV/OFX import + Pix reconciliação
- Máscaras R$ em safras/lotes/vendas externas
- Mensalidades fora da sidebar para cooperativas

### Produto
- Portal do Filiado: /filiado mobile-first, CPF+senha, subdomínio por org
- Loja Agropecuária: retomar (migration 014 feita)
- Stripe live
- 2FA + auditoria de segurança
- Sobras/REFAC
- SuperAdmin: módulos toggle, usuários global, planos, dashboard
- Páginas públicas por org
- Demo + manuais
- `tipos_org` DB table para escalar sem deploy
- Parceiros → "Empresas Vinculadas" na UI
- Paginação no Diário de Caixa

---

## Planos disponíveis
| Plano | Preço | Filiados |
|---|---|---|
| Gratuito | R$0 | até 10 |
| Essencial | R$149/mês | até 50 |
| Profissional | R$499/mês | até 200 |
| Agro | R$1.500/mês | ilimitado + projetos |
| Enterprise | consulta | ilimitado |
