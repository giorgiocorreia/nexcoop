// Gera index.html a partir de index.php resolvendo o ÚNICO trecho dinâmico
// (o ticker de notícias). Nada mais é tocado — o resto do arquivo passa
// byte a byte. O resultado é conferido contra o HTML que o cPanel serve.
import { readFileSync, writeFileSync } from 'node:fs'

const [phpPath, livePath, outPath] = process.argv.slice(2)
const php = readFileSync(phpPath, 'utf8')
const live = readFileSync(livePath, 'utf8')

// 1. Remove o bloco PHP do topo (consulta + fallback), que termina no
//    primeiro "?>" seguido do doctype.
const fimCabecalho = php.indexOf('?>\n')
if (fimCabecalho === -1) throw new Error('cabeçalho PHP não encontrado')
let out = php.slice(fimCabecalho + 3)

// 2. Substitui os dois foreach do ticker pelo que o site realmente renderiza.
//    Pego a região renderizada direto do live, entre as âncoras estáveis —
//    assim o conteúdo das notícias vem do banco de produção, sem eu digitar
//    nada à mão (o que introduziria erro de acentuação/escape).
const ABRE = '<div class="ticker-inner" id="ticker-inner">'
const FECHA = '</div>'

function regiaoTicker(texto) {
  const i = texto.indexOf(ABRE)
  if (i === -1) throw new Error('ticker-inner não encontrado')
  const j = texto.indexOf(FECHA, i + ABRE.length)
  if (j === -1) throw new Error('fechamento do ticker não encontrado')
  return { ini: i + ABRE.length, fim: j }
}

const rLive = regiaoTicker(live)
const conteudoLive = live.slice(rLive.ini, rLive.fim)

const rOut = regiaoTicker(out)
out = out.slice(0, rOut.ini) + conteudoLive + out.slice(rOut.fim)

writeFileSync(outPath, out)

// 3. Relatório de diferença contra o que está no ar.
const igual = out === live
console.log(`gerado : ${out.length} bytes`)
console.log(`no ar  : ${live.length} bytes`)
console.log(igual ? 'RESULTADO: IDÊNTICO ao que está no ar' : 'RESULTADO: DIFERE — detalhes abaixo')

if (!igual) {
  const a = out.split('\n')
  const b = live.split('\n')
  let mostradas = 0
  for (let i = 0; i < Math.max(a.length, b.length) && mostradas < 25; i++) {
    if (a[i] !== b[i]) {
      console.log(`  linha ${i + 1}:`)
      console.log(`    gerado: ${JSON.stringify((a[i] ?? '(fim do arquivo)').slice(0, 120))}`)
      console.log(`    no ar : ${JSON.stringify((b[i] ?? '(fim do arquivo)').slice(0, 120))}`)
      mostradas++
    }
  }
  console.log(`  linhas: gerado=${a.length} noAr=${b.length}`)
}
