# Plano: Módulo Site — site institucional por organização

**Status:** Não iniciado — documento de referência
**Criado em:** 19/07/2026

---

## Motivação

Toda cooperativa precisa de presença web e quase nenhuma tem equipe pra isso.
Hoje o site da COOPAIBI (coopaibi.com.br) é estático, hospedado em cPanel,
atualizado manualmente via FileZilla pelo Giorgio — não escala nem pra uma org,
muito menos como produto.

A oportunidade: o NexCoop já tem os dados que tornam um site de cooperativa
vivo — cotações/boletim, assembleias, diretoria, captação de interessados.
Site multi-tenant alimentado por esses dados é addon vendável que nenhum
construtor genérico (Wix etc.) replica.

---

## Estado atual do coopaibi.com.br (auditado em 19/07/2026)

Fonte: `C:\Users\Lenovo\Dropbox\Giorgio\COOPAIBI_Drop\Site\coopaibi-site`.
NÃO é site estático — é um mini-CMS PHP + MySQL feito pelo Giorgio:

- **Banco próprio** (`coopaibi_loja`, MySQL/phpMyAdmin): usuarios (admin do
  site), categorias, produtos (preço, foto, destaque), promocoes; v2 adiciona
  eventos/vídeos/perfis.
- **Painel admin** (`/admin`, login próprio): produtos, categorias, promoções,
  eventos, vídeos, usuários — **cadastro de produtos DUPLICADO com a Loja do
  NexCoop** (`loja_produtos`), mantidos à mão em dois lugares.
- **Páginas**: index, ações, cooperado, parceiro, homens-de-barro,
  relatório-compradores, loja.php (lê do MySQL), videos.php; tradução via
  google-translate-php.
- **Formulários** (`enviar-cooperado.php`, `enviar-parceria.php`): só enviam
  e-mail via `mail()` pra `contato@coopaibi.com.br` — lead não entra em
  sistema nenhum, morre na caixa de entrada.
- **E-mail confirmado no domínio** (`contato@coopaibi.com.br`, provavelmente
  no próprio cPanel): na migração de DNS é OBRIGATÓRIO preservar os registros
  MX (ou migrar o e-mail antes).
- Upload via FileZilla; registro do domínio em nome do Giorgio.

---

## Fase 1 — Integrar sem migrar (rápido, site atual continua no ar)

1. **Endpoint público de boletim**: `GET /api/publico/[slug-org]/boletim` —
   JSON com cotação do dia (preço cooperado/externo, vigência) e o que mais o
   boletim já publica. Rate-limit básico; sem auth (dado público por decisão
   da org — flag de opt-in em configurações).
2. **Endpoint de captação**: `POST /api/publico/[slug-org]/interesse` — nome,
   telefone, mensagem → cai na Captação/leads da org (e futuramente aciona a
   Mariana pra qualificar via WhatsApp).
3. **Endpoint público de produtos da Loja**: `GET /api/publico/[slug-org]/produtos`
   — lista de `loja_produtos` ativos (nome, preço, foto, categoria) pra
   `loja.php` do site consumir em vez do MySQL próprio. **Mata a duplicação de
   cadastro**: produto passa a ser mantido só no NexCoop; o admin PHP do site
   pode ser aposentado gradualmente (fotos: servir das URLs do NexCoop).
4. Formulários passam a postar no endpoint de captação (mantendo o e-mail
   como notificação — lead entra no sistema E avisa a caixa de entrada).
5. Site atual ganha os fetches + form apontado; uma última rodada de
   FileZilla e o site para de ficar desatualizado.

## Fase 2 — Módulo Site multi-tenant (o produto)

### Arquitetura
- **Middleware por Host**: requisição chega com Host `coopaibi.com.br` ou
  `coopaibi.nexcoop.com.br` → resolve org (tabela de domínios) → rewrite pra
  `app/(site-org)/[orgSlug]/...`. Padrão "Vercel for Platforms".
- **`site_config` por org** (migration futura): slug, dominio_custom,
  logo/cores/fotos, textos, seções ativas, publicado (bool).
- **Template** com seções alimentadas por dados do sistema:
  - Hero institucional (editorial)
  - Cotação do dia / boletim (automático — o killer feature)
  - Próximas assembleias + atas públicas (automático, com flag de público)
  - Diretoria / sobre (editorial)
  - "Quero ser cooperado" (→ captação)
  - Contato + Área do cooperado (→ login)
- **Painel de edição** dentro de Configurações da org (fase 2b — no início o
  editorial pode ser preenchido pelo Giorgio direto no banco/admin).

### Domínios
- **Incluso no plano**: `slug.nexcoop.com.br` (wildcard DNS).
- **Addon pago**: domínio próprio, adicionado via Vercel Domains API; org
  aponta CNAME/A conforme instrução na tela.
- **Infra**: exige upgrade Vercel Hobby → Pro (Hobby não permite uso comercial
  e limita wildcard/domínios). Custo coberto pelo preço do addon.

### Precificação (referência, ajustar)
- Site no subdomínio: incluso a partir do tier Essencial (diferencial de plano).
- Domínio próprio + seções extras: addon R$ 49–99/mês.
- Registrar no catálogo de módulos do PLANO_MODULOS.md quando implementar.

### Migração COOPAIBI (piloto)
1. Montar o site dela no módulo, em `coopaibi.nexcoop.com.br`, com conteúdo
   portado do site atual.
2. Validação do Giorgio/diretoria.
3. Trocar DNS do coopaibi.com.br pra Vercel (preservando MX se houver e-mail).
4. Cancelar hospedagem cPanel (economia direta; manter backup dos arquivos).

---

## Implementado em 19/07/2026 — template × customização

Motor no ar (migrations 085 + commits 33e3749/28a5437/3e6974b), validação em
coopaibi-site.vercel.app (subdomínio definitivo aguarda vaga/upgrade Vercel):

- **Template padrão**: app/(site-org)/[slug]/* — o que qualquer org recebe ao
  ativar o módulo. Design próprio do NexCoop, seções com dados vivos.
- **Customização por org** (premium): componentes em
  components/site/custom/<slug>/; registro em lib/site/custom.ts
  (temCustomizacao). Rotas ramificam no início; rotas exclusivas da custom
  (loja, videos, relatorio-compradores) dão 404 pra slugs sem custom.
- **COOPAIBI**: porte FIEL do site original (HTML/CSS/imagens da pasta do
  Dropbox, interações reimplementadas em CoopaibiInteractions.tsx), único
  acréscimo: faixa de cotação do dia na home. Formulários postam em
  /api/site/[slug]/interesse com os campos ricos originais.
- Banner de pré-visualização (publicado=false) e noindex (indexavel=false)
  valem nos dois modos.

Pendências: importar eventos/vídeos/promoções do dump MySQL; migration
site_leads + tela (leads hoje em site_conteudos inativo — paliativo);
painel de edição; tradução PT/EN (translate.php não portado); publicação e
virada de DNS (checklist MX).

## Implementado em 07/08/2026 — espelho fiel substitui o porte React

**Decisão:** publicar no domínio próprio uma cópia BYTE A BYTE do site que
está no ar em cPanel, e só então integrar com o NexCoop gradativamente. O
porte React de 19/07 passa a ser matéria-prima da integração, não o que é
servido — motivo: a fidelidade dele é verificável só por inspeção, e a
exigência era não perder uma linha do que está publicado.

- **Arquivos**: `public/sites/coopaibi/` — 6 HTML + 6 CSS + 2 imagens,
  copiados sem nenhuma edição de `Dropbox/Giorgio/COOPAIBI_Drop/Site/coopaibi-site`
  (a cópia da RAIZ, de 21/05/2026, não a de `public_html/`, de 19/05, que é
  um snapshot anterior e não tem admin/, acoes.php, videos.php).
  **Não editar esses arquivos** — a fidelidade é verificável por sha256
  contra a origem, e foi (14/14 idênticos, inclusive nos bytes servidos).
- **Roteamento** (`middleware.ts`, bloco "Espelho fiel da COOPAIBI"): duas
  portas de entrada — o domínio próprio (`coopaibi.com.br`) e o caminho
  direto `/sites/coopaibi/*`, que funciona sem DNS. Fica ANTES do gate de
  auth; sem isso o CSS cairia no redirect de login (`.css` não é exceção no
  matcher).
- **Imagens** (`next.config.mjs`, rewrite de `/assets/*`): o matcher do
  middleware pula extensões de imagem, então os dois logos precisam dessa
  regra separada. Deliberadamente estreita, pra não colidir com o rewrite
  do middleware.
- **Loja / Vídeos / Ações** continuam no cPanel (redirect 307). Dependem do
  MySQL `coopaibi_loja`, que não existe aqui — não há dump em lugar nenhum
  da pasta do Dropbox, só o schema e um evento semeado.
- **Endpoints PHP** (`enviar-cooperado.php`, `enviar-parceria.php`,
  `translate.php`) via rewrite/proxy pro cPanel: os formulários e a tradução
  PT/EN seguem funcionando como hoje (o porte React tinha perdido os dois).

### Correção de 07/08/2026 — a pasta do Dropbox estava desatualizada

O primeiro espelho foi montado a partir de
`Dropbox/.../Site/coopaibi-site` (21/05). **Essa pasta NÃO é o que está no
ar.** O site em produção evoluiu depois disso e ganhou: ticker de mercado
(widget TradingView), menus dropdown, `noticias.php` (com slug por matéria),
`cacau.php`, e a home virou `index.php`. Tradução passou de botões PT/EN +
`translate.php` pro Google Translate Element. O logo virou `.png`.

Os arquivos da versão atual estão espalhados em TRÊS pastas, e nenhuma
sozinha tem o site completo:

| Arquivo | Onde está a versão que confere com o ar |
|---|---|
| `index.php`, `noticias.php`, `acoes.php`, `cacau.php`, `loja.php`, `videos.php` | `C:\COOPAIBI_LOCAL\Site` |
| `cooperado.html`, `parceiro.html`, `style.css`, `noticias.sql` | `C:\COOPAIBI_LOCAL\Site` |
| `index.css`, `logo-coopaibi.png`, `logo-evento-cacau26.jpeg`, `relatorio-compradores.html` | `C:\COOPAIBI_LOCAL\Site\Part 1` |
| `homens-de-barro.html`, `acoes.css`, `cooperado.css`, `parceiro.css`, `loja.css` | Dropbox `coopaibi-site` (só aqui) |

**Antes de usar qualquer cópia local, conferir sha256 contra
`https://coopaibi.com.br/<arquivo>`.** Foi assim que o erro apareceu, e é o
único jeito de não repeti-lo. O cPanel é a fonte da verdade; o Dropbox não
recebe os uploads feitos por FileZilla.

### Refazer as páginas PHP — uma por uma

PHP não roda na Vercel, então cada página `.php` precisa virar `.html`. O
roteamento em `middleware.ts` tem dois conjuntos que governam isso:

- `PHP_REFEITAS_COOPAIBI` — mapa `.php → .html` das já refeitas. A URL `.php`
  é preservada, porque é o que os links internos do site original usam.
- `PHP_NAVEGACAO_COOPAIBI` — as que ainda faltam, redirecionadas (307) pro
  cPanel, onde funcionam de verdade.

Refazer uma página = gerar o `.html`, conferir contra o ar, e mover a entrada
de um conjunto pro outro.

| Página | Tabela MySQL | Equivalente no Supabase | Situação |
|---|---|---|---|
| `index.php` | `noticias` (8 títulos) | `site_conteudos` | ⏸ espelho congelado |
| `cacau.php` | `cacau_precos` | **`cotacoes`** | ✅ **integrada** 07/08 |
| `loja.php` | `produtos`, `categorias`, `promocoes` | **`loja_produtos`** | ✅ **integrada** 07/08 |
| `noticias.php` | `noticias` | `site_conteudos` (falta campo) | pendente |
| `videos.php` | `videos` | `site_conteudos` (falta campo) | pendente |
| `acoes.php` | `acoes_eventos` — **vazia** | — | ✅ **espelho** 07/08 (nada a integrar) |
| `biblioteca.php` | `biblioteca` | — | página órfã (link para enviar) |

### O que o dump de 07/08 revelou

`coopaibi_loja` exportado (15,8 KB). **O conteúdo inteiro do site cabe em 6
linhas**: 1 notícia, 3 vídeos, 1 produto, 1 categoria, 1 preço de cacau.
`acoes_eventos` e `promocoes` estão **vazias** — o 8º Festival que aparece
em Ações é hardcoded no `acoes.php`, então aquela página não tem o que
integrar. Existe ainda uma tabela `biblioteca` (2 linhas, ambas o mesmo PDF
do Projeto Cacau — cadastro duplicado) servindo a `biblioteca.php`, página
fora do menu, criada para ter um link a enviar.

Volume assim não justifica script de importação: recadastrar no painel do
NexCoop é mais rápido e já grava no formato certo.

O Supabase, em contrapartida, tem **mais e melhor**: 15+ produtos reais em
`loja_produtos` (contra 1 no site) e cotação de 23/07 em `cotacoes`.

### Padrão das páginas integradas — Route Handler, não page.tsx

`app/(site-org)/[slug]/cacau/route.ts` devolve `text/html`, e não JSX.
**Isto não é preferência:** a página tem seis blocos de `<script>` (ticker e
gráfico do TradingView, fetch do preço da bolsa, menus dropdown, Google
Translate) e **script inserido via `dangerouslySetInnerHTML` não executa** —
regra do navegador para `innerHTML`. Em JSX as cinco funcionalidades caem de
uma vez e teriam de ser reimplementadas, página a página. Devolvendo o
documento inteiro, o navegador analisa HTML de verdade e tudo roda como
sempre rodou.

Consequência desejada: a rota não passa pelo layout de `(site-org)`, já que
o documento capturado traz o próprio `<head>`, nav, rodapé e WhatsApp.

Fluxo por página: capturar com `gerar-pagina.mjs` → dividir nos pontos
dinâmicos com um `dividir-<pagina>.mjs` (falha alto se uma âncora sumir) →
montar em `lib/site/coopaibi/<pagina>.ts` → expor pelo Route Handler → mover
a entrada de `PHP_REFEITAS_COOPAIBI` para `PHP_INTEGRADAS_COOPAIBI` no
middleware.

**cacau.php (integrada):** o site publicava R$ 14,00/kg base e R$ 15,40
cooperado, parados desde 24/05. `cotacoes` traz R$ 18,66 e R$ 19,33 desde
23/07 — quase R$ 5/kg de diferença numa página que produtor consulta para
decidir onde vender. Agora acompanha sozinha cada cotação nova. Cache de
5 min (`s-maxage=300`), mesma janela do resto do módulo.

**loja.php (integrada):** encerra a duplicação de cadastro — problema nº 1
deste plano. Catálogo sai de `loja_produtos`, o mesmo cadastro do PDV e do
estoque: **27 produtos ativos** contra o único que chegou a ser cadastrado
no MySQL do site. Produto novo aparece sozinho; desativado some. Categoria
nova entra na barra lateral e no rodapé sem intervenção, porque as duas são
derivadas dos produtos.

Única página do espelho com ESTADO: `?cat=` e `?busca=`, os mesmos
parâmetros do site original — os links da barra lateral e o formulário de
busca continuam apontando para `loja.php`, sem tocar no HTML capturado.

Três coisas que exigiram decisão:

- **Categorias sujas.** `categoria` é texto livre e o cadastro tem
  "Nutrição Animal" (12), "Nutrição animal" (6), "nutrição animal" (4),
  "Acessório" (3), "Acessorio" (1) e "Ferramenta" (1). São 3 categorias
  gravadas de 6 jeitos. O agrupamento normaliza caixa e acento e exibe a
  grafia mais frequente; sem isso a barra lateral mostraria seis.
  **Vale limpar o cadastro** — a normalização é remendo, não conserto.
- **Busca sem acento nos dois lados.** Existe "Ração Peixe" e "Racao Peixe"
  no mesmo catálogo; comparar cru fazia a busca por "ração" achar 11 dos 12.
- **`loja_produtos` não tem foto, descrição nem destaque**, que o card do
  site usava. Sem foto cai no marcador 🌱 que o próprio site já usava; sem
  destaque, a seção "Em destaque" some (já era condicional no original).
  `desconto_cooperado` é o caminho inverso — informação que o site não tinha
  e a página já prometia ("Cooperados têm condições especiais").

### Decidido em 07/08 — foto de produto na Loja (depois do site)

Aprovado com escopo **cadastro + vitrine**, para começar depois que as três
páginas restantes saírem do cPanel. Não é ajuste do site: é feature do
módulo Loja que a vitrine consome.

1. Migration (próxima livre) com `loja_produtos.foto_url`
2. Bucket no Supabase Storage, com política de leitura pública
3. Campo de upload na tela de produto da Loja — reaproveitar o
   redimensionamento no navegador de `lib/cooperados/foto-imagem.ts`, que já
   existe para foto de cooperado e evita subir arquivo de câmera inteiro
4. Card da vitrine troca o marcador 🌱 pela imagem (`lib/site/coopaibi/loja.ts`)

Uma foto por produto, como no site antigo (`produtos.foto`). PDV e estoque
ficam **fora** do escopo por ora — são telas de uso diário que acabaram de
passar pela blindagem da migration 094.

### Pendências de dado descobertas em 07/08

- **Número de WhatsApp divergente.** O site usa `(73) 9 9862-9960` no
  topbar, rodapé e links `tel:` (index, cooperado, ações), mas o botão
  "WhatsApp direto" da página Compra de Cacau usa `(73) 99986-2960` — os
  mesmos dígitos trocados de lugar. Um dos dois está errado, e o da página
  de cacau é o único lugar com aquela forma. **Não corrigido**: só a
  cooperativa sabe qual é o certo, e telefone errado é pior que
  inconsistente. Nota: a integração WhatsApp do NexCoop (Evolution) está
  configurada com `5573999693548`, que é um terceiro número.
- **Categorias da Loja** com grafia inconsistente (ver acima).
- **`biblioteca`** tem 2 linhas para o mesmo PDF — cadastro duplicado.

**Ferramenta:** `scripts/espelho-coopaibi/gerar-pagina.mjs <fonte.php> <url>
<saida.html>`. Ele captura o HTML renderizado do cPanel — única fonte que
tem as linhas do MySQL dentro — mas **só grava se o fonte local
corresponder ao que está publicado**: todo bloco de texto obrigatório do
`.php` tem que aparecer na captura. É a trava que impede repetir o engano
de publicar uma versão velha.

Blocos dentro de `if`/`foreach` são tratados como condicionais e não contam
como falha: o corpo de `<?php if ($msg_ok): ?>` só sai quando o formulário
redireciona com `?agendamento=ok`.

Ao final o script lista o que ficou congelado — consultas SQL, endpoints
`.php` que precisam de proxy, e trechos com `date()` do servidor.

**cacau.php (feita):** 13/13 blocos obrigatórios conferidos, saída idêntica
byte a byte ao cPanel. Dois endpoints próprios entraram no proxy:
`cacau-preco-bolsa.php` (preço internacional, raspa Yahoo Finance/ICE com
cache de 1h) e `enviar-agendamento-cacau.php` (POST do agendamento de
entrega).

Quatro trechos com `date()` congelaram nesta captura: três exibem o
`atualizado_em` de `cacau_precos` ("Preços do dia — 07/08 13:52") e um é o
`min` do campo de data do formulário. O `min` congelado deixa escolher data
passada conforme os dias correm — some quando a página for ligada no banco.

**index.php (feita):** `scripts/espelho-coopaibi/gerar-index.mjs` remove o
cabeçalho PHP e substitui o único trecho dinâmico (o ticker) pelo conteúdo
renderizado, conferindo o resultado byte a byte contra o ar. Deu idêntico —
40.995 bytes, mesmo sha256. O ticker tem 1 notícia hoje, com slug
`lei-municipal-n-12982025-...`, diferente do seed de `noticias.sql`
(`lei-municipal-1298-2025`): a matéria foi cadastrada pelo admin.

O dado ainda vem congelado do cPanel. Ligá-lo no banco do NexCoop é a etapa
seguinte, e é o que transforma o espelho em módulo de verdade.

### ⚠ Bloqueio conhecido para a virada de DNS

`LEGADO_COOPAIBI` em `middleware.ts` aponta pra `https://coopaibi.com.br`,
que hoje resolve pro cPanel. **No instante em que o domínio apontar pra
Vercel, isso vira um laço Vercel→Vercel** e derruba Loja/Vídeos/Ações e os
formulários. Antes da virada, uma das duas:
1. apontar `LEGADO_COOPAIBI` pra um host que continue no cPanel
   (ex.: `antigo.coopaibi.com.br`), ou
2. concluir a integração dessas rotas com o NexCoop e remover o
   encaminhamento.

Some junto o checklist de MX já registrado acima — o e-mail
`contato@coopaibi.com.br` é pra onde os dois formulários mandam.

## Fora de escopo (por enquanto)
- Editor visual arrastar-e-soltar — template com seções ligáveis basta.
- Blog/notícias — avaliar depois do piloto.
- E-commerce público da Loja — outra conversa (grande).

## Relacionados
- docs/PLANO_MODULOS.md (cobrança por módulo/addon)
- Agente `webmaster` (sites bespoke) — passa a ser usado só pra projetos fora
  do template.
