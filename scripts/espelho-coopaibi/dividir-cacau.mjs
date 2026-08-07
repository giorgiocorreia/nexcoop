// Divide o cacau.html capturado nos pedaços que ficam estáticos, separando
// os trechos que passam a vir do Supabase (tabela `cotacoes`).
//
// Por que dividir em build em vez de recortar em runtime: se um ponto de
// corte deixar de existir — porque o site original mudou —, o erro tem que
// aparecer aqui, ao regerar, e não dentro de um Server Component em
// produção. Este script falha alto; a página só monta pedaços prontos.
//
// Uso: node dividir-cacau.mjs <cacau.html> <saida.ts>
import { readFileSync, writeFileSync } from 'node:fs'

const [entradaPath, saidaPath] = process.argv.slice(2)

// O documento é mantido INTEIRO, de <!DOCTYPE> a </html>.
//
// A página é entregue por um Route Handler que devolve text/html, não por
// um componente React. O motivo é concreto: cacau.php traz seis blocos de
// <script> (ticker e gráfico do TradingView, o fetch do preço internacional
// da bolsa, os menus dropdown e o Google Translate), e script inserido via
// dangerouslySetInnerHTML não executa — é regra do navegador para innerHTML.
// Renderizar como JSX derrubaria as cinco funcionalidades de uma vez e
// exigiria reimplementar todas, em cada página. Devolvendo o documento, o
// navegador analisa HTML de verdade e os scripts rodam como sempre rodaram.
const html = readFileSync(entradaPath, 'utf8')

// Cada corte remove um trecho que virou dado vivo. `de`/`ate` são âncoras
// literais do HTML capturado; `ate` é incluído no trecho removido.
const CORTES = [
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
]

const partes = []
let cursor = 0
const removidos = []

for (const corte of CORTES) {
  const i = html.indexOf(corte.de, cursor)
  if (i === -1) {
    console.error(`ÂNCORA NÃO ENCONTRADA (${corte.nome}): ${corte.de.slice(0, 60)}`)
    console.error('O HTML capturado mudou. Reveja os cortes antes de gerar.')
    process.exit(1)
  }
  const inicio = corte.incluirInicio === false ? i + corte.de.length : i
  const j = html.indexOf(corte.ate, inicio)
  if (j === -1) {
    console.error(`FIM NÃO ENCONTRADO (${corte.nome}): ${corte.ate.slice(0, 60)}`)
    process.exit(1)
  }
  const fim = corte.incluirFim === false ? j : j + corte.ate.length

  partes.push(html.slice(cursor, inicio))
  removidos.push({ nome: corte.nome, texto: html.slice(inicio, fim), descricao: corte.descricao })
  cursor = fim
}
partes.push(html.slice(cursor))

const cabecalho = `// GERADO por scripts/espelho-coopaibi/dividir-cacau.mjs — não editar à mão.
//
// Pedaços estáticos do cacau.html (captura fiel do site em cPanel). Entre um
// pedaço e o outro entram os componentes que leem \`cotacoes\` no Supabase:
// o site antigo tinha o preço num cadastro próprio, que ficou parado em
// 24/05/2026 enquanto a cooperativa já praticava outro valor.
//
// Trechos substituídos por dado vivo:
${removidos.map((r) => `//   ${r.nome.padEnd(18)} ${r.descricao}`).join('\n')}
`

const corpo =
  cabecalho +
  '\nexport const CACAU_PARTES: readonly string[] = [\n' +
  partes.map((p) => '  ' + JSON.stringify(p)).join(',\n') +
  ',\n]\n'

writeFileSync(saidaPath, corpo)

console.log(`pedaços estáticos : ${partes.length}`)
console.log(`trechos removidos : ${removidos.length}`)
for (const r of removidos) {
  const amostra = r.texto.replace(/\s+/g, ' ').trim()
  console.log(`\n--- ${r.nome} (${r.descricao}) ---`)
  console.log('  ' + (amostra.length > 220 ? amostra.slice(0, 220) + ' […]' : amostra))
}
console.log(`\ngravado: ${saidaPath}`)
