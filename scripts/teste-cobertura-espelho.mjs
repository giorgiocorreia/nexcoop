// Cobertura do espelho: todo link interno que o site antigo publica responde
// no NexCoop? É a pergunta que decide se o DNS pode virar — depois da virada,
// um caminho não mapeado vira 404 para o visitante.
//
// Percorre as páginas do site antigo (ou os HTMLs congelados, se o cPanel não
// responder), coleta os links internos e bate cada um contra o servidor local.
//
// Uso: node scripts/teste-cobertura-espelho.mjs
//      BASE_URL=http://localhost:3000/sites/coopaibi node scripts/...

const BASE = process.env.BASE_URL ?? 'http://localhost:3000/sites/coopaibi'
const ANTIGO = 'https://coopaibi.com.br'

// Páginas de entrada — o menu do site cobre todas as demais por link interno.
const SEMENTES = ['index.php', 'cacau.php', 'loja.php', 'noticias.php', 'videos.php', 'acoes.php', 'biblioteca.php']

async function baixar(url) {
  try {
    const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(20000) })
    return r.ok ? await r.text() : null
  } catch { return null }
}

const links = new Set(SEMENTES)

for (const pagina of SEMENTES) {
  // Prefere o site antigo (fonte da verdade do que está publicado); cai para
  // o nosso espelho se o cPanel não responder.
  const html = (await baixar(`${ANTIGO}/${pagina}`)) ?? (await baixar(`${BASE}/${pagina}`))
  if (!html) { console.log(`! não consegui ler ${pagina} de lugar nenhum`); continue }

  for (const m of html.matchAll(/(?:href|src|action)="([^"]+)"/g)) {
    const alvo = m[1].trim()
    if (!alvo || alvo.startsWith('#') || alvo.startsWith('mailto:') || alvo.startsWith('tel:')) continue
    if (/^(https?:)?\/\//i.test(alvo)) {
      // Externo, exceto quando é o próprio domínio.
      if (!alvo.includes('coopaibi.com.br')) continue
      links.add(alvo.replace(/^https?:\/\/(www\.)?coopaibi\.com\.br\/?/, '') || 'index.php')
      continue
    }
    links.add(alvo.replace(/^\.?\//, ''))
  }
}

let ok = 0, ruim = 0
const falhas = []
const ordenados = [...links].filter(Boolean).sort()

console.log(`\nTestando ${ordenados.length} caminhos contra ${BASE}\n`)

for (const caminho of ordenados) {
  const url = `${BASE}/${caminho}`
  let status = 0
  try {
    const r = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(20000) })
    status = r.status
  } catch { status = -1 }

  // 2xx serve, 3xx é redirect intencional (admin → painel do NexCoop).
  // 405 também passa: são os endpoints de formulário, que só aceitam POST —
  // responder "método não permitido" prova que a rota existe. O POST de
  // verdade é exercitado por teste-formularios-site.mjs.
  const bom = (status >= 200 && status < 400) || status === 405
  if (bom) { ok++ } else { ruim++; falhas.push(`${caminho} → ${status}`) }
  console.log(`  ${bom ? 'ok  ' : 'FALHA'} ${String(status).padStart(4)}  ${caminho}`)
}

console.log(`\n${ok} respondem, ${ruim} falham`)
if (falhas.length) {
  console.log('\nFalhas:')
  for (const f of falhas) console.log('  ! ' + f)
}
process.exit(ruim ? 1 : 0)
