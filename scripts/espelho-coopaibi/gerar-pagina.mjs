// Gera o .html de uma página .php do site da COOPAIBI para o espelho.
//
// PHP não roda na Vercel, então cada página precisa virar HTML. O conteúdo
// tem que ser o que o visitante realmente vê — inclusive as linhas que vêm
// do MySQL (produtos, vídeos, eventos, preços), que não estão em arquivo
// nenhum. Por isso a saída vem do que o cPanel serve.
//
// Capturar às cegas seria arriscado: se o .php no servidor divergisse do
// que temos local, ninguém perceberia — foi exatamente esse tipo de engano
// que fez a primeira versão do espelho sair com o site de maio. Então antes
// de aceitar a captura o script confere que todo bloco de texto obrigatório
// do fonte local aparece no que veio do ar. Se algum não aparecer, o fonte
// está defasado e o script falha em vez de gravar algo silenciosamente
// errado.
//
// Uso:
//   node gerar-pagina.mjs <fonte.php> <url> <saida.html>
import { readFileSync, writeFileSync } from 'node:fs'

const [fontePath, url, saidaPath] = process.argv.slice(2)
if (!fontePath || !url || !saidaPath) {
  console.error('uso: node gerar-pagina.mjs <fonte.php> <url> <saida.html>')
  process.exit(2)
}

const php = readFileSync(fontePath, 'utf8')

const resposta = await fetch(url)
if (!resposta.ok) {
  console.error(`falha ao buscar ${url}: HTTP ${resposta.status}`)
  process.exit(1)
}
const vivo = Buffer.from(await resposta.arrayBuffer())
const vivoTexto = vivo.toString('utf8')

// Separa o que SEMPRE sai do que sai só às vezes. Texto dentro de
// if/foreach é condicional: o corpo de `<?php if ($msg_ok): ?>` só aparece
// quando o formulário redireciona com ?agendamento=ok, então cobrá-lo de
// uma captura normal acusaria defasagem onde não há. Só o texto em
// profundidade zero — fora de qualquer bloco — é obrigatório.
const ABRE = /\b(if|foreach|for|while|switch)\s*[\s(]/
const FECHA = /\b(endif|endforeach|endfor|endwhile|endswitch)\b/

function extrairBlocos(fonte) {
  const partes = fonte.split(/(<\?(?:php|=)[\s\S]*?\?>)/g)
  let profundidade = 0
  const sempre = []
  const condicional = []
  for (const parte of partes) {
    if (!parte) continue
    if (parte.startsWith('<?')) {
      if (FECHA.test(parte)) profundidade = Math.max(0, profundidade - 1)
      else if (ABRE.test(parte)) profundidade++
      continue
    }
    for (const m of parte.matchAll(/>([^<>][^<>]{39,159})</g)) {
      const t = m[1].trim()
      if (t.length < 40) continue
      if (profundidade === 0) sempre.push(t)
      else condicional.push(t)
    }
  }
  return { sempre, condicional }
}

const { sempre: blocos, condicional } = extrairBlocos(php)
const ausentes = blocos.filter((b) => !vivoTexto.includes(b))
const condAusentes = condicional.filter((b) => !vivoTexto.includes(b))

console.log(`fonte : ${fontePath}`)
console.log(`url   : ${url}`)
console.log(`blocos obrigatórios : ${blocos.length}  ausentes: ${ausentes.length}`)
console.log(`blocos condicionais : ${condicional.length}  não renderizados nesta captura: ${condAusentes.length}`)

if (ausentes.length) {
  console.error('\nO fonte local NÃO corresponde ao que está publicado.')
  console.error('Trechos que existem no fonte e não no ar:')
  for (const a of ausentes.slice(0, 10)) console.error(`  - ${a.slice(0, 110)}`)
  console.error('\nNada foi gravado. Buscar o .php atual no cPanel antes de seguir.')
  process.exit(1)
}

writeFileSync(saidaPath, vivo)
console.log(`\ngravado: ${saidaPath} (${vivo.length} bytes)`)

// Inventário do que ficou congelado — é a lista do que ligar no banco do
// NexCoop quando esta página deixar de ser espelho e virar módulo.
const consultas = [
  ...new Set(
    // Sem /i e exigindo FROM/INTO/SET: senão `update` de CSS e
    // `querySelectorAll` de JS entram na lista e afogam a consulta real.
    [...php.matchAll(/\b(?:SELECT|INSERT|UPDATE|DELETE)\b[\s\S]{0,110}/g)]
      .map((m) => m[0].replace(/\s+/g, ' ').trim())
      .filter((s) => /\b(FROM|INTO|SET)\b/.test(s))
  ),
]
if (consultas.length) {
  console.log('\nconsultas SQL desta página (o que ligar no banco depois):')
  for (const c of consultas) console.log(`  ${c.slice(0, 100)}`)
}

// Chamadas que a página faz em runtime e que precisam continuar existindo:
// vão pro PHP_ENDPOINT_COOPAIBI do middleware (proxy pro cPanel).
const endpoints = [
  ...new Set([
    ...[...php.matchAll(/fetch\(['"]([^'"]+\.php)['"]/g)].map((m) => m[1]),
    ...[...php.matchAll(/action="([^"]+\.php)"/g)].map((m) => m[1]),
  ]),
]
if (endpoints.length) {
  console.log('\nendpoints .php chamados por esta página (precisam de proxy):')
  for (const e of endpoints) console.log(`  ${e}`)
}

// Trechos que dependem da data do servidor congelam na captura.
const datas = [...php.matchAll(/<\?=\s*date\([^)]*\)[^?]*\?>/g)].map((m) => m[0])
if (datas.length) {
  console.log(`\n⚠ ${datas.length} trecho(s) com date() do servidor — congelam nesta captura:`)
  for (const d of datas) console.log(`  ${d.replace(/\s+/g, ' ')}`)
}
