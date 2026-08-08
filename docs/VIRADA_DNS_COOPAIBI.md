# Virada de DNS — coopaibi.com.br

> Roteiro para tirar o site do cPanel e servi-lo pela Vercel, **mantendo o
> e-mail onde está** (decisão do Giorgio, 08/08/2026).
> Estado do código em 08/08/2026: **pronto**. O que falta é infraestrutura.

---

## 1. Decisão que molda tudo

**O e-mail continua no cPanel.** Só o site vai para a Vercel. Isso significa
que a zona de DNS passa a ser mista: os registros de web apontam para a
Vercel, os de e-mail continuam apontando para a hospedagem.

Consequência prática: **a hospedagem do cPanel continua ativa e paga.** Se um
dia ela for cancelada, o e-mail precisa migrar antes (Zoho, Google Workspace).

---

## 2. Pré-requisitos (fazer ANTES de mexer na zona)

| # | Item | Como conferir | Estado |
|---|------|----------------|--------|
| 1 | Domínio adicionado ao projeto na Vercel | Painel do projeto → Domains → `coopaibi.com.br` e `www` | **pendente** |
| 2 | `SMTP_USER` / `SMTP_PASS` / `SMTP_HOST` no ambiente de produção | Painel da Vercel → Settings → Environment Variables | **pendente** |
| 3 | Formulários e endpoints respondendo | `npm run dev` + `npm run teste:formularios` | ✅ 26/26 em 08/08/2026 |
| 4 | Todo link do site antigo coberto | `npm run teste:cobertura` | ✅ 43/43 em 08/08/2026 |
| 5 | Conteúdo migrado | notícias e vídeos conferidos contra o cPanel | ✅ 1 notícia + 3 vídeos, nada faltando |

### Sobre o item 2 — o silêncio que engana

O código grava o lead **antes** de tentar o e-mail, e trata falha de SMTP como
não-fatal (o interessado não é mandado preencher de novo). Ou seja: **sem as
variáveis de SMTP, os formulários continuam “funcionando” e ninguém recebe
aviso nenhum.** O lead aparece em `/site/leads`, mas a caixa de
`contato@coopaibi.com.br` fica muda. Confira antes, não depois.

---

## 3. Registros de DNS

### Mudam (web → Vercel)

| Tipo | Nome | Valor |
|------|------|-------|
| A | `@` | IP que a Vercel indicar no painel |
| CNAME | `www` | destino que a Vercel indicar |

### NÃO PODEM SER TOCADOS (e-mail → cPanel)

| Tipo | Nome | Por quê |
|------|------|---------|
| MX | `@` | entrega de e-mail |
| **A** | **`mail`** | **o detalhe que quebra na prática — veja abaixo** |
| TXT | `@` (SPF) | senão o e-mail enviado cai em spam |
| TXT/CNAME | DKIM, DMARC | idem |
| CNAME/A | `autodiscover`, `autoconfig`, `webmail`, `cpanel` | configuração automática de cliente de e-mail |

> **A armadilha:** se o MX aponta para `mail.coopaibi.com.br` e esse nome
> **não tem um registro A próprio**, muitas zonas de cPanel o resolvem
> herdando o A do domínio raiz. No instante em que a raiz passar a apontar
> para a Vercel, o MX passa a apontar para a Vercel também e o e-mail para de
> entrar — mesmo com o MX “correto” na tela. **Confirme que existe
> `A mail.coopaibi.com.br → <IP do cPanel>` explícito antes de virar.**

**Nunca “limpe a zona e recrie só o que a Vercel pede”.** É assim que o e-mail
morre.

---

## 4. O que muda para quem usa

- `coopaibi.com.br/webmail` **deixa de funcionar** — passa a cair no Next, que
  não conhece a rota. O acesso vira `mail.coopaibi.com.br/webmail` ou o
  hostname do servidor. **Avise quem usa antes**, senão vira “o e-mail sumiu”.
- O link INTRANET do menu já aponta para `https://nexcoop.com.br/login`
  (`PHP_EXTERNO_COOPAIBI` no middleware) — o admin PHP antigo não alimenta
  mais nada.

---

## 5. Como testar antes de virar

Todo o site já é servível **sem DNS**, pelo caminho direto:

```
http://localhost:3000/sites/coopaibi/index.php
npm run dev
npm run teste:cobertura      # 43 caminhos do site antigo
npm run teste:formularios    # 3 formulários + bolsa, com limpeza
```

Em produção, o mesmo vale por `https://nexcoop.com.br/sites/coopaibi/…` e pelo
host `coopaibi-site.vercel.app`, ambos já mapeados em
`HOSTS_ESPELHO_COOPAIBI`.

---

## 6. Depois de virar

1. Repetir `teste:cobertura` com `BASE_URL=https://coopaibi.com.br`.
2. Mandar um e-mail de fora para `contato@coopaibi.com.br` e confirmar que
   chega — é o teste que importa.
3. Preencher um formulário de verdade e conferir os dois lados: o lead em
   `/site/leads` e o aviso na caixa de entrada.
4. Conferir o certificado (a Vercel emite sozinha, mas leva alguns minutos).

## 7. Como reverter

Apontar o A de `@` e o CNAME de `www` de volta para o IP do cPanel. Como os
arquivos PHP **continuam lá** (a hospedagem segue ativa por causa do e-mail),
o site antigo volta a servir sozinho. Propagação: minutos a algumas horas,
conforme o TTL — **baixe o TTL para 300s um dia antes da virada**, é o que
torna a reversão rápida.

---

## 8. Estado do código (08/08/2026)

- Nenhuma rota depende do cPanel. `LEGADO_COOPAIBI`,
  `PHP_NAVEGACAO_COOPAIBI` e `PHP_ENDPOINT_COOPAIBI` foram removidos do
  middleware (commit `92d81ab`) — não existe mais laço possível.
- 6 páginas servidas do banco (`index`, `cacau`, `loja`, `noticias`,
  `videos`, `acoes`), 3 congeladas (`biblioteca`, `cooperado`, `parceiro`,
  `relatorio-compradores`), 4 endpoints reimplementados.
- `index.html` foi mapeado para a home: as páginas congeladas linkam para ele
  11 vezes e no cPanel isso funcionava por acidente (DirectoryIndex do
  Apache). Sem o mapeamento, seriam 404 depois da virada.
