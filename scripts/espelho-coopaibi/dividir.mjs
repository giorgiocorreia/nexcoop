// Divide o HTML capturado de uma página do site da COOPAIBI, separando o
// que é casca fixa do que passa a vir do Supabase.
//
// Um script só para todas as páginas: a lógica de corte é idêntica, só muda
// a lista de âncoras. Cada corte é um par de marcadores literais do HTML
// capturado; o que fica entre eles sai do arquivo e é gerado em runtime por
// lib/site/coopaibi/<pagina>.ts.
//
// Se uma âncora deixar de existir — porque o site original mudou —, o
// script FALHA e não grava nada. O erro tem que aparecer aqui, ao regerar,
// e não meses depois numa página quebrada em produção.
//
// Uso: node dividir.mjs <pagina> <entrada.html> <saida.ts>
//   onde <pagina> é uma chave de CORTES abaixo.
import { readFileSync, writeFileSync } from 'node:fs'

// A faixa de topo é igual em todas as páginas internas: um <div class=
// "ribbon"> com texto fixo, enquanto a home usa "ribbon ribbon-ticker" com
// as notícias rolando. Trocar por ticker em todas foi decisão do Giorgio
// (07/08) — melhoria sobre o site original, possível agora que as notícias
// vivem em site_conteudos. O corte pega da abertura até o primeiro </div>,
// que é o que fecha a faixa.
const CORTE_FAIXA = {
  nome: 'faixa-topo',
  de: '<div class="ribbon">',
  ate: '</div>',
  descricao: 'faixa de topo — passa a rolar com as notícias, como na home',
}

const CORTES = {
  cacau: [
    CORTE_FAIXA,
    {
      nome: 'update-hero',
      de: '<span class="hero-preco-update">',
      ate: '</span>',
      descricao: 'carimbo de data no topo do card de preços',
    },
    {
      nome: 'precos-hero',
      de: '<!-- PREÇO BASE -->',
      ate: '\n              </div>\n    </div>\n  </section>',
      incluirFim: false,
      descricao: 'linhas de preço base e cooperado no card do hero',
    },
    {
      nome: 'update-tabela',
      de: '<p style="font-size:13px;color:var(--muted);margin-bottom:24px">',
      ate: '</p>',
      incluirInicio: false,
      incluirFim: false,
      descricao: 'linha "Atualizado em" da seção de tabela',
    },
    {
      nome: 'linha-preco-base',
      de: '<div class="preco-card-label">Preço Base — Qualquer produtor</div>',
      ate: '</div>\n        <div class="preco-card cooperado">',
      incluirInicio: false,
      incluirFim: false,
      descricao: 'linha de preço + carimbo no card "Preço Base"',
    },
  ],

  loja: [
    CORTE_FAIXA,
    {
      nome: 'valor-busca',
      de: '<input type="text" name="busca" placeholder="Buscar produto..." value="',
      ate: '"',
      incluirInicio: false,
      incluirFim: false,
      descricao: 'texto digitado na busca, devolvido ao campo',
    },
    {
      nome: 'catalogo',
      de: '  <!-- DESTAQUES -->',
      ate: '  <!-- CTA -->',
      incluirFim: false,
      descricao: 'destaques + barra lateral de categorias + grade de produtos',
    },
    {
      nome: 'categorias-rodape',
      de: '<h4>Loja</h4>\n          <ul>',
      ate: '</ul>',
      incluirInicio: false,
      incluirFim: false,
      descricao: 'lista de categorias no rodapé',
    },
  ],

  acoes: [CORTE_FAIXA],

  videos: [
    CORTE_FAIXA,
    {
      nome: 'conteudo',
      // O hero ("Vídeos da COOPAIBI") é texto fixo e fica; o corte começa na
      // seção seguinte, que é toda derivada do cadastro.
      de: '  <section class="section" style="padding:48px 0">',
      ate: '  <!-- MODAL -->',
      incluirFim: false,
      descricao: 'destaque + barra lateral de categorias + busca + grade',
    },
  ],
}

const [pagina, entradaPath, saidaPath] = process.argv.slice(2)
const cortes = CORTES[pagina]
if (!cortes) {
  console.error(`página desconhecida: ${pagina}. Conhecidas: ${Object.keys(CORTES).join(', ')}`)
  process.exit(2)
}

const html = readFileSync(entradaPath, 'utf8')
const partes = []
const removidos = []
let cursor = 0

for (const corte of cortes) {
  const i = html.indexOf(corte.de, cursor)
  if (i === -1) {
    console.error(`ÂNCORA NÃO ENCONTRADA (${pagina}/${corte.nome}): ${JSON.stringify(corte.de.slice(0, 70))}`)
    console.error('O HTML capturado mudou. Reveja os cortes antes de gerar.')
    process.exit(1)
  }
  const inicio = corte.incluirInicio === false ? i + corte.de.length : i
  const j = html.indexOf(corte.ate, inicio)
  if (j === -1) {
    console.error(`FIM NÃO ENCONTRADO (${pagina}/${corte.nome}): ${JSON.stringify(corte.ate.slice(0, 70))}`)
    process.exit(1)
  }
  const fim = corte.incluirFim === false ? j : j + corte.ate.length
  partes.push(html.slice(cursor, inicio))
  removidos.push({ ...corte, texto: html.slice(inicio, fim) })
  cursor = fim
}
partes.push(html.slice(cursor))

const CONSTANTE = pagina.toUpperCase() + '_PARTES'

writeFileSync(
  saidaPath,
  `// GERADO por scripts/espelho-coopaibi/dividir.mjs — não editar à mão.
// Regerar: node scripts/espelho-coopaibi/dividir.mjs ${pagina} <captura.html> <este arquivo>
//
// Casca estática de ${pagina}.php (captura fiel do site em cPanel). Entre um
// pedaço e o outro entra o que lib/site/coopaibi/${pagina}.ts monta com dado
// do Supabase.
//
// Trechos substituídos por dado vivo:
${removidos.map((r) => `//   ${r.nome.padEnd(20)} ${r.descricao}`).join('\n')}

export const ${CONSTANTE}: readonly string[] = [
${partes.map((p) => '  ' + JSON.stringify(p)).join(',\n')},
]
`
)

console.log(`${pagina}: ${partes.length} pedaços, ${removidos.length} trechos removidos`)
for (const r of removidos) {
  const amostra = r.texto.replace(/\s+/g, ' ').trim()
  console.log(`  ${r.nome.padEnd(20)} ${amostra.length > 90 ? amostra.slice(0, 90) + ' […]' : amostra || '(vazio)'}`)
}
