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

## Fora de escopo (por enquanto)
- Editor visual arrastar-e-soltar — template com seções ligáveis basta.
- Blog/notícias — avaliar depois do piloto.
- E-commerce público da Loja — outra conversa (grande).

## Relacionados
- docs/PLANO_MODULOS.md (cobrança por módulo/addon)
- Agente `webmaster` (sites bespoke) — passa a ser usado só pra projetos fora
  do template.
