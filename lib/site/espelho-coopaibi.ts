// Decisão de roteamento do espelho da COOPAIBI — parte pura, sem NextRequest.
//
// Isto era um encadeado de `if` dentro do middleware. Foi extraído para cá
// porque é o código que decide **cada URL do site** no momento em que o DNS
// virar: um engano de precedência aqui derruba página em produção, e dentro
// do middleware não havia como testá-lo sem subir servidor.
//
// O middleware continua dono do que é efeito colateral (rewrite, redirect,
// clone de URL); aqui só se responde "para onde vai este caminho?".

export const HOSTS_ESPELHO_COOPAIBI = new Set([
  'coopaibi.com.br',
  'www.coopaibi.com.br',
  'coopaibi-site.vercel.app',
])

export const RAIZ_ESPELHO_COOPAIBI = '/sites/coopaibi'

// Páginas .php JÁ REFEITAS aqui — mapeiam pro arquivo estático equivalente
// em public/sites/coopaibi/. O site original é PHP, então os links internos
// apontam pra .php; refazer uma página era gerar o .html e trazer a entrada
// para este mapa.
export const PHP_REFEITAS_COOPAIBI: Record<string, string> = {
  // Biblioteca — página fora do menu, criada para ter um link a enviar com
  // o PDF do Projeto Cacau que Refloresta. Continua congelada porque a
  // tabela `biblioteca` tem 2 linhas para o MESMO arquivo (cadastro
  // duplicado) e nada além dele: integrar não traria nada.
  //
  // O filtro por categoria (?cat=) e a busca são resolvidos no cliente —
  // ver a correção `biblioteca-filtro-e-busca-sem-php` em correcoes.mjs.
  'biblioteca.php': 'biblioteca.html',
}

// Páginas .php JÁ INTEGRADAS ao banco do NexCoop — vão para uma rota do
// app, que devolve o mesmo HTML do site com os números vindos do Supabase.
export const PHP_INTEGRADAS_COOPAIBI: Record<string, string> = {
  // A home sempre foi quase estática — o index.php tinha uma consulta só,
  // buscando 8 títulos para a faixa. Rota separada (/inicio) porque
  // app/(site-org)/[slug]/page.tsx já serve o TEMPLATE PADRÃO das demais
  // orgs, e route.ts não coexiste com page.tsx no mesmo caminho.
  'index.php': 'inicio',
  // O site original nunca teve index.html, mas `biblioteca.html` e
  // `relatorio-compradores.html` linkam para ele 11 vezes (inclusive
  // index.html#sobre e #sistema). No cPanel isso funcionava por acidente: o
  // Apache resolvia index.html para o DirectoryIndex, que era o index.php.
  // Aqui daria 404 no visitante — mapeado para a mesma rota da home.
  'index.html': 'inicio',
  // Preço do cacau sai de `cotacoes` em vez do cadastro próprio do site,
  // que ficou parado em 24/05/2026 com R$ 14,00/kg enquanto a cooperativa
  // já pagava R$ 18,66.
  'cacau.php': 'cacau',
  // Catálogo sai de `loja_produtos`, o mesmo cadastro do PDV e do estoque.
  'loja.php': 'loja',
  // Notícias saem de `site_conteudos` (tipo 'noticia', migration 095). O
  // ?slug= continua sendo o mesmo parâmetro do site original.
  'noticias.php': 'noticias',
  // Galeria sai de `site_conteudos` (tipo 'video'), com o youtube_id da 095.
  'videos.php': 'videos',
  // Ações é a única sem dado próprio a integrar: `acoes_eventos` está VAZIA
  // no MySQL e o 8º Festival que a página mostra é hardcoded no acoes.php.
  'acoes.php': 'acoes',
}

// Páginas .php que apontam para FORA do site — hoje só o admin antigo.
// O link "INTRANET" do menu ia para o painel PHP do cPanel, onde se
// cadastrava produto, preço e notícia. Esse cadastro passou todo para o
// NexCoop, então o link certo é o painel do NexCoop.
export const PHP_EXTERNO_COOPAIBI: Record<string, string> = {
  'admin/login.php': 'https://nexcoop.com.br/login',
}

// Endpoints .php reimplementados aqui — mapeiam para uma rota do app. A URL
// .php é preservada porque é o que o HTML capturado chama; trocar exigiria
// editar as páginas.
export const PHP_ENDPOINT_INTERNO_COOPAIBI: Record<string, string> = {
  // Formulários: além de enviar o e-mail como o PHP fazia, gravam o lead em
  // `site_leads` (migration 096).
  'enviar-cooperado.php': 'enviar/cooperado',
  'enviar-parceria.php': 'enviar/parceria',
  'enviar-agendamento-cacau.php': 'enviar/agendamento-cacau',
  // Preço internacional do cacau (CC=F), com a mesma resposta JSON do PHP.
  'cacau-preco-bolsa.php': 'cacau-bolsa',
}

/**
 * O caminho RELATIVO à raiz do site, que é como o HTML original referencia
 * tudo ("assets/style.css", "loja.php"). Devolve null quando a requisição não
 * é do espelho — aí o middleware segue o fluxo normal do app.
 *
 * Duas portas de entrada para o mesmo espelho:
 *   1. o domínio próprio (coopaibi.com.br/…) — quando o DNS virar;
 *   2. o caminho direto (/sites/coopaibi/…) — usável desde já, sem DNS.
 */
export function caminhoDoEspelho(hostname: string, pathname: string): string | null {
  if (HOSTS_ESPELHO_COOPAIBI.has(hostname)) return pathname.replace(/^\/+/, '')
  if (pathname.startsWith(`${RAIZ_ESPELHO_COOPAIBI}/`)) {
    return pathname.slice(RAIZ_ESPELHO_COOPAIBI.length + 1)
  }
  return null
}

export type DestinoEspelho =
  | { acao: 'rewrite'; pathname: string }
  | { acao: 'redirect'; url: string; status: 307 }
  | { acao: 'seguir' }

/**
 * Para onde vai um caminho do espelho.
 *
 * A ORDEM importa e é o que estes testes protegem:
 *   1. endpoint reimplementado (POST de formulário — precisa de rewrite);
 *   2. link para fora (Intranet → painel do NexCoop);
 *   3. página integrada ao banco;
 *   4. página congelada (.html);
 *   5. arquivo estático.
 *
 * Integrada ANTES de congelada porque uma página integrada não tem mais .html
 * a servir; se a ordem invertesse, a versão velha voltaria a aparecer.
 */
export function resolverEspelho(caminho: string, ehHostEspelho: boolean): DestinoEspelho {
  const endpoint = PHP_ENDPOINT_INTERNO_COOPAIBI[caminho]
  if (endpoint) return { acao: 'rewrite', pathname: `/coopaibi/${endpoint}` }

  const externo = PHP_EXTERNO_COOPAIBI[caminho]
  if (externo) return { acao: 'redirect', url: externo, status: 307 }

  const integrada = PHP_INTEGRADAS_COOPAIBI[caminho]
  if (integrada) return { acao: 'rewrite', pathname: `/coopaibi/${integrada}` }

  const refeita = PHP_REFEITAS_COOPAIBI[caminho]
  if (refeita) return { acao: 'rewrite', pathname: `${RAIZ_ESPELHO_COOPAIBI}/${refeita}` }

  // No domínio próprio, mapeia pro arquivo estático correspondente. A raiz
  // ("/") vai pra mesma rota que index.php — servir a raiz de um arquivo
  // congelado enquanto /index.php lê do banco deixaria as duas portas da
  // mesma página fora de sincronia.
  if (ehHostEspelho) {
    return {
      acao: 'rewrite',
      pathname: caminho === ''
        ? `/coopaibi/${PHP_INTEGRADAS_COOPAIBI['index.php']}`
        : `${RAIZ_ESPELHO_COOPAIBI}/${caminho}`,
    }
  }

  // Acesso direto por /sites/coopaibi/* — o arquivo estático já está no
  // caminho pedido; segue sem auth (é conteúdo público).
  return { acao: 'seguir' }
}
