import { describe, it, expect } from 'vitest'
// O espelho é .mjs sem tipos próprios; `allowJs` no tsconfig faz o tsc
// inferir o suficiente, e o que importa aqui é o comportamento em runtime.
import { CORRECOES, aplicarCorrecoes } from './correcoes.mjs'

// As correções do espelho são aplicadas na GERAÇÃO, não à mão nos arquivos,
// porque os HTMLs podem ser recapturados do cPanel. Isso só se sustenta se
// `aplicarCorrecoes` for previsível — daí estes testes.

interface Correcao {
  nome: string
  de: RegExp
  para: string
  excetoEm?: string[]
  apenasEm?: string[]
  pularSeContem?: string
}

const REGRAS = CORRECOES as Correcao[]

describe('catálogo de correções', () => {
  it('toda correção tem nome, padrão e substituição', () => {
    for (const c of REGRAS) {
      expect(c.nome, JSON.stringify(c)).toBeTruthy()
      expect(c.de).toBeInstanceOf(RegExp)
      expect(typeof c.para).toBe('string')
    }
  })

  it('nomes são únicos — o nome é o que aparece no log do corretor', () => {
    const nomes = REGRAS.map(c => c.nome)
    expect(new Set(nomes).size).toBe(nomes.length)
  })

  it('correção que INSERE conteúdo tem pularSeContem, senão duplica a cada passada', () => {
    // Heurística: a substituição repete o próprio padrão casado (ex.: troca
    // '</body>' por 'algo</body>'), então ela casaria de novo na execução
    // seguinte. Estas precisam da guarda de idempotência.
    for (const c of REGRAS) {
      const insereEMantem = c.para.includes('</body>') && c.de.source.includes('body')
      if (insereEMantem) expect(c.pularSeContem, c.nome).toBeTruthy()
    }
  })
})

describe('aplicarCorrecoes — seleção por página', () => {
  it('excetoEm pula a página listada', () => {
    const html = '<a href="#sobre">Sobre</a>'
    // A âncora #sobre só existe na home; nas demais vira index.php#sobre.
    expect(aplicarCorrecoes(html, 'index').html).toBe(html)
    expect(aplicarCorrecoes(html, 'loja').html).toContain('index.php#sobre')
  })

  it('apenasEm restringe a correção a uma página só', () => {
    const html = '<body>x</body>'
    // O filtro da Biblioteca não deve entrar em nenhuma outra página.
    expect(aplicarCorrecoes(html, 'loja').html).toBe(html)
    expect(aplicarCorrecoes(html, 'biblioteca').html).not.toBe(html)
  })

  it('devolve os nomes do que foi aplicado — é o log do corretor', () => {
    const r = aplicarCorrecoes('<a href="#sistema">x</a>', 'loja')
    expect(r.aplicadas).toContain('ancoras-do-menu-sobre')
  })

  it('html sem defeito nenhum sai intacto e sem nada aplicado', () => {
    const html = '<p>página limpa</p>'
    const r = aplicarCorrecoes(html, 'loja')
    expect(r.html).toBe(html)
    expect(r.aplicadas).toEqual([])
  })
})

describe('aplicarCorrecoes — idempotência', () => {
  // O cabeçalho de corrigir-estaticos.mjs promete: "aplicar duas vezes não
  // muda nada". Vale para toda página, inclusive a que recebe injeção.
  const CASOS: [string, string][] = [
    ['loja',       '<nav class="navbar" style="position:relative"><a href="#sobre">s</a></nav>'],
    ['biblioteca', '<html><body><a href="biblioteca.php?download=3">PDF</a></body></html>'],
    ['cacau',      '<a href="https://wa.me/5573999862960?text=oi">zap</a>'],
    ['parceiro',   '<strong>Presidente</strong>\n        <span>Fulano</span>'],
  ]

  for (const [pagina, html] of CASOS) {
    it(`${pagina}: segunda passada não muda nada`, () => {
      const uma = aplicarCorrecoes(html, pagina).html
      const duas = aplicarCorrecoes(uma, pagina).html
      expect(duas).toBe(uma)
    })
  }

  it('biblioteca: o script de filtro é injetado uma única vez', () => {
    const html = '<html><body><div class="doc-grid"></div></body></html>'
    const uma = aplicarCorrecoes(html, 'biblioteca').html
    const duas = aplicarCorrecoes(uma, 'biblioteca').html
    const conta = (s: string) => s.split('Filtro de categoria e busca da Biblioteca').length - 1
    expect(conta(uma)).toBe(1)
    expect(conta(duas)).toBe(1)
    expect(duas.split('</body>').length - 1).toBe(1)
  })
})

describe('correções específicas', () => {
  it('whatsapp da página de cacau vai para o número usado no resto do site', () => {
    const r = aplicarCorrecoes('<a href="https://wa.me/5573999862960?text=x">z</a>', 'cacau')
    expect(r.html).toContain('wa.me/5571999783992')
    expect(r.html).not.toContain('5573999862960')
  })

  it('links tel: não são tocados — são as linhas fixas da Loja e da Compra', () => {
    const html = '<a href="tel:+557399862960">liga</a>'
    expect(aplicarCorrecoes(html, 'cacau').html).toBe(html)
  })

  it('download da biblioteca aponta para o PDF servido por nós, com caminho absoluto', () => {
    // Relativo quebraria: a URL visível continua sendo /biblioteca.php.
    const r = aplicarCorrecoes('<a href="biblioteca.php?download=1">a</a>', 'biblioteca')
    expect(r.html).toContain('/sites/coopaibi/biblioteca/projcacauquerefloresta.pdf')
  })

  it('navbar inline que anula o sticky do CSS é removida', () => {
    const r = aplicarCorrecoes('<nav class="navbar" style="position:relative">', 'acoes')
    expect(r.html).toBe('<nav class="navbar">')
  })
})
