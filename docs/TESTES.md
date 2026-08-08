# Testes — NexCoop

> Criado em 08/08/2026, junto com a primeira suíte automatizada do repositório.
> Complementa `docs/PLANO_TESTES_CONTABIL.md`, que é plano de QA e não roda nada.

---

## 1. Como rodar

```bash
npm test              # suíte inteira, uma vez
npm run test:watch    # modo watch, durante o desenvolvimento

npm run teste:formularios   # ponta a ponta, precisa de `npm run dev` de pé
npm run teste:cobertura     # idem
```

`npm test` é o que precisa passar antes de commitar, junto com
`npx tsc --noEmit` (regra 4 do `CLAUDE.md`).

---

## 2. Stack, e por que esta

**Vitest 4**, `environment: 'node'`, alias `@` para a raiz, teste
**co-localizado** com o código (`lib/x.ts` + `lib/x.test.ts`).

Não foi escolha nova: é exatamente o que **nexcore** e **nexfin** já usam. Quem
troca de repositório não deve trocar de hábito, e a recomendação já estava
escrita em `PLANO_TESTES_CONTABIL.md` § 2.

### A pegadinha do `include`

`vitest.config.mts` restringe o `include` a `{app,components,lib,scripts,types}`.
Isso **não é cosmético**: este repositório tem `sites/coopaibi/` (espelho do
site, ignorado pelo git) com `node_modules` próprio dentro. Com o padrão amplo
`**/*.test.ts`, a suíte puxava os **1.885 testes internos do zod**, 10 deles
quebrando por dependência que não temos. `exclude: ['node_modules']` não
resolve — é caminho literal e não casa `node_modules` aninhado.

---

## 3. O que existe hoje

| Arquivo | Cobre |
|---------|-------|
| `lib/site/espelho-coopaibi.test.ts` | **a decisão de rota do site**: precedência entre endpoint/externo/integrada/congelada/estático, as duas portas de entrada, raiz do domínio, e que nenhum destino aponta para o cPanel |
| `lib/site/coopaibi/formularios-utils.test.ts` | higienização de campo, limite de 2.000 chars, escape de HTML, mapa de campo por formulário, corpo do e-mail |
| `lib/site/leads-utils.test.ts` | filtro, contagem por status, contagem do mês, link de WhatsApp, CSV |
| `scripts/espelho-coopaibi/correcoes.test.ts` | catálogo de correções, seleção por página (`excetoEm`/`apenasEm`) e **idempotência** |

**87 testes.** Cobrem o módulo Site. O resto do sistema **não tem teste
nenhum** — comercialização, loja, contábil, financeiro seguem verificados à
mão.

O primeiro da lista é o que mais importa: era um encadeado de `if` dentro do
`middleware.ts`, intestável sem subir servidor, e decide cada URL do site no
momento em que o DNS virar. Foi extraído para `lib/site/espelho-coopaibi.ts`
justamente para poder ser testado — o middleware ficou só com o efeito
colateral (rewrite/redirect).

### Por que estes três, e não outros

A regra 5 do `CLAUDE.md` (função pura fora do arquivo com I/O) é o que torna
teste possível. Onde ela foi seguida, testar é trivial; onde não foi, o código
está preso a `createAdminClient()` e só se testa com banco. A suíte nasceu
junto com a extração de `formularios-utils.ts` e `leads-utils.ts` — **é o
padrão a repetir**: ao mexer num módulo, extraia a parte pura e teste-a.

---

## 4. Verificação ponta a ponta (não é `npm test`)

Dois scripts que **precisam de servidor de pé e do Supabase real** — este
projeto não tem base de homologação, o `.env.local` aponta para produção. Por
isso ficam fora de `npm test`, que tem que poder rodar a qualquer momento.

### `teste:formularios`

Exercita o que o unitário não alcança: o middleware traduzindo `.php` para
rota do app, os **dois contratos de resposta** herdados do HTML original (JSON
para cooperado/parceria, redirect 303 para o agendamento de cacau), a gravação
real em `site_leads` com o formato do jsonb, e o endpoint da bolsa.

**Grava leads de verdade e apaga no final**, identificando-os pela marca no
nome. Use `--manter` para inspecioná-los na tela antes de limpar.

> Só é seguro enquanto o `.env.local` **não** tiver `SMTP_*`: sem isso
> `smtpConfigured()` é falso e nenhum e-mail sai para a caixa da cooperativa.
> Se um dia essas variáveis entrarem no `.env.local`, o script passa a mandar
> e-mail de teste para `contato@coopaibi.com.br`.

### `teste:cobertura`

Percorre os links do site antigo (ou dos HTMLs congelados, se o cPanel não
responder) e bate cada um contra o espelho. É o que decide se o DNS pode
virar — depois da virada, caminho não mapeado é 404 na cara do visitante.

Foi assim que apareceu o `index.html` que dava 404 (11 links nas páginas
congeladas). **43 caminhos, 43 respondendo** em 08/08/2026.

---

## 5. O que falta

- **Componente React**: nada é testado. Precisaria de `jsdom` e
  `@testing-library/react` — decisão em aberto.
- **Server actions**: `atualizarLead` e `atualizarStatusEmLote` não têm teste.
  A verificação de permissão e o isolamento por org são a parte que mais
  mereceria, e exigem mock do Supabase ou base de teste.
- **Resto do sistema**: ver `PLANO_TESTES_CONTABIL.md` para o roteiro manual
  do módulo contábil, que é o mais crítico sem automação.

---

## 6. Testes compartilhados entre os projetos irmãos?

Avaliado em 08/08/2026, a pedido do Giorgio. **Conclusão: não vale hoje.**

Teste mora junto do código que testa — um repositório central importando
`lib/` de três projetos quebra no primeiro refactor de qualquer um, e ninguém
roda o teste do outro repo antes de commitar. O que dá para compartilhar é o
**código comum, com os testes dele junto**, num pacote (`nex-comum`, via
dependência git).

Medição da sobreposição real: dos ~40 arquivos testados em nexcore e nexfin,
**um só** caminho coincide com o NexCoop (`app/api/whatsapp/_lib/agent.ts`). A
duplicação verdadeira está **entre nexcore e nexfin** (ambos têm
`lib/telefone.ts`). Candidatos a pacote comum: CPF, telefone, máscaras,
moeda/data — cerca de 150 linhas somadas.

Custo de fazer: os três repos passam a depender de repo privado no build da
Vercel (com token), versionamento, e um bug no pacote derruba três produtos ao
mesmo tempo. O que de fato se repete e dói pouco é a config do Vitest — 15
linhas.
