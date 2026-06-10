# NextCoop — Contexto do Projeto

## Identificação
- **Produto:** NextCoop — SaaS para cooperativas e associações
- **Stack:** Next.js + TypeScript + Supabase + Vercel
- **Repositório:** giorgiocorreia/nextcoop (branch: main)
- **Supabase project ID:** cufovlntqfobutwvfcea
- **URL produção:** nextcoop.vercel.app
- **Super admin:** Giorgio Correia (role: super_admin)
- **Cor primária:** #635BFF (sidebar) / #1D9E75 (captação)
- **Pagamentos:** Stripe (conta acct_1Tc8lFRXQQ6b7tVh, modo teste)

---

## Organização de teste
- **Nome:** Cooperativa Mista Agropecuária de Ibirataia — COOPAIBI
- **CNPJ:** 54.305.114/0001-79
- **Plano atual:** Essencial
- **E-mail:** contato@coopaibi.com.br

---

## Planos disponíveis
| Plano | Preço | Filiados |
|---|---|---|
| Gratuito | R$0 | até 10 |
| Essencial | R$149/mês | até 50 |
| Profissional | R$499/mês | até 200 |
| Agro | R$1.500/mês | ilimitado + projetos |
| Enterprise | consulta | ilimitado |

---

## Status dos módulos implementados
| Módulo | Status |
|---|---|
| Autenticação / Login | ✅ |
| Onboarding de org | ✅ |
| Cadastro automático de org | ✅ |
| Configurações da org | ✅ |
| Cooperados / Filiados | ✅ |
| Financeiro | ✅ |
| Assembleias | ✅ |
| Documentos | ✅ |
| Mensalidades | ✅ |
| Isenção de pagamento | ✅ |
| Stripe / Webhook | ✅ (teste) |
| Super Admin — painel | ✅ |
| Super Admin — ver orgs | ✅ |
| Captação de Recursos (CRM/Kanban) | ✅ |
| Captação — Radar automático | ❌ |
| Captação — Alertas de prazo | ❌ |
| Captação — Geração de MI | ❌ |
| Captação — Perfil da org | ❌ |
| Gestão de usuários da org | ❌ |
| Super Admin — Módulos toggle | ❌ |
| Super Admin — Usuários global | ❌ |
| Super Admin — Planos | ❌ |
| Dashboard super_admin com gráficos | ❌ |

---

## Estrutura de usuários

### Separação de conceitos
- **`role`** — campo mantido apenas para `super_admin`. Todos os demais têm `role: 'membro'`
- **`funcoes text[]`** — funções operacionais que o usuário exerce no sistema
- **`vinculo text`** — tipo de vínculo com a org: `cooperado | funcionario | diretoria | externo`

### Funções disponíveis (padrão global)
| Função | Acesso |
|---|---|
| `admin` | Tudo na org |
| `financeiro` | Lançamentos, contas, relatórios |
| `tecnico` | Produção, cooperados, documentos técnicos |
| `conselho_fiscal` | Leitura financeiro e atas |
| `captador` | Módulo de captação completo |

### Regra de extensão
Novos módulos trazem suas próprias funções ao serem ativados.
Ex: módulo Loja adiciona `gerente_loja`, `vendedor`, `atendente`.

### Arquivo central de permissões
`lib/permissoes.ts` — TODA verificação de permissão passa por aqui.
Funções: `temFuncao()`, `temAlgumaFuncao()`, `isAdmin()`, `isSuperAdmin()`

---

## Banco de dados — tabelas criadas
- `organizacoes`
- `usuarios` (com colunas `funcoes text[]` e `vinculo text` — migration 007)
- `cooperados`
- `lancamentos`
- `assembleias`
- `documentos`
- `mensalidades`
- `notificacoes`
- `funcoes_disponiveis` (migration 007)
- `oportunidades` (migration 008)
- `oportunidade_logs` (migration 008)
- `perfil_captacao` (migration 008 — tabela criada, tela ainda não)

---

## Módulo de Captação — o que foi construído

### Arquivos criados
```
supabase/migrations/008_captacao.sql
lib/captacao/actions.ts
app/(sistema)/captacao/page.tsx
components/captacao/KanbanBoard.tsx
components/captacao/OportunidadeModal.tsx
components/captacao/LogTimeline.tsx
```

### Funcionamento
- **3 abas:** Abertas agora | A abrir | Vencidas
- **Kanban:** Identificado → Contatado → Proposta → Aguardando → Resultado
- **Resultado** dividido em ✓ Aprovado e ✗ Reprovado
- **Fontes:** Internacional (azul) | Nacional (verde) | Manual (cinza)
- **Log imutável** de cada movimentação

### O que falta no módulo
1. Radar automático — varredura de fontes online por perfil da org
2. Alertas de prazo — e-mail 7 e 15 dias antes do vencimento
3. Geração automática de MI — busca dados da org, monta rascunho editável
4. Perfil de captação da org — tela em Configurações

---

## Fontes de editais mapeadas

### Internacionais
- GIZ Brasil: giz.de/en/brasil-portugues/tenders
- NORAD/NICFI
- EuropeAid: ec.europa.eu/europeaid/funding
- FAO, IFAD, GCF, BIRD

### Nacionais
- CAR/SDR Bahia: ba.gov.br/car/editais
- BNDES, FINEP, MCTI, MDA

---

## Oportunidades reais da COOPAIBI mapeadas
| Edital | Fonte | Valor | Prazo MI | Prazo Resultado |
|---|---|---|---|---|
| CAR BPA 009/2026 — Galinha Caipira | Nacional/CAR | R$ 25.624.000 | 10/07/2026 | 31/08/2026 |
| CAR 006/2026 — Plantas Medicinais | Nacional/CAR | — | — | — |
| GIZ Brasil — Fundo Florestas | Internacional | — | — | — |

---

## Sidebar — estrutura de menus

### Menu super_admin
```
SISTEMA
  Dashboard → /admin

PLATAFORMA
  Organizações → /admin
  Usuários → /admin/usuarios (em breve)
  Módulos → /admin/modulos (em breve)
  Planos → /admin/planos (em breve)
```

### Menu membro de org
```
PRINCIPAL
  Dashboard, Cooperados, Mensalidades, Financeiro, Assembleias, Documentos

AGRO (visível para admin + tecnico)
  Produção, Comercialização, Loja (em breve)

PROJETOS (visível para admin + captador)
  Projetos, Impacto & ESG, Captação

CONTA
  Configurações
```

---

## Lista de pendências (backlog)

### Alta prioridade
1. **Gestão de usuários da org** — Configurações → Usuários
   (convidar por e-mail, vincular, atribuir funções, ativar/desativar)
2. **Radar de captação** — varredura automática de fontes por perfil da org
3. **Alertas de prazo** — e-mail automático 7 e 15 dias antes do vencimento
4. **Geração automática de MI** — dados da org + rascunho editável + export PDF

### Média prioridade
5. **Perfil de captação da org** — tela em Configurações
6. **Tela Módulos** no super_admin — toggle habilitar/desabilitar por org
7. **Campo `modulos_ativos text[]`** na tabela organizacoes

### Backlog
8. Dashboard super_admin com gráficos e métricas
9. Tela Usuários no super_admin — visão global de todos os usuários
10. Tela Planos no super_admin — gestão de assinaturas
11. Stripe live — verificar empresa, trocar chaves, recriar webhook
12. DNS — aguardando registro.br (e-mail enviado hostmaster@registro.br)
13. Validação de e-mail — ConfirmEmail está OFF no Supabase
14. Manual do usuário
15. Terminologia padronizada
16. Segurança — revisão geral
17. Landing page
18. Demo

---

## Padrão visual do projeto
- Fundo geral: `#f8f7f4`
- Cards: fundo branco, `border: 1px solid #e5e3dc`, `border-radius: 12px`
- Fonte: `system-ui`
- Sem bibliotecas de UI externas — tudo inline styles
- Cor primária sidebar: `#635BFF`
- Cor primária captação: `#1D9E75`
- Ícone: N (logo NextCoop)

---

## Convenções de código
- Server Actions com `'use server'`
- Client components com `'use client'` apenas quando necessário
- TODA verificação de permissão via `lib/permissoes.ts`
- Nunca comparar `role` ou `funcoes` diretamente nos componentes
- Migrations numeradas sequencialmente: 001, 002... 008 (atual)
- Próxima migration: 009
