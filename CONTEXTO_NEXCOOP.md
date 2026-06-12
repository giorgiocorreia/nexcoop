# NexCoop — Contexto do Projeto

## Identificação
- **Produto:** NexCoop — SaaS multi-tenant para cooperativas, associações, sindicatos e outras organizações
- **Stack:** Next.js + TypeScript + Supabase + Vercel
- **Repositório:** giorgiocorreia/nexcoop (branch: main)
- **Pasta local:** C:\Users\Lenovo\Documents\nexcoop
- **Supabase project ID:** cufovlntqfobutwvfcea
- **URL produção:** nexcoop.com.br (DNS propagado 01/06/2026)
- **Super admin:** gio.pessoal@gmail.com (Giorgio Correia, sem org)
- **Org admin:** giorgio@coopaibi.com.br

---

## Organização de teste — COOPAIBI
- **Nome:** Cooperativa Mista Agropecuária de Ibirataia
- **CNPJ:** 54.305.114/0001-79
- **Plano atual:** Essencial
- **Território:** Médio Rio de Contas, Bahia (16 municípios)
- **Áreas:** cacau, agrofloresta, pecuária, mel, plantas medicinais

---

## Padrão visual
- Fundo geral: `#f8f7f4`
- Cards: branco, `border: 1px solid #e5e3dc`, `border-radius: 12px`, `font-family: system-ui`
- Sem libs de UI externas — tudo inline styles
- Cores por módulo: sidebar `#635BFF` | captação `#1D9E75` | contábil `#0F766E` | loja `#E07B30` | comercialização `#92400e`
- Tipografia: Sora (headings), Inter (body)
- Ícones: Tabler Icons via CDN em `layout.tsx`
- Componente `Btn`/`BtnLink` centralizado em `components/ui/Btn.tsx`. Variantes: `cinza`, `marrom`, `verde`, `roxo`, `azul` (#378ADD bg/borda, texto branco, hover #185FA5)
- `fmt.ts` para formatação pt-BR

---

## Status geral dos módulos
| Módulo | Status |
|---|---|
| Autenticação / Onboarding / Configurações org | ✅ |
| Cooperados / Filiados / Financeiro / Assembleias / Documentos / Mensalidades | ✅ |
| Stripe (modo teste) | ✅ |
| Super Admin — painel, orgs | ✅ |
| Captação (CRM/Kanban) | ✅ |
| Captação — Radar, Alertas, MI, Perfil org | ❌ |
| Contábil completo (15 migrations, 13 telas) | ✅ |
| Comercialização (cacau) | ✅ (ver detalhe abaixo) |
| Loja Agropecuária | ⏸ pausada (migration 014 ok) |
| Gestão de usuários da org | ❌ |
| Portal do Filiado | ❌ (planejado) |

---

## Módulo Comercialização — estado atual (12/06/2026)

### Implementado
- Caixa: abrir/fechar, busca produtor (nome/CPF), registrar entrega (individual + rateio), pagar produtor (conversão+saque), saque financeiro, aporte/sangria com auth admin
- Diário de caixa com drill-down por sessão
- Comprovante de entrega (PDF térmico 80mm) via `BotaoComprovante`
- PDF de fechamento A4 via pdf-lib (client-side)
- **NF-e de entrada via Focus NFe — FUNCIONANDO EM HOMOLOGAÇÃO** (ver seção dedicada)

### Migrations
- 028 aplicada (snapshot_estoque, saldo_especie_calculado, aportes_sangrias)
- 029b aplicada — ajustes em `notas_entrega`:
  - `produtor_id` agora referencia `produtores` (não `cooperados`)
  - `status` check constraint expandido: `rascunho, emitida, cancelada, pendente, processando, autorizada, rejeitada, erro`
  - Colunas adicionadas: `quantidade_kg, valor_unitario, valor_total, cfop, referencia, chave_nfe, numero_nfe, serie, xml_url, danfe_url, motivo_rejeicao`
  - `lote_id` sem FK (tabela `lotes_cacau` ainda não existe)
- 030 = solicitacoes_aporte (pendente)
- 031 = enderecos (pendente)

### Pendências de UI
- Remover h1 "boiando" em outras páginas do Comercialização (Caixa já corrigido)
- `PerfilUsuarioClient` somente leitura por padrão, editar ao clicar
- Reposicionar "Conta ativa" no perfil
- `BotaoPdfSessao` no Diário de Caixa, renomear botão para "Imprimir Relatório"
- Remover "Mensalidades" da sidebar para cooperativas (após testes Comercialização)

---

## NF-e de Entrada — Focus NFe (FUNCIONANDO, 12/06/2026)

### Arquivos
```
lib/focusnfe/client.ts              — cliente HTTP (Basic Auth, FOCUS_BASE_URL exportado)
lib/focusnfe/emitir-nfe-entrada.ts  — monta payload, emite, polling, salva em notas_entrega
lib/comercializacao/nfe.actions.ts  — Server Actions: emitirNfeEntradaAction, getNfeStatus (sync automática)
components/comercializacao/ModalNfeEntrada.tsx — ModalNfeEntrada (pós-entrega) + BotaoNfe (diário)
```

### Configuração Focus NFe
- Empresa COOPAIBI cadastrada, razão social corrigida para "Cooperativa Mista Agropecuária de Ibirataia"
- Certificado A1 válido até 07/10/2026
- NFe habilitado, série **2** em homologação (próximo número: ajustar conforme uso)
- Tokens salvos na Vercel: `FOCUSNFE_TOKEN_HOMOLOGACAO`, `FOCUSNFE_TOKEN_PRODUCAO`
- Variável `FOCUSNFE_AMBIENTE=homologacao` (trocar para `producao` quando for o caso)

### Parâmetros fiscais
- NCM: `18010000` (campo correto: `codigo_ncm`)
- CFOP: `1159` (cooperado, `preco_cooperado`) / `1102` (não cooperado, `preco_externo`)
- ICMS CST `41`, PIS/COFINS CST `72` — campos: `icms_situacao_tributaria`, `pis_situacao_tributaria`, `cofins_situacao_tributaria` (soltos, não aninhados em `imposto`)
- `modalidade_frete: '9'` (sem frete)
- FUNRURAL 1,63% — campo `valor_senar`, informativo
- Regime Normal / Lucro Real
- Cotação vigente vem da tabela `cotacoes` (campo `data`, `preco_cooperado`, `preco_externo`)

### Fluxo
1. Entrega registrada → comprovante interno (obrigatório) → modal pergunta "Emitir NF-e agora?"
2. Se sim → `emitirNfeEntradaAction` → payload Focus → polling até 3x/3s se `processando_autorizacao`
3. Diário de operações: botão dinâmico — "Emitir NF-e" (sem nota) ↔ "Reimprimir NF-e" (autorizada, verde)
4. `getNfeStatus` sincroniza automaticamente com Focus se status local ainda `processando`

### data_emissao — ARMADILHA RESOLVIDA
`new Date().toISOString().replace('Z','-03:00')` **NÃO** converte fuso — produz horário 3h no futuro (rejeição SEFAZ 703). Correto:
```ts
const agoraBrasilia = new Date(Date.now() - 3*60*60*1000)
const dataEmissao = agoraBrasilia.toISOString().replace('Z','-03:00')
```

### Pendente / próximos passos
- Testar emissão com produtor **cooperado** (CFOP 1159) — hoje só testado com externo (1102)
- NF-e de saída (venda moageira) — quando chegar, revisar série/numeração no painel Focus
- Migration 030 (solicitacoes_aporte) e 031 (enderecos)

---

## Modelo de dados — Membro Societário / Produtor / Usuário (PRÓXIMA SESSÃO)

### Situação atual
- `usuarios`: quem loga no sistema (campos `funcoes[]`, `vinculo`)
- `produtores`: quem movimenta no caixa (`tipo`, `cpf`, `cooperado_id` FK)
- `cooperados`: dados de associação — **hoje vazia (0 registros)**
- Hoje: 1 produtor cadastrado (externo), 0 cooperados, 0 vínculos

### Modelo a implementar — GENÉRICO por tipo de org
Conceito abstrato "membro societário" (cooperado/associado/sindicalizado conforme `tipos_org`). **Regra central: todo membro societário é produtor** (1:1 via FK em `produtores`).

**3 fluxos:**
1. **Cadastro de Usuário** — checkbox "é membro/produtor?" → cria registro espelho em `produtores` + tabela de membro
2. **Cadastro de Membro** (Cooperados/Filiados) — sempre cria `produtores` espelho automaticamente
3. **Produtor externo → "Promover a membro"** — reaproveita dados existentes (nome, CPF) + formulário complementar com campos que variam por tipo de org (ex: quotas-parte para cooperativa)

### Dependência arquitetural
Depende de `tipos_org` (backlog futuro): `id, nome, label, terminologia_json, fundo_obrigatorio, percentual_minimo, distribui_resultado, legislacao` — permite super_admin adicionar tipos de org sem deploy e define terminologia/campos do "membro societário" por tipo.

---

## Convenções de código
- Server Actions com `'use server'`
- **Nunca usar `auth_org_id()`** — sempre subquery: `(select organizacao_id from usuarios where id = auth.uid())`
- Org-level writes via `createAdminClient()` (bypass RLS)
- Toda permissão via `lib/permissoes.ts`
- Migrations manuais via Supabase SQL Editor (sequenciais) — `supabase db push`/`link` não funcionam no ambiente
- `types/database.ts` atualizado manualmente a cada nova tabela
- pdf-lib para PDFs (pdfkit incompatível com Vercel serverless)
- Comercialização: estoque físico e virtual (`saldos_produto`) são independentes — não bloquear venda física por saldo virtual

---

## Fluxo de trabalho com Claude Code
- Giorgio discute conceitos e confirma decisões antes de codar
- Claude (chat) prepara código/instruções → Claude Code executa → resultado revisado no chat
- Instruções para Claude Code: sempre em code block direto, sem explicação antes, sem pedir confirmação
- Toda instrução termina com `git add + commit + push`
- Arquivos >100 linhas: substituição completa, nunca diff parcial
- Validação via deploy Vercel (não localhost)
- Claude Code: `claude --dangerously-skip-permissions`

---

## Backlog priorizado (ordem sugerida)
1. **Modelo Membro Societário/Produtor/Usuário** (genérico por tipo de org) — próxima sessão
2. **Módulo Cotações** — preço por produto, multi-produto (não só cacau), histórico, futura automação de entrada de preços
3. Testar NF-e com cooperado (CFOP 1159)
4. Migrations 030 (solicitacoes_aporte), 031 (enderecos)
5. NF-e de saída (venda moageira) + relatório de composição de lote + ZIP XMLs
6. `tipos_org` — tabela configurável de tipos de organização
7. Gestão de usuários da org, Segurança (2FA, auditoria)
8. Portal do Filiado (mobile, subdomínio por org)
9. Loja Agropecuária (retomar)
10. Captação — Radar, alertas, geração de MI
