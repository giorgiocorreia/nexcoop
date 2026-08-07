// Aplica as correções de correcoes.mjs às páginas do espelho que são
// servidas como arquivo estático (cooperado, parceiro, relatório,
// homens-de-barro) — as que não passam por um montador em runtime.
//
// Rodar depois de (re)capturar qualquer uma delas com gerar-pagina.mjs. É
// idempotente: aplicar duas vezes não muda nada, porque as correções
// procuram o padrão defeituoso, que some na primeira passada.
//
// Uso: node corrigir-estaticos.mjs [arquivo.html ...]
//      sem argumentos, corrige todos os .html de public/sites/coopaibi/
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { aplicarCorrecoes } from './correcoes.mjs'

const RAIZ = 'public/sites/coopaibi'

const alvos = process.argv.slice(2).length
  ? process.argv.slice(2)
  : readdirSync(RAIZ)
      .filter((f) => f.endsWith('.html'))
      .map((f) => join(RAIZ, f))

let tocados = 0
for (const caminho of alvos) {
  const original = readFileSync(caminho, 'utf8')
  // O nome do arquivo vira a chave de página, para respeitar `excetoEm`.
  const pagina = caminho.split(/[\\/]/).pop().replace(/\.html$/, '')
  const { html, aplicadas } = aplicarCorrecoes(original, pagina)
  if (html === original) {
    console.log(`  ${pagina.padEnd(26)} nada a corrigir`)
    continue
  }
  writeFileSync(caminho, html)
  tocados++
  console.log(`  ${pagina.padEnd(26)} ${aplicadas.join(', ')}`)
}
console.log(`\n${tocados} arquivo(s) alterado(s) de ${alvos.length}`)
