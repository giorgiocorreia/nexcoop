import { describe, it, expect } from 'vitest'
import {
  caminhoDoEspelho, resolverEspelho,
  PHP_INTEGRADAS_COOPAIBI, PHP_REFEITAS_COOPAIBI, PHP_ENDPOINT_INTERNO_COOPAIBI,
} from './espelho-coopaibi'

// Este é o código que decide cada URL do site da COOPAIBI no momento em que o
// DNS virar. Um engano de precedência aqui derruba página em produção — e a
// falha só apareceria depois da virada, que é quando dói mais.

describe('caminhoDoEspelho', () => {
  it('no domínio próprio, o caminho é a URL sem a barra inicial', () => {
    expect(caminhoDoEspelho('coopaibi.com.br', '/loja.php')).toBe('loja.php')
    expect(caminhoDoEspelho('www.coopaibi.com.br', '/assets/style.css')).toBe('assets/style.css')
  })

  it('a raiz do domínio vira string vazia, não null — é a home, não "fora do espelho"', () => {
    expect(caminhoDoEspelho('coopaibi.com.br', '/')).toBe('')
  })

  it('o endereço de trabalho na Vercel também é espelho (é por ele que se confere sem DNS)', () => {
    expect(caminhoDoEspelho('coopaibi-site.vercel.app', '/cacau.php')).toBe('cacau.php')
  })

  it('pelo caminho direto, tira o prefixo /sites/coopaibi', () => {
    expect(caminhoDoEspelho('nexcoop.com.br', '/sites/coopaibi/loja.php')).toBe('loja.php')
    expect(caminhoDoEspelho('localhost', '/sites/coopaibi/index.php')).toBe('index.php')
  })

  it('devolve null fora do espelho — o app segue o fluxo normal', () => {
    expect(caminhoDoEspelho('nexcoop.com.br', '/dashboard')).toBeNull()
    expect(caminhoDoEspelho('localhost', '/site/leads')).toBeNull()
    expect(caminhoDoEspelho('app.nexcoop.com.br', '/')).toBeNull()
  })

  it('não confunde outro slug de site com o espelho', () => {
    expect(caminhoDoEspelho('nexcoop.com.br', '/sites/outra-org/index.php')).toBeNull()
  })

  it('/sites/coopaibi sem barra final não é espelho (o prefixo exige a barra)', () => {
    expect(caminhoDoEspelho('nexcoop.com.br', '/sites/coopaibi')).toBeNull()
  })
})

describe('resolverEspelho — precedência', () => {
  it('endpoint de formulário vira rewrite (POST não sobrevive a redirect)', () => {
    expect(resolverEspelho('enviar-cooperado.php', true))
      .toEqual({ acao: 'rewrite', pathname: '/coopaibi/enviar/cooperado' })
    expect(resolverEspelho('enviar-agendamento-cacau.php', false))
      .toEqual({ acao: 'rewrite', pathname: '/coopaibi/enviar/agendamento-cacau' })
  })

  it('a Intranet redireciona para fora, com 307', () => {
    expect(resolverEspelho('admin/login.php', true))
      .toEqual({ acao: 'redirect', url: 'https://nexcoop.com.br/login', status: 307 })
  })

  it('página integrada vai para a rota do app', () => {
    expect(resolverEspelho('loja.php', true))
      .toEqual({ acao: 'rewrite', pathname: '/coopaibi/loja' })
    expect(resolverEspelho('noticias.php', false))
      .toEqual({ acao: 'rewrite', pathname: '/coopaibi/noticias' })
  })

  it('página congelada serve o .html, mantendo a URL .php do site original', () => {
    expect(resolverEspelho('biblioteca.php', true))
      .toEqual({ acao: 'rewrite', pathname: '/sites/coopaibi/biblioteca.html' })
  })

  it('integrada tem precedência sobre congelada — senão a versão velha voltaria', () => {
    // Se um dia um caminho estiver nos dois mapas, quem vence é o banco.
    const nosDois = Object.keys(PHP_INTEGRADAS_COOPAIBI)
      .filter(k => k in PHP_REFEITAS_COOPAIBI)
    for (const k of nosDois) {
      expect(resolverEspelho(k, true)).toEqual({
        acao: 'rewrite', pathname: `/coopaibi/${PHP_INTEGRADAS_COOPAIBI[k]}`,
      })
    }
    // E a garantia vale mesmo hoje, que os mapas são disjuntos.
    expect(resolverEspelho('index.php', true).acao).toBe('rewrite')
  })

  it('endpoint tem precedência sobre tudo', () => {
    for (const k of Object.keys(PHP_ENDPOINT_INTERNO_COOPAIBI)) {
      const r = resolverEspelho(k, true)
      expect(r.acao).toBe('rewrite')
      expect((r as { pathname: string }).pathname).toContain('/coopaibi/')
    }
  })
})

describe('resolverEspelho — raiz e estáticos', () => {
  it('a raiz do domínio serve a mesma rota que index.php', () => {
    expect(resolverEspelho('', true)).toEqual({ acao: 'rewrite', pathname: '/coopaibi/inicio' })
  })

  it('index.html cai na home — as páginas congeladas linkam para ele 11 vezes', () => {
    // No cPanel funcionava por acidente (DirectoryIndex do Apache). Sem este
    // mapeamento, seria 404 depois da virada de DNS.
    expect(resolverEspelho('index.html', true))
      .toEqual({ acao: 'rewrite', pathname: '/coopaibi/inicio' })
    expect(resolverEspelho('index.html', false))
      .toEqual({ acao: 'rewrite', pathname: '/coopaibi/inicio' })
  })

  it('no domínio próprio, arquivo estático é reescrito para dentro do espelho', () => {
    expect(resolverEspelho('assets/style.css', true))
      .toEqual({ acao: 'rewrite', pathname: '/sites/coopaibi/assets/style.css' })
    expect(resolverEspelho('uploads/noticias/foto.webp', true))
      .toEqual({ acao: 'rewrite', pathname: '/sites/coopaibi/uploads/noticias/foto.webp' })
  })

  it('pelo caminho direto, estático segue como está — já está no lugar certo', () => {
    expect(resolverEspelho('assets/style.css', false)).toEqual({ acao: 'seguir' })
    expect(resolverEspelho('cooperado.html', false)).toEqual({ acao: 'seguir' })
  })

  it('caminho desconhecido não estoura — vira estático (e 404 do Next, se não existir)', () => {
    expect(resolverEspelho('nao-existe.php', true).acao).toBe('rewrite')
    expect(resolverEspelho('nao-existe.php', false)).toEqual({ acao: 'seguir' })
  })
})

describe('mapas de rota', () => {
  it('todas as páginas do menu do site estão cobertas', () => {
    for (const pagina of ['index.php', 'cacau.php', 'loja.php', 'noticias.php', 'videos.php', 'acoes.php']) {
      expect(PHP_INTEGRADAS_COOPAIBI[pagina], pagina).toBeTruthy()
    }
    expect(PHP_REFEITAS_COOPAIBI['biblioteca.php']).toBeTruthy()
  })

  it('os três formulários e a bolsa estão mapeados', () => {
    expect(Object.keys(PHP_ENDPOINT_INTERNO_COOPAIBI).sort()).toEqual([
      'cacau-preco-bolsa.php',
      'enviar-agendamento-cacau.php',
      'enviar-cooperado.php',
      'enviar-parceria.php',
    ])
  })

  it('nenhum destino aponta para o cPanel — seria laço depois da virada', () => {
    const destinos = [
      ...Object.values(PHP_INTEGRADAS_COOPAIBI),
      ...Object.values(PHP_REFEITAS_COOPAIBI),
      ...Object.values(PHP_ENDPOINT_INTERNO_COOPAIBI),
    ]
    for (const d of destinos) expect(d).not.toContain('coopaibi.com.br')
  })
})
