# Módulo Comercialização — documento de continuidade

Handoff para retomar o módulo em outro chat. Atualizado em 2026-07-10.
Foca no que é carga-pesada para continuar: modelo de dados, mecânica de saldo,
pipeline de cotações/Índice Nex e pendências abertas. Para status macro do
produto, ver `docs/MODULOS.md`; para schema completo, `docs/SCHEMA.md`.

> Ao trabalhar neste módulo, o CLAUDE.md manda delegar features/bugfix para o
> subagente `nexcoop-comercializacao`, fiscal para `nexcoop-fiscal` e migrations
> para `nexcoop-migration-writer`.

---

## 1. Modelo de dados do saldo do produtor

Quatro tabelas, criadas na migration `025_produtores_contas_caixa.sql`:

- **`produtores`** — cadastro. Ao inserir, o trigger `trg_criar_conta_produtor`
  cria automaticamente a `contas_produtor`.
- **`contas_produtor`** — 1 por produtor. Guarda `saldo_financeiro` (R$).
- **`saldos_produto`** — saldo de PRODUTO por conta (ex.: kg de amêndoas), um
  registro por par `(conta_id, produto_id)`. Tabela **denormalizada**.
- **`movimentacoes_conta`** — o livro-razão. Tipos válidos: `entrega`,
  `conversao`, `saque_especie`, `saque_pix`, `compra_loja`, `ajuste_produto`,
  `ajuste_financeiro`, `estorno`. `quantidade_produto` é sempre **positivo**; o
  `tipo` define o sinal.

### Como o saldo é mantido (importante)

`saldos_produto` e `contas_produtor.saldo_financeiro` **não são calculados ao
vivo** — são mantidos pelo trigger `trg_atualizar_saldos_conta`
(função `fn_atualizar_saldos_conta`).

O card "Saldos" na tela de perfil do produtor
(`app/(sistema)/comercializacao/produtores/[id]/page.tsx`) lê esse valor
denormalizado via `getProdutorCompleto()`
(`lib/comercializacao/produtores.actions.ts:32`), que dá `select` em
`contas_produtor → saldos_produto`. **Não há cache do Next** nesse caminho (a
página é client component e chama a server action no `useEffect`).

### Correção 064 (2026-07-10) — recompute do saldo de produto

**Sintoma:** após DELETE manual de `movimentacoes_conta` via SQL, o card
continuava mostrando o saldo antigo.

**Causa:** o trigger original era `AFTER INSERT` e **incremental**
(`quantidade += NEW.quantidade_produto`). DELETE e UPDATE eram ignorados.

**Fix:** migration `20260710000001_064_fix_saldos_produto_recompute.sql`. O
trigger passou a **recalcular** a linha de `saldos_produto` a partir de
`SUM(movimentacoes_conta)`, disparando em INSERT/UPDATE/DELETE, + backfill que
recalcula todas as linhas existentes (zera as que ficaram órfãs). Sinais:
`entrega +`, `conversao −`, `ajuste_produto −`, `estorno −`.

**Escopo deliberado — só saldo de PRODUTO.** `saldos_produto` não tem writer
direto no código, então recomputar é seguro. Já `saldo_financeiro` é atualizado
direto por `lib/loja/actions.ts` (PDV `:1017` e estorno `:1109`), fora de
`movimentacoes_conta` — recomputá-lo apagaria esses ajustes. Por isso o
financeiro continua incremental (INSERT-only), inalterado.

> ✅ **APLICADA** (2026-07-10): a migration 064 foi rodada no SQL Editor do
> Supabase. Query de verificação está no fim do arquivo da migration (deve dar
> 0 kg para o produtor `6f78f629-060d-47ac-9324-aad862095c15`, Cristiano Dias
> dos Santos).

`saldos_produto` é lida por 4 fluxos — se mexer nela, conferir todos:
`produtores.actions.ts`, `caixa.actions.ts`, `extrato-produtor.ts`, `notas.ts`.

---

## 2. Pipeline de cotações e Índice Nex

Cron diário `app/api/cron/cotacoes-cacau/route.ts` (`0 8 * * *` no `vercel.json`;
o comentário antigo dizia "a cada 6h" e estava errado). Grava em
`cotacoes_mercado_externo` três séries:

| série                | produto   | fonte           | origem real                         |
|----------------------|-----------|-----------------|-------------------------------------|
| Bahia (R$/arroba)    | `cacau`   | `precodocacau`  | scraping precodocacau.com.br        |
| ICE NY (USD/ton)     | `cacau`   | `ice_ny`        | precodocacau (`window.CDC`) → Yahoo fallback |
| USD/BRL              | `usd_brl` | `bcb`           | PTAX Olinda (BCB) → Yahoo fallback   |

Leitura no dashboard: `getPrecoBahia`/`getUsdBrl`/`getIceNy` em
`lib/dashboard/indice-nex.actions.ts`; card em `components/dashboard/IndiceNex.tsx`.

**Correções desta sessão (commits):**
- `0fd1426` — o scraper da Bahia estava quebrado (site migrou de
  `Product/offers` para `Dataset/variableMeasured`) e gravava `fonte='cepea'`
  falso; passou a `fonte='precodocacau'`, com 3 caminhos de parse e faixa de
  plausibilidade.
- `93dd871` — ICE passou a vir do precodocacau (`window.CDC.ice_usd_ton`), Yahoo
  vira fallback; câmbio migrou para PTAX/BCB.
- `7c7bf72` — o ICE era coletado mas **nunca renderizado**; `getUsdBrl` lia
  `usd_brl/bcb` que o cron nunca gravava. Ambos corrigidos + tile do ICE no card.
- `7dce87e` — textos ilegíveis (`#aaa`/`#bbb` em card branco, ~2:1) → `COM_C.txtSub`.

---

## 3. Preview investing.com (temporário — decisão pendente)

`app/(sistema)/comercializacao/painel/temp/page.tsx` + parser puro
`lib/comercializacao/investing-utils.ts` (`parseIndicesCacau`). Lê **todos** os
índices de `br.investing.com/commodities/us-cocoa` do payload `__NEXT_DATA__`:
preço, OHLC, bid/ask, volume, open interest, 52 semanas, variação em 9 janelas,
ficha do contrato, análise técnica por timeframe e curva CCc1..CCc5.

- Rota fora do menu, `revalidate 300s`, não alimenta o Índice Nex.
- Cloudflare do investing bloqueia IP de datacenter → 403 direto da Vercel;
  fallback via `r.jina.ai` com `X-Return-Format: html` (`3d9da7a`).

**Decisões pendentes com o Giorgio antes de integrar de verdade:**
1. **Contrato.** Essa URL é `CCc2` (Setembro/26). O Índice Nex usa Julho/26 via
   precodocacau; Yahoo `CC=F` é front month. São instrumentos diferentes —
   trocar a fonte sem alinhar o contrato desloca a série. Se for usar investing,
   o correto é `CCc1`.
2. **Licença.** O dado principal vem `isDelayed:false` (tempo real);
   redistribuir exige contrato de vendor. Existe licença **gratuita** da ICE para
   dado atrasado (>10 min), suficiente para o caso de uso. Vale o mesmo alerta
   para precodocacau e Yahoo — todos redistribuem dado proprietário do ICE.

---

## 4. Pendências abertas

- [x] **Rodar a migration 064** no SQL Editor do Supabase — aplicada em
      2026-07-10. Verificar o card do Cristiano (deve mostrar 0 kg).
- [x] **Insert de `estorno` quebrado** em `lib/loja/actions.ts` — corrigido em
      2026-07-10. Três bugs no mesmo fluxo, todos usavam colunas inexistentes em
      `movimentacoes_conta` (`valor`, `saldo_apos`, `descricao`, `criado_em`) e
      omitiam `usuario_id` (NOT NULL):
      1. Insert de `compra_loja` no PDV (`finalizarVenda`) falhava silencioso →
         nenhuma linha de razão. Corrigido para `valor_financeiro`/`observacoes`
         + `usuario_id`; **removido o UPDATE manual do saldo** — o trigger já
         debita `saldo_financeiro` no INSERT de `compra_loja` (evita dupla
         escrita).
      2. `cancelarVenda` lia `.select('id, conta_id, valor')` (`valor` não
         existe) → `movConta` vinha null e o estorno nunca rodava. Agora lê
         `valor_financeiro`.
      3. Insert de `estorno` corrigido (colunas + `usuario_id`). O UPDATE manual
         do saldo **fica** porque o trigger não mexe em `saldo_financeiro` para
         tipo `estorno` (só produto). `npx tsc --noEmit` OK.
- [ ] **Decisão de fonte do ICE** (ver seção 3): contrato + licença.
- [ ] Rodapé do Índice Nex cita `NOAA` e `CFTC` — não verifiquei se há código
      alimentando essas fontes ou se é só texto aspiracional.

## 5. Armadilhas conhecidas

- `saldos_produto` / `saldo_financeiro` são **snapshots mantidos por trigger** —
  server actions nunca escrevem direto (regra 9 do CLAUDE.md). A exceção atual
  (loja escrevendo `saldo_financeiro` direto) é a origem do escopo limitado do
  fix 064.
- `movimentacoes_conta` tem FK para `contas_produtor`, não direto para produtor —
  o filtro é sempre por `conta_id`.
- Migrations só via SQL Editor do Supabase Dashboard. Próxima disponível: **070**
  — conferir sempre em `docs/SCHEMA.md` antes de criar, este número fica
  desatualizado com frequência.
