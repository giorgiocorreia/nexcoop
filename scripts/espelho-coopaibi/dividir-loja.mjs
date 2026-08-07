// Divide o loja.html capturado, separando o que passa a vir do Supabase
// (tabela `loja_produtos`).
//
// Diferente de cacau.php, esta página tem ESTADO: ?cat= filtra por
// categoria e ?busca= por nome. A captura registra um único estado (sem
// filtro), então não dá para só costurar pedaços — o catálogo inteiro é
// gerado. Por isso o corte do meio é grosso: leva destaques, barra lateral,
// aviso de filtro e grade de produtos de uma vez, que é a região que muda
// junto conforme os parâmetros.
//
// Uso: node dividir-loja.mjs <loja.html> <saida.ts>
import { readFileSync, writeFileSync } from 'node:fs'

const [entradaPath, saidaPath] = process.argv.slice(2)
const html = readFileSync(entradaPath, 'utf8')

const CORTES = [
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
]

const partes = []
const removidos = []
let cursor = 0

for (const corte of CORTES) {
  const i = html.indexOf(corte.de, cursor)
  if (i === -1) {
    console.error(`ÂNCORA NÃO ENCONTRADA (${corte.nome}): ${JSON.stringify(corte.de.slice(0, 70))}`)
    console.error('O HTML capturado mudou. Reveja os cortes antes de gerar.')
    process.exit(1)
  }
  const inicio = corte.incluirInicio === false ? i + corte.de.length : i
  const j = html.indexOf(corte.ate, inicio)
  if (j === -1) {
    console.error(`FIM NÃO ENCONTRADO (${corte.nome}): ${JSON.stringify(corte.ate.slice(0, 70))}`)
    process.exit(1)
  }
  const fim = corte.incluirFim === false ? j : j + corte.ate.length

  partes.push(html.slice(cursor, inicio))
  removidos.push({ nome: corte.nome, texto: html.slice(inicio, fim), descricao: corte.descricao })
  cursor = fim
}
partes.push(html.slice(cursor))

const cabecalho = `// GERADO por scripts/espelho-coopaibi/dividir-loja.mjs — não editar à mão.
//
// Pedaços estáticos do loja.html (captura fiel do site em cPanel). Entre um
// pedaço e o outro entra o catálogo montado a partir de \`loja_produtos\` no
// Supabase — o cadastro de verdade da Loja, com 27 produtos, contra o único
// produto que vivia no MySQL próprio do site.
//
// Trechos substituídos por dado vivo:
${removidos.map((r) => `//   ${r.nome.padEnd(20)} ${r.descricao}`).join('\n')}
`

writeFileSync(
  saidaPath,
  cabecalho +
    '\nexport const LOJA_PARTES: readonly string[] = [\n' +
    partes.map((p) => '  ' + JSON.stringify(p)).join(',\n') +
    ',\n]\n'
)

console.log(`pedaços estáticos : ${partes.length}`)
for (const r of removidos) {
  const amostra = r.texto.replace(/\s+/g, ' ').trim()
  console.log(`\n--- ${r.nome} (${r.descricao}) ---`)
  console.log('  ' + (amostra.length > 200 ? amostra.slice(0, 200) + ' […]' : amostra || '(vazio)'))
}
console.log(`\ngravado: ${saidaPath}`)
