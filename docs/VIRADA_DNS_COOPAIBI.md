# Virada de DNS — coopaibi.com.br

> Roteiro para tirar o site do cPanel e servi-lo pela Vercel, **mantendo o
> e-mail onde está** (decisão do Giorgio, 08/08/2026).
>
> **Estado em 08/08/2026, fim da tarde:** `www.coopaibi.com.br` **já está no ar
> pela Vercel**. O apex (`coopaibi.com.br`) continua no cPanel, e o e-mail
> nunca foi tocado. Falta a Etapa A (desacoplar o e-mail da raiz) e a Etapa B
> (apex → Vercel).

---

## 1. Decisão que molda tudo

**O e-mail continua no cPanel.** Só o site vai para a Vercel. Isso significa
que a zona de DNS passa a ser mista: os registros de web apontam para a
Vercel, os de e-mail continuam apontando para a hospedagem.

Consequência prática: **a hospedagem do cPanel continua ativa e paga.** Se um
dia ela for cancelada, o e-mail precisa migrar antes (Zoho, Google Workspace)
— e o mesmo cancelamento levaria junto o `anpc.coopaibi.com.br` (§ 8).

---

## 2. A zona real, inspecionada

Levantada em 08/08/2026 direto do Zone Editor e conferida no autoritativo. Não
trabalhar de memória nem do que "deveria" estar lá — foi exatamente aqui que
apareceu a armadilha.

- IP do cPanel: **`198.136.59.208`**
- Nameservers: `ns1.websiteserver.com.br`, `ns2.websiteserver.com.br`
- 25 registros na zona do domínio principal

### Como estava antes de qualquer mudança

| Tipo | Nome | Valor |
|------|------|-------|
| A | `coopaibi.com.br` | `198.136.59.208` |
| **MX** | `coopaibi.com.br` | **`coopaibi.com.br`** (prio 0) |
| CNAME | `mail` | `coopaibi.com.br` |
| CNAME | `www` | `coopaibi.com.br` |
| TXT | `coopaibi.com.br` | `v=spf1 +a +mx +ip4:198.136.59.208 ~all` |
| TXT | `default._domainkey` | DKIM |
| A | `webmail`, `cpanel`, `whm`, `ftp`, `webdisk`, `cpcontacts`, `cpcalendars` | `198.136.59.208` |

Não existe DMARC. Não existe `autodiscover` nem `autoconfig`.

### A armadilha, na pior forma possível

O `MX` apontava **literalmente para o nome raiz**, e `mail` era CNAME para a
raiz. Ou seja: no segundo em que o `A` de `@` virasse para a Vercel, o correio
passaria a ser entregue à Vercel e **o e-mail pararia de entrar** — sem
nenhuma mensagem de erro, com o MX "certo" na tela.

Isto é o que divide a virada em duas etapas separadas por dias.

### O que sobrevive sozinho

`webmail`, `cpanel`, `whm`, `ftp`, `webdisk`, `cpcontacts` e `cpcalendars` têm
**registro A próprio** e continuam apontando para o cPanel depois de qualquer
mudança no apex. Só `mail` e `www` estavam pendurados na raiz.

O SPF sobrevive porque tem `+ip4:198.136.59.208` **explícito** — o `+a` vai
passar a resolver para a Vercel depois da Etapa B, e isso não quebra nada,
apenas amplia. DKIM é TXT e não depende de host nenhum.

---

## 3. As três etapas

### Atalho do `www` — ✅ FEITO em 08/08/2026

`www` **não participa de e-mail em ponto nenhum**: o MX aponta para o apex, o
SPF usa `+a +mx +ip4` e o DKIM é um TXT. Então o `www` pode ir para a Vercel
com risco zero para o correio, antes e independentemente de tudo o mais.

Foi o que se fez:

1. TTL para `300` em `A @`, `MX` e `CNAME www` (14:10). O TTL antigo era 14400
   — esperar 4h antes de contar com reversão rápida.
2. `www.coopaibi.com.br` adicionado ao projeto `nexcoop` na Vercel, **sem** o
   apex (§ 6).
3. `CNAME www` → `5b328772c23cda34.vercel-dns-017.com.`

Resultado: `www.coopaibi.com.br` serve o site novo (`Server: Vercel`,
certificado emitido automaticamente), enquanto `coopaibi.com.br` continua
servindo o site antigo do cPanel. **Conviver com os dois por alguns dias é
esperado, não é bug.**

### Etapa A — desacoplar o e-mail da raiz (pendente)

Não toca em web. Valida-se sozinha.

1. `mail` deixa de ser CNAME e vira **`A mail → 198.136.59.208`**, TTL 300.
   Tem que ser A: **MX não pode apontar para CNAME** (RFC 2181 § 10.3).
2. `MX @` deixa de ser `coopaibi.com.br` e passa a ser
   **`mail.coopaibi.com.br`**, prioridade 0, TTL 300.
3. **Mandar um e-mail de fora** (Gmail pessoal) para `contato@coopaibi.com.br`
   e confirmar que chega. É esse e-mail que autoriza a Etapa B.

Sem o passo 2 o passo 1 não protege nada — o MX continua colado na raiz.

Reversão: MX volta para `coopaibi.com.br`. O site ainda está inteiro no
cPanel nesta etapa, então não há risco para o site.

### Etapa B — apex para a Vercel (pendente)

**Só depois do e-mail de teste ter chegado pelo caminho novo.** Aponta-se o
`A @` para o que a Vercel indicar, e adiciona-se `coopaibi.com.br` ao projeto.

---

## 4. Registros que NÃO PODEM SER TOCADOS

| Tipo | Nome | Por quê |
|------|------|---------|
| MX | `@` | entrega de e-mail (na Etapa A ele muda de valor — de forma controlada) |
| A | `mail` | é o que o MX vai resolver |
| TXT | `@` (SPF) | senão o e-mail enviado cai em spam |
| TXT | `default._domainkey` (DKIM) | idem |
| A | `webmail`, `cpanel`, `whm`, `ftp`, `webdisk`, `cpcontacts`, `cpcalendars` | acesso e configuração automática de cliente |

**Nunca "limpe a zona e recrie só o que a Vercel pede".** É assim que o e-mail
morre. No Zone Editor do cPanel isso mora no menu **"Ações"** e na engrenagem
(*Reset Zone*) — não usar.

---

## 5. O incidente do `mail`, e a lição

Em 08/08/2026, ao trocar o CNAME do `www`, o registro editado por engano foi o
do **`mail`**, que apontou para a Vercel por alguns minutos antes de ser
revertido.

**O e-mail não parou de chegar** — o MX apontava para o apex, e a entrega
nunca passa por `mail`. O que quebra nesse estado é outra coisa: cliente de
e-mail (Outlook, celular) configurado com servidor `mail.coopaibi.com.br`
perde a conexão.

A parte que importa é a consequência de segunda ordem: **o valor errado foi
publicado com TTL 14400**, porque o `mail` não estava na lista de registros
que tiveram o TTL baixado. Por até 4 horas pode haver resolvedores com
`mail.coopaibi.com.br` → Vercel em cache, e não há como forçá-los a esquecer.

Enquanto esse cache puder existir, **o MX não pode apontar para `mail`**: um
resolvedor com o cache envenenado entregaria o e-mail à Vercel, e aí sim ele
se perde. Por isso a Etapa A ficou para depois das 19h daquele dia.

**Lição para a próxima:** baixar o TTL de **todos** os registros que serão
tocados, inclusive os que serão apagados e recriados. Custa nada e é o que
transforma um erro de clique em cinco minutos de estrago em vez de quatro
horas.

---

## 6. Cuidados na Vercel

Projeto: **`nexcoop`** (`prj_gQZWZIJL0xgOktlIv2K7frlIaTxX`), time
`giorgio-correia-s-projects`. É o mesmo projeto para tudo — o produto é
multi-tenant.

- A tela certa é a **do projeto**:
  `vercel.com/giorgio-correia-s-projects/nexcoop/settings/domains`. A URL com
  `~` no lugar do nome (`/~/domains`, `/~/settings/environment-variables`) é a
  visão **da conta**, mistura todos os projetos e não serve para vincular
  domínio nem para conferir variável. Confundir as duas já levou à conclusão
  errada de que o SMTP não estava configurado.
- Ao adicionar o domínio, **desmarcar "Redirect apex domains to www
  (recommended)"**. Marcado, ele traz o apex para o projeto junto — e o apex
  tem que ficar fora até a Etapa B.
- "Invalid Configuration" logo após adicionar é o estado correto: some quando
  o DNS aponta.

### SMTP: já está configurado

`SMTP_USER`, `SMTP_PASS` e `SMTP_HOST` estão em **Production desde 27/07/2026**.
Versões anteriores deste documento os listavam como pendentes — estava errado.
**Não mexer neles.**

Vale entender o que eles são e o que não são:

- São a conta que **envia**. `lib/email.ts` é global: o mesmo transporte manda
  o aviso de lead do site, a NF-e/ZIP ao comprador (`lib/comercializacao/
  zip-lote.ts`) e a CC-e (`cce-email.ts`). Trocar a conta ali muda o remetente
  de tudo isso junto.
- **Não têm nenhuma relação com a caixa `contato@coopaibi.com.br` receber.**
  Quem decide recebimento é o MX. São dois riscos diferentes e não se
  misturam.
- O destinatário do aviso de lead não vem de variável: é `org.email`, com
  fallback `contato@coopaibi.com.br`
  (`app/(site-org)/[slug]/enviar/[tipo]/route.ts`).

Se um dia faltarem: sem `SMTP_USER`/`SMTP_PASS` o `smtpConfigured()` é falso, o
lead é gravado e **ninguém recebe aviso nenhum, em silêncio** — a falha de
e-mail é tratada como não-fatal de propósito, para não mandar o interessado
preencher de novo.

---

## 7. Como testar

```bash
npm run dev
npm test                      # 87 testes, unitários
npm run teste:cobertura       # 43 caminhos do site antigo
npm run teste:formularios     # 3 formulários + bolsa, com limpeza
```

Contra o domínio real ou o endereço de trabalho:

```bash
BASE_URL=https://www.coopaibi.com.br     node scripts/teste-cobertura-espelho.mjs
BASE_URL=https://coopaibi-site.vercel.app node scripts/teste-cobertura-espelho.mjs
```

`coopaibi-site.vercel.app` e `www.coopaibi.com.br` estão em
`HOSTS_ESPELHO_COOPAIBI` (`lib/site/espelho-coopaibi.ts`), junto com o apex.

### Rodar contra localhost esconde falha de rewrite

Em `localhost:3000/sites/coopaibi/...` o arquivo é servido direto de `public/`
e não depende de rewrite nenhum. Pelo **host próprio**, quem resolve arquivo
com extensão de imagem é o rewrite do `next.config.mjs` — porque o matcher do
middleware pula essas requisições.

Foi assim que passou despercebido que `/img/*` e `/uploads/*` davam **404 no
domínio próprio** (o rewrite cobria só `/assets/*`): localhost dava 43/43 e o
domínio real, 41/43. Corrigido em `367b73b`; hoje são **43/43 pelo host
próprio**.

**Ao mexer no espelho, rode a cobertura contra o host próprio, não contra
localhost.**

---

## 8. O que muda para quem usa

- **`webmail.coopaibi.com.br` continua funcionando** — tem A próprio. (Versões
  anteriores deste documento diziam o contrário.) O que deixa de responder é
  **`coopaibi.com.br/webmail`**, o caminho no domínio raiz, que depois da
  Etapa B cai no Next e não existe. Avisar quem usa esse caminho.
- O link INTRANET do menu já aponta para `https://nexcoop.com.br/login`
  (`PHP_EXTERNO_COOPAIBI` no middleware) — o admin PHP antigo não alimenta
  mais nada.
- Enquanto só o `www` estiver virado, os botões de compartilhar da página de
  vídeos geram link para o apex (`lib/site/coopaibi/videos.ts`), ou seja, para
  o site antigo. Cosmético, resolve-se sozinho na Etapa B.
- **`anpc.coopaibi.com.br`** é um site antigo, desativado, com zona própria
  completa e A próprio: **não é afetado pela virada** e continua servindo do
  cPanel. Não precisa de tratamento nenhum aqui.

---

## 9. Depois de virar o apex (Etapa B)

1. `BASE_URL=https://coopaibi.com.br npm run teste:cobertura`.
2. Mandar um e-mail de fora para `contato@coopaibi.com.br` e confirmar que
   chega — é o teste que importa.
3. Preencher um formulário de verdade e conferir os dois lados: o lead em
   `/site/leads` e o aviso na caixa de entrada.
4. Conferir o certificado (a Vercel emite sozinha, leva alguns minutos).

## 10. Como reverter

- **`www`:** destino do CNAME volta para `coopaibi.com.br`. ~5 minutos.
- **Etapa A:** MX volta para `coopaibi.com.br`.
- **Etapa B:** `A @` volta para `198.136.59.208`. Como os arquivos PHP
  continuam no cPanel (a hospedagem segue ativa por causa do e-mail), o site
  antigo volta a servir sozinho.

Propagação conforme o TTL — por isso **baixar o TTL para 300s antes de cada
mudança**, em todos os registros envolvidos.

---

## 11. Estado do código

- Nenhuma rota depende do cPanel. `LEGADO_COOPAIBI`, `PHP_NAVEGACAO_COOPAIBI`
  e `PHP_ENDPOINT_COOPAIBI` foram removidos do middleware (`92d81ab`) — não
  existe mais laço possível.
- A decisão de rota do espelho vive em `lib/site/espelho-coopaibi.ts`, sob
  teste (`6a87e77`); o middleware ficou só com o efeito colateral.
- **6 páginas servidas do banco** (`inicio`, `cacau`, `loja`, `noticias`,
  `videos`, `acoes`) — 7 entradas em `PHP_INTEGRADAS_COOPAIBI`, porque
  `index.php` e `index.html` caem na mesma rota.
- **1 página .php congelada**: `biblioteca.php` → `biblioteca.html` (a tabela
  `biblioteca` tem 2 linhas para o mesmo arquivo; integrar não traria nada).
- **5 arquivos .html servidos como estático**, sem passar por mapa:
  `biblioteca`, `cooperado`, `parceiro`, `relatorio-compradores`,
  `homens-de-barro`.
- **4 endpoints reimplementados**: os três formulários (`enviar-cooperado`,
  `enviar-parceria`, `enviar-agendamento-cacau`) e `cacau-preco-bolsa`.
- 1 link externo: `admin/login.php` → `https://nexcoop.com.br/login`.
- `index.html` mapeado para a home: as páginas congeladas linkam para ele 11
  vezes e no cPanel isso funcionava por acidente (DirectoryIndex do Apache).
- Rewrite de `/assets/*`, `/img/*` e `/uploads/*` no `next.config.mjs` cobre o
  vão do matcher do middleware nos hosts da COOPAIBI (§ 7).
