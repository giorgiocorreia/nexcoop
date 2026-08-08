// Teste ponta a ponta dos formulários do site da COOPAIBI.
//
// Por que não é um teste do Vitest: precisa de servidor Next de pé E do
// Supabase real — não existe base de homologação neste projeto. É uma
// ferramenta de verificação, para rodar à mão antes da virada de DNS, não
// algo que entra em `npm test`.
//
// O que exercita, que o unitário não alcança:
//   - o middleware traduzindo a URL .php para a rota do app;
//   - os DOIS contratos de resposta herdados do HTML original (JSON para
//     cooperado/parceria, redirect 303 para o agendamento de cacau);
//   - a gravação real em site_leads, com o formato do jsonb `dados`;
//   - o endpoint da bolsa.
//
// SEGURANÇA: grava leads de verdade na org indicada e APAGA todos ao final,
// identificando-os pela marca no nome. Com o .env.local sem SMTP_*, nenhum
// e-mail é enviado (`smtpConfigured()` é falso) — confira antes de rodar.
//
// Uso: node scripts/teste-formularios-site.mjs [--manter]
//      --manter  não apaga os leads criados (para inspecionar na tela)

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const BASE = process.env.BASE_URL ?? 'http://localhost:3000/sites/coopaibi'
const ORG_COOPAIBI = '3ad97dc2-f87f-4e67-950e-387854d5bccc'
const MARCA = `TESTE AUTOMATIZADO ${new Date().toISOString()}`
const MANTER = process.argv.includes('--manter')

function env() {
  const txt = readFileSync('.env.local', 'utf8')
  return Object.fromEntries(
    txt.split('\n')
      .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
      .map((l) => {
        const i = l.indexOf('=')
        return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]
      })
  )
}

const cfg = env()
const db = createClient(cfg.NEXT_PUBLIC_SUPABASE_URL, cfg.SUPABASE_SERVICE_ROLE_KEY)

let passou = 0
let falhou = 0
const criados = []

function ok(nome, condicao, detalhe = '') {
  if (condicao) { passou++; console.log(`  ok   ${nome}`) }
  else { falhou++; console.log(`  FALHA ${nome}${detalhe ? ' — ' + detalhe : ''}`) }
}

async function postForm(caminho, campos) {
  const body = new URLSearchParams(campos)
  return fetch(`${BASE}/${caminho}`, {
    method: 'POST',
    body,
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    redirect: 'manual',
  })
}

// ── 1. Cooperado — contrato JSON ────────────────────────────────────────────
console.log('\n1. enviar-cooperado.php (fetch + JSON)')
{
  const r = await postForm('enviar-cooperado.php', {
    nome: `${MARCA} cooperado`,
    email: 'teste@exemplo.invalido',
    tel: '(73) 99999-8888',
    local: 'Ibirataia',
    area: '2 hectares',
    perfil: 'Produtor',
    msg: 'Mensagem de teste; com ponto-e-vírgula\ne quebra de linha',
  })
  ok('responde 200', r.status === 200, `status ${r.status}`)
  const j = await r.json().catch(() => null)
  ok('devolve {ok:true}', j?.ok === true, JSON.stringify(j))
}

// ── 2. Parceria — nome vem de `contato` ─────────────────────────────────────
console.log('\n2. enviar-parceria.php (fetch + JSON)')
{
  const r = await postForm('enviar-parceria.php', {
    contato: `${MARCA} parceria`,
    empresa: 'Empresa de Teste',
    cargo: 'Diretor',
    email: 'parceria@exemplo.invalido',
    tel: '73999997777',
    cota: 'Ouro',
    segmento: 'Chocolate',
    msg: 'Interesse de teste',
  })
  ok('responde 200', r.status === 200, `status ${r.status}`)
  const j = await r.json().catch(() => null)
  ok('devolve {ok:true}', j?.ok === true, JSON.stringify(j))
}

// ── 3. Agendamento de cacau — contrato de REDIRECT ──────────────────────────
console.log('\n3. enviar-agendamento-cacau.php (form nativo + redirect 303)')
{
  const r = await postForm('enviar-agendamento-cacau.php', {
    nome: `${MARCA} cacau`,
    telefone: '73 99999 6666',
    municipio: 'Ibirataia',
    quantidade: '300 kg',
    data_preferencial: '2026-08-20',
    cooperado: 'Sim',
    observacoes: 'Entrego pela manhã',
  })
  ok('responde 303 (troca POST por GET, F5 não reenvia)', r.status === 303, `status ${r.status}`)
  const destino = r.headers.get('location') ?? ''
  ok('volta para cacau.php com ?agendamento=ok', destino.includes('cacau.php') && destino.includes('agendamento=ok'), destino)
}

// ── 4. Caminho de erro — sem o campo obrigatório ────────────────────────────
console.log('\n4. validação (cooperado sem nome)')
{
  const r = await postForm('enviar-cooperado.php', { email: 'sem-nome@exemplo.invalido' })
  ok('responde 400', r.status === 400, `status ${r.status}`)
  const j = await r.json().catch(() => null)
  ok('devolve {ok:false} com mensagem', j?.ok === false && !!j?.erro, JSON.stringify(j))
}

// ── 5. Agendamento sem nome — erro também vira redirect ─────────────────────
console.log('\n5. validação (agendamento sem nome — erro pelo contrato de redirect)')
{
  const r = await postForm('enviar-agendamento-cacau.php', { telefone: '73999995555' })
  ok('responde 303', r.status === 303, `status ${r.status}`)
  ok('volta com ?erro=1', (r.headers.get('location') ?? '').includes('erro=1'), r.headers.get('location') ?? '')
}

// ── 6. Cotação da bolsa ─────────────────────────────────────────────────────
console.log('\n6. cacau-preco-bolsa.php')
{
  const r = await fetch(`${BASE}/cacau-preco-bolsa.php`)
  ok('responde 200', r.status === 200, `status ${r.status}`)
  const j = await r.json().catch(() => null)
  ok('mantém o formato do PHP (preco/moeda/unidade/fonte)',
    j !== null && 'preco' in j && j.moeda === 'USD' && j.unidade === 'tonelada' && typeof j.fonte === 'string',
    JSON.stringify(j))
  ok('traz preço numérico (provedor externo respondeu)', typeof j?.preco === 'number', `preco=${j?.preco} fonte=${j?.fonte}`)
  ok('cache de 1h no CDN, como o PHP fazia em arquivo',
    (r.headers.get('cache-control') ?? '').includes('s-maxage=3600'),
    r.headers.get('cache-control') ?? '')
}

// ── 7. O que foi gravado ────────────────────────────────────────────────────
console.log('\n7. gravação em site_leads')
{
  const { data, error } = await db
    .from('site_leads')
    .select('*')
    .eq('organizacao_id', ORG_COOPAIBI)
    .like('nome', `${MARCA}%`)
    .order('criado_em')

  if (error) {
    ok('consulta ao banco', false, error.message)
  } else {
    criados.push(...data.map((l) => l.id))
    ok('gravou os 3 leads (o 4º e 5º foram recusados na validação)', data.length === 3, `gravou ${data.length}`)

    const coop = data.find((l) => l.tipo === 'cooperado')
    ok('cooperado: colunas promovidas corretamente',
      coop?.email === 'teste@exemplo.invalido' && coop?.telefone === '(73) 99999-8888',
      JSON.stringify({ email: coop?.email, tel: coop?.telefone }))
    ok('cooperado: jsonb dados guarda o que não virou coluna',
      coop?.dados?.area === '2 hectares' && coop?.dados?.perfil === 'Produtor',
      JSON.stringify(coop?.dados))
    ok('cooperado: mensagem preservada com quebra de linha',
      (coop?.mensagem ?? '').includes('\n'), JSON.stringify(coop?.mensagem))

    const parc = data.find((l) => l.tipo === 'parceria')
    ok('parceria: nome veio de `contato`', parc?.nome?.endsWith('parceria'), parc?.nome)
    ok('parceria: empresa e cota no jsonb',
      parc?.dados?.empresa === 'Empresa de Teste' && parc?.dados?.cota === 'Ouro',
      JSON.stringify(parc?.dados))

    const cacau = data.find((l) => l.tipo === 'agendamento_cacau')
    ok('cacau: sem e-mail (o formulário não pede)', cacau?.email === null, String(cacau?.email))
    ok('cacau: `observacoes` do form virou a coluna mensagem',
      cacau?.mensagem === 'Entrego pela manhã', cacau?.mensagem)

    ok('todos nascem com status novo', data.every((l) => l.status === 'novo'))
    ok('todos registram user_agent e origem/ip quando há',
      data.every((l) => l.user_agent !== null))
  }
}

// ── 8. Limpeza ──────────────────────────────────────────────────────────────
console.log('\n8. limpeza')
if (MANTER) {
  console.log(`  --manter: ${criados.length} lead(s) permanecem no banco`)
  for (const id of criados) console.log(`    ${id}`)
} else if (criados.length) {
  const { error } = await db.from('site_leads').delete().in('id', criados)
  ok(`apagou os ${criados.length} leads de teste`, !error, error?.message)
  const { data: sobrou } = await db
    .from('site_leads')
    .select('id')
    .eq('organizacao_id', ORG_COOPAIBI)
    .like('nome', `${MARCA}%`)
  ok('nada do teste sobrou na tabela', (sobrou ?? []).length === 0, `sobraram ${(sobrou ?? []).length}`)
} else {
  console.log('  nada a apagar')
}

console.log(`\n${passou} ok, ${falhou} falha(s)`)
process.exit(falhou ? 1 : 0)
