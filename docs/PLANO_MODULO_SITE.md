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

| Página | Tabelas MySQL de que depende | Situação |
|---|---|---|
| `index.php` | `noticias` (8 títulos do ticker) | ✅ refeita em 07/08 |
| `noticias.php` | `noticias` | pendente |
| `cacau.php` | `cacau_precos` | pendente |
| `acoes.php` | `acoes_eventos` | pendente |
| `videos.php` | `videos` | pendente |
| `loja.php` | `promocoes`, `categorias`, `produtos` | pendente |

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
