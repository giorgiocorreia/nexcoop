# Módulo Comercialização — documento de continuidade

Handoff para retomar o módulo em outro chat. Atualizado em **2026-07-28**
(Grok / xAI + Giorgio).
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

## 1.0. Sessões de caixa (comercialização) — continuidade e anti-duplicata (090, 2026-07-28)

**Autor da correção:** Grok (xAI / Grok Build), com Giorgio — caso real COOPAIBI / Luan de Jesus (27/07/2026).

### Tabelas
- **Comercialização:** `sessoes_caixa` (`status` = `aberta` | `fechada`)
- **Loja:** `loja_caixas` (`status` = `aberto` | `fechado`) — **módulo separado**

### Regra de unicidade (migration 090 — aplicada em produção)
- No máximo **uma** `sessoes_caixa` com `status='aberta'` por `(organizacao_id, usuario_id)`
- Índice: `sessoes_caixa_unica_aberta_por_usuario`
- **Não** impede o mesmo usuário de ter caixa de **loja** aberto ao mesmo tempo

### App
- `abrirCaixa()` — se já há aberta, retorna `{ success: true, ja_aberto: true, sessao_id }` sem criar outra
- `getSaldoResponsabilidadeComercializacao` — prefere sessão aberta; senão a mais recente
- Dashboard hub — lista abertos via admin client; `minhaSessao` por id da sessão

### Sintoma histórico (não repetir)
Dashboard "Caixa fechado" + botão abrir com sessão já aberta → 2ª sessão → operações numa, órfã na outra → saldo errado na UI.

### ZIP / NF-e saída (mesma sessão Grok)
- Reconsulta Focus para `status_nfe=processando` em `vendas_externas`
- Pacote fiscal do lote: `POST /api/comercializacao/lote-zip` (não server-action hash)

---

## 1.0.1. NF-e de saída: ICMS diferido (CST 51) e Carta de Correção (091, 2026-07-30)

### CST 51 — o que o diferimento exige

A saída da comercialização emitia **CST 41** (não tributada). O diferimento do
ICMS **foi concedido à COOPAIBI pelo estado da Bahia**, então a classificação
correta é **CST 51 (diferimento)**.

CST 51 não é só trocar o código: o item passa a exigir o grupo de diferimento, e
o valor diferido tem que ser **exatamente** `vICMSOp × pDif`. Fora disso a SEFAZ
devolve **rejeição 352**. Por isso o arredondamento é feito em `vICMSOp` primeiro
e o diferido deriva dele — nunca do valor bruto do item:

```ts
const icmsValorOperacao = Number((valor_total * aliquotaIcms / 100).toFixed(2))
const icmsValorDiferido = Number((icmsValorOperacao * percDiferimento / 100).toFixed(2))
const icmsValorDevido   = Number((icmsValorOperacao - icmsValorDiferido).toFixed(2))
```

Os **totais da nota** também mudam: com CST 51 o item tem base de cálculo (com 41
era zero), e o ICMS total é só a parcela não diferida.

Alíquota (**20,5%**, confirmada pelo contador em 30/07) e percentual (**100%**)
vêm de `organizacoes.com_nfe_saida_aliquota_icms` / `com_nfe_saida_perc_diferimento`.
Com diferimento total o valor a recolher é zero, então a alíquota é
**declaratória** — o contador ajusta sem deploy.

**Verificado em homologação (30/07):** NF-e nº 8/série 2 autorizada (SEFAZ 100)
com vICMSOp 5.227,50 / vICMSDif 5.227,50 / vICMS 0,00, sem rejeição 352.

### CST por produto — desenhado e adiado

`produtos.cst_icms`, `ncm`, `cfop_saida_interna` etc. existem desde a **048**, são
até selecionados em `emitir-nfe-saida.ts`, mas **nenhum código lê o valor** e
todos estão `NULL`. O emissor cobre tudo com constante (descrição, código, NCM
18010000, CFOP 5102, CST). Hoje isso é inofensivo — o catálogo tem **um** produto
(Amêndoas secas de cacau) e os 5 lotes são mono-produto.

Regra do Giorgio: **CST 51 só para agrícola com diferimento solicitado junto ao
estado**; os demais em 41. O plano era `produtos.cst_icms` virar a fonte (NULL →
41), com backfill do cacau para 51. **Adiado a pedido dele em 30/07/2026.**
Quando entrar o segundo produto, não é só o CST que sai errado — NCM, CFOP e
descrição também. A correção completa é emitir **um item por `lote_item`**.

### Carta de Correção Eletrônica (CC-e)

`POST /v2/nfe/{referencia}/carta_correcao` com `{ correcao }`. Campos confirmados
na resposta (testados em homologação, não inferidos da doc): `status: 'autorizado'`
com `status_sefaz` 135, `numero_carta_correcao`, `caminho_xml_carta_correcao`,
`caminho_pdf_carta_correcao`. As URLs de PDF/XML da Focus são **públicas**, sem
token — por isso podem ir direto para o comprador.

Limites que o código aplica:

- **15 a 1000 caracteres**, sem caractere de controle nem espaço duplo — a
  contagem na UI normaliza igual à SEFAZ, senão o usuário fecha os 15 com espaços
- **Máximo 20 cartas por nota**, e **cada uma substitui as anteriores**: a nova
  precisa repetir o que ainda vale das antigas
- **Rejeição 494** nos minutos seguintes à autorização é só propagação da nota no
  ambiente de eventos — tratada com mensagem pedindo para aguardar, não é erro do
  texto

**A CC-e não corrige** valores, base de cálculo, alíquota, CST, destinatário nem
datas (Ajuste SINIEF 07/05, art. 7º §1º-A). Nuance real: entre CST 41 e 51 com
100% de diferimento o ICMS destacado é **zero nos dois**, então o argumento de
"variável que determina o valor do imposto" é fraco — mas a carta **não altera o
XML** da nota, apenas anexa um evento. Uma CC-e é registro público na SEFAZ e
**não pode ser cancelada**, só substituída.

Caso real: nota **20/001 (Olam, lote 005, 27/07)** saiu com CST 41; a Olam pediu a
carta para lastrear a própria escrituração. Carta nº 1 registrada em 30/07.

### Onde vive

- `lib/focusnfe/carta-correcao.ts` — emissão, normalização e validação do texto
- `lib/comercializacao/cce-email.ts` — baixa PDF/XML da Focus e envia ao comprador
- `POST /api/comercializacao/cce-email` — rota HTTP, **não** server action (mesmo
  motivo do lote-zip: hash de action quebra na página aberta durante deploy)
- `nfe_eventos` — histórico, incluindo tentativas recusadas
- Botão **CC-e** em `/comercializacao/fiscal`, só em nota autorizada; no sucesso o
  modal vira painel de confirmação com PDF, XML e envio por e-mail

---

## 1.1. Resultado por safra — modelo realizado + marcação a mercado (082/083/084, 2026-07-19)

`/comercializacao/resultado` e o KPI "Resultado Comercialização" do dashboard
leem `vw_resultado_comercializacao` (migration 082), não mais o
`resultado_safra_snapshot` cru. A view decompõe o lucro em duas pontas —
plano técnico completo em `docs/PLANO_RESULTADO_COMERCIALIZACAO.md`:

```
REALIZADO  (armazenado, coluna GENERATED em resultado_safra_snapshot,
            nunca muda retroativamente — base p/ divisão de sobras)
  = LEAST(kg_vendido, kg_convertido) × (preço médio venda líquido − custo médio convertido)

AJUSTE A MERCADO  (calculado na leitura, não armazenado)
  = estoque_kg × cotação_vigente         (ativo: entregue e não vendido)
  − passivo_a_ordem_kg × cotação_vigente (passivo: entregue e não convertido)

LUCRO CORRENTE = REALIZADO + AJUSTE A MERCADO   (número do card do dashboard)
EXPOSIÇÃO = GREATEST(kg_vendido − kg_convertido, 0)
```

**Decisão de política (Giorgio, 19/07):** a cotação de conversão não é
travada na venda do lote — o produtor pode esperar a alta pra converter, é
um benefício intencional ao cooperado, e a cooperativa aceita o risco de
preço conscientemente. Lucro realizado pode ficar negativo em queda de
mercado; o papel da tela é dar visibilidade (realizado + exposição), não
eliminar o risco.

**Validado com dados reais da COOPAIBI** (safra em_andamento, 19/07): 1.804,7
kg vendidos, receita bruta R$ 40.454,17, lucro realizado +R$ 867,54,
exposição ~569 kg.

### Armadilhas descobertas nesta sessão

- **`saldos_produtor_snapshot` estava congelado desde a migration 052.** O
  trigger antigo só resolvia `safra_id` a partir de `lote_id` presente no
  INSERT — mas `entrega`, `conversao` e `ajuste_produto` raramente (ou só
  depois) têm `lote_id`. Resultado: o snapshot nunca atualizava ao vivo, só o
  backfill único da 052 ficava parado no tempo. Migration 083 generaliza a
  estampa de `safra_id` pra `entrega`/`ajuste_produto`, recria o trigger com
  recálculo do zero direto de `movimentacoes_conta` e refaz o backfill
  completo. Se `vw_saldos_produtor` parecer "travado" de novo no futuro,
  conferir primeiro se algum tipo novo de movimentação ficou sem estampa de
  safra no INSERT.
- **`lote_itens` nunca era gravado pelo código de aplicação desde a 052** —
  só o backfill único daquela migration populou os lotes existentes na
  época; nenhuma action de composição de lote gravava `lote_itens` depois
  disso (bug, não decisão). Todo lote criado após 24/06/2026 ficava sem
  itens, e por consequência de fora do rateio de resultado por produto
  (`fn_produto_lote`, migration 084, retornava vazio). Corrigido em dois
  lugares: `criarLoteComComposicao`/composição em
  `app/(sistema)/comercializacao/lotes/actions.ts` passa a gravar
  `lote_itens` de fato; e a 084 adiciona fallback em `fn_produto_lote(lote_id)`
  (usa `movimentacoes_conta` vinculadas — tipo `entrega`/`ajuste_produto` —
  quando o lote é mono-produto e não tem `lote_itens`) + backfill pra cobrir o
  histórico. **Se criar uma nova rota de composição de lote, confirmar que
  ela grava `lote_itens` — não existe mais nenhuma garantia automática disso.**
- **Convenção de sinal diverge entre a ledger (`movimentacoes_conta`) e o
  snapshot de saldo (`saldos_produto`/`saldos_produtor_snapshot`).** Na
  ledger, `quantidade_produto` é sempre positivo e o `tipo` define o sinal
  (ver §5); no agregado de saldo, `ajuste_produto` já entra com sinal
  negativo aplicado (é DÉBITO — ver armadilha existente abaixo). Ao ler os
  dois lados pra conferir consistência, não assumir que o mesmo campo tem a
  mesma convenção nas duas tabelas.
- **Transferência interna não recolhe FUNRURAL, mas paga a taxa de
  administração.** Migration 084 zera `funrural_rs` no trigger quando
  `vendas_externas.tipo_documento = 'transferencia_interna'` (confirmado com
  o Giorgio — não há substituição tributária nesse tipo de operação, já que
  não sai NF-e de venda da cooperativa). A taxa de administração continua
  sendo cobrada normalmente nos dois tipos de documento.

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

## 3.1. Impressos — Ficha de Pesagem e Recibo (092/093, 2026-08-06)

Tela `/comercializacao/impressos`. Cada item gera um PDF pronto pra impressão
com pdf-lib **rodando no navegador** — a server action só reserva numeração e
devolve os dados do cabeçalho, nunca o arquivo.

### Onde vive
- `app/(sistema)/comercializacao/impressos/page.tsx` — lista de impressos
- `.../ReciboModal.tsx` — formulário do recibo
- `.../actions.ts` — `reservarFichasPesagem`, `gerarRecibo`
- `lib/pdf/fichasPesagem.ts` — 8 fichas por A4
- `lib/pdf/recibo.ts` — recibo A4, 2 vias + linha de corte
- `lib/pdf/recibo-utils.ts` — funções puras (extenso, CPF/CNPJ, competência,
  direção por tipo). **Não** vive em arquivo `"use server"` (regra 5)

### Recibo — o que é snapshot e o que é ao vivo
Congelado em `recibos` (a 2ª via tem que sair idêntica ao papel assinado):
`pessoa_nome`, `pessoa_cpf`, `valor`, `descricao`, `tipo`, `direcao`,
`competencia`.

Lido **ao vivo** de `organizacoes` a cada geração: razão social, CNPJ,
endereço, logo, `cor_primaria`. Mudou o cadastro da cooperativa, a reimpressão
sai com o dado atual — o emitente continua sendo o mesmo CNPJ.

O **valor por extenso** também é derivado a cada geração, nunca gravado: duas
fontes de verdade para o mesmo número acabariam divergindo.

### Direção (`recebemos` / `pagamos`)
Define o texto impresso e **quem assina** — sempre quem recebeu o dinheiro.
Vem do tipo (`DIRECAO_PADRAO`), o usuário pode inverter no modal, e o valor
escolhido **é gravado**: a regra padrão do tipo pode mudar depois, a via já
assinada não pode.

### Numeração
`organizacoes.ultimo_numero_recibo`, reservado por **compare-and-swap** na
action (`UPDATE … WHERE ultimo_numero_recibo = <valor lido>`), com retry e
`uq_recibo_numero_por_org` como rede final. Talão independente do da Ficha de
Pesagem. Número de recibo cancelado fica **queimado** — a sequência não é
reaproveitada.

⚠️ **A Ficha de Pesagem NÃO tem essa trava**: `reservarFichasPesagem` ainda faz
read-then-update em `ultimo_numero_ficha`. Dois usuários gerando fichas ao
mesmo tempo podem receber a mesma faixa. Pendente (seção 4).

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
- [ ] **Numeração da Ficha de Pesagem sem trava** (`reservarFichasPesagem`,
      `app/(sistema)/comercializacao/impressos/actions.ts`): read-then-update em
      `ultimo_numero_ficha`, dois usuários simultâneos pegam a mesma faixa.
      Aplicar o mesmo compare-and-swap já usado em `gerarRecibo` (seção 3.1).
- [ ] **Recibos — tela de histórico/reimpressão**: tabela e policy de SELECT já
      existem (092), falta a lista.
- [ ] **Recibos — cancelamento**: colunas `cancelado_em` /
      `motivo_cancelamento` existem, sem UI.
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
- Migrations só via SQL Editor do Supabase Dashboard. Conferir SEMPRE o número em
  `docs/SCHEMA.md` + `ls supabase/migrations/` antes de criar — qualquer número
  escrito em doc (inclusive este) fica desatualizado com frequência.
- **Sinal de `ajuste_produto` é DÉBITO** (trigger faz `-quantidade_produto`).
  Pra creditar produto via ajuste (ex.: entrada retroativa sem tocar estoque
  físico nem entrar em lote — casos Cristiano/Zenildo 18/07), insere-se
  quantidade NEGATIVA. Lote só puxa tipo `entrega` com `lote_id` null; ajuste
  nunca entra em composição de lote.
- **Coluna `date` pura nunca passa por `new Date()`** pra exibição — vira
  meia-noite UTC e recua um dia em Brasília. Usar `fmtDataSaida`
  (`saidas-caixa-utils.ts`) ou formatar direto da string. Mesma armadilha em
  `recibos.competencia`: `new Date('2026-08-01').getMonth()` devolve **julho**
  no fuso daqui, e a competência sairia impressa no mês errado — por isso
  `formatarCompetencia`/`competenciaParaData` (`lib/pdf/recibo-utils.ts`) são
  string-to-string, sem `Date` no meio.
- **pdf-lib com fonte padrão usa WinAnsi**: acento português passa, mas emoji
  ou aspas curvas coladas de um Word fazem o `embedFont` **lançar exceção**.
  Todo texto livre que entra num PDF precisa passar por sanitização (ver
  `sanitizar` em `lib/pdf/recibo.ts`).
- **`getOperacoesHoje` agrega 3 fontes** (movimentacoes_conta + aportes_sangrias
  + lancamentos da sessão) — nova fonte de dinheiro no caixa precisa entrar lá,
  senão "o dinheiro some" da lista de operações do dia.
- **Funções chamadas dentro de RLS policy (`get_org_id`/`get_user_role`)
  precisam de EXECUTE pro role `authenticated`** — revogar quebra toda query de
  usuário comum com `42501` (incidente 076/077→081, 17–18/07). Security Advisor
  vai acusar warning nelas; é o uso legítimo.
- Relatório de saídas de caixa: `lib/comercializacao/saidas-caixa{,-utils}.ts` +
  `/comercializacao/relatorios/saidas-caixa`. O KPI do dashboard
  (`getResumoPagamentosMes`) conta SÓ saques de produtor — semântica diferente
  do relatório, de propósito.
