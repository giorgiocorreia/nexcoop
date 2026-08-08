// Defeitos do site original que corrigimos ao portar.
//
// O espelho começou como cópia byte a byte, e isso tinha um propósito: não
// perder nada do que estava publicado. Cumprido esse propósito, corrigir o
// que está errado é o passo seguinte — a cópia deixa de ser cópia de
// propósito.
//
// As correções ficam AQUI, e não editadas à mão nos arquivos, por um motivo
// prático: os HTMLs são capturados do cPanel e podem ser recapturados. Toda
// correção feita à mão se perderia na recaptura. Aplicadas na geração, elas
// sobrevivem — e a lista serve de registro do que diverge do original.
//
// Usado por dividir.mjs (páginas geradas) e corrigir-estaticos.mjs (páginas
// servidas como arquivo).

export const CORRECOES = [
  {
    nome: 'ancoras-do-menu-sobre',
    // O dropdown "Sobre" aponta para #sobre, #sistema e #impacto — âncoras
    // que só existem na home. Em Loja, Vídeos, Ações, Cooperado, Parceiro e
    // Relatório o clique não faz nada, porque o alvo não está na página. O
    // cacau.php já usava a forma certa (index.php#…); as demais ficaram
    // para trás.
    de: /href="#(sobre|sistema|impacto)"/g,
    para: 'href="index.php#$1"',
    // A home é a exceção: lá as âncoras existem e o link deve continuar
    // interno, senão recarrega a página a cada clique.
    excetoEm: ['index'],
  },
  {
    nome: 'navbar-nao-gruda-fora-da-home',
    // O style.css manda a navbar grudar no topo (`position: sticky; top:0`),
    // mas seis páginas trazem `style="position:relative"` inline anulando
    // isso — Loja, Cacau, Vídeos, Ações, Cooperado e Parceiro. Home e
    // Notícias não trazem, e nelas o menu acompanha a rolagem. O inline é
    // que destoa: o CSS diz o que era para ser.
    //
    // Em Ações o efeito é pior que inconsistência. A barra de filtros
    // ("Todas as ações / Eventos / …") tem `sticky; top:66px`, número
    // calibrado para encostar embaixo de uma navbar grudada. Sem ela, a
    // barra gruda sozinha com 66px de vão vazio acima — o "menu voando".
    de: /<nav class="navbar" style="position:relative">/g,
    para: '<nav class="navbar">',
  },
  {
    nome: 'whatsapp-divergente-na-pagina-de-cacau',
    // A página de Cacau mandava para 5573999862960, enquanto TODAS as outras
    // usam 5571999783992. Os dois têm os mesmos dígitos trocados de lugar
    // (99986-2960 × 99862-9960), o que sugere digitação errada — e o errado
    // é o da página de cacau, único lugar com aquela forma, justo onde o
    // produtor clica para negociar entrega.
    //
    // Padronizado no número do Giorgio, que é o já usado no resto do site.
    // PROVISÓRIO: ele vai definir um número definitivo para a compra de
    // cacau; quando definir, é só trocar aqui.
    //
    // Os links `tel:` de (73) 9 9862-9960 e (73) 9 9976-8420 continuam como
    // estão — são as linhas de telefone da Loja e da Compra de Cacau, e não
    // se confundem com o WhatsApp.
    de: /wa\.me\/5573999862960/g,
    para: 'wa.me/5571999783992',
  },
  {
    nome: 'download-da-biblioteca-quebrado',
    // biblioteca.php?download=N lê a linha da tabela `biblioteca` e serve
    // biblioteca/{arquivo}. Só que o PDF NÃO ESTÁ no servidor: a URL direta
    // dá 404 e o handler cai no ramo `Location: biblioteca.php?erro=arquivo`.
    // Ou seja, o link que a cooperativa envia não entrega o documento.
    //
    // As duas linhas da tabela apontam para o mesmo arquivo (cadastro
    // duplicado), então os dois links viram o mesmo caminho. O PDF foi
    // copiado de C:\COOPAIBI_LOCAL\Site\biblioteca para public/sites/.
    //
    // Efeito colateral aceito: some o contador de downloads, que era um
    // UPDATE no PHP. Ninguém usava o número, e ele não vale um handler.
    de: /biblioteca\.php\?download=\d+/g,
    para: '/sites/coopaibi/biblioteca/projcacauquerefloresta.pdf',
  },
  {
    nome: 'valor-do-contato-com-tamanho-de-icone',
    // Em parceiro.html, `.parc-aside-item span { font-size:22px }` existe
    // para o emoji do card (📧 📞 👤 📍), mas pega qualquer <span> dentro do
    // bloco. E-mail e Telefone escapam porque o valor deles é <a>, que tem
    // regra própria; Presidente e Endereço usam <span> e saem em 22px.
    // O CSS já previa a saída — `.parc-aside-item span.val { font-size:14px }`
    // —, só faltou a classe no HTML.
    de: /<strong>(Presidente|Endereço)<\/strong>\n(\s*)<span>/g,
    para: '<strong>$1</strong>\n$2<span class="val">',
  },
  {
    nome: 'biblioteca-filtro-e-busca-sem-php',
    apenasEm: ['biblioteca'],
    pularSeContem: 'Filtro de categoria e busca da Biblioteca',
    // A barra de categorias e o campo de busca da Biblioteca eram resolvidos
    // no servidor: `biblioteca.php?cat=Editais` refazia a consulta no MySQL e
    // devolvia outro HTML. Servida como arquivo estático, a query string não
    // é lida por ninguém — clicar em "Editais" ou buscar devolve a mesma
    // página inteira, sem nem sinalizar que o filtro não pegou.
    //
    // Como a lista já vem inteira no HTML, filtrar no cliente resolve sem
    // servidor nenhum: o script lê ?cat= e ?busca= e esconde o que não casa.
    // As URLs continuam válidas — a cooperativa pode ter compartilhado um
    // link com ?cat=, e ele volta a funcionar.
    de: /<\/body>/,
    para: `<script>
    // Filtro de categoria e busca da Biblioteca (ver correcoes.mjs). Substitui
    // o que biblioteca.php fazia no MySQL: aqui a lista já está toda na
    // página, então é só esconder o que não casa.
    (function () {
      // Sem acento e sem caixa dos dois lados: a categoria vem da URL
      // ("Estatuto+e+Atas") e do rótulo do card ("📜 Estatuto e Atas").
      function normalizar(t) {
        return (t || '')
          .normalize('NFD').replace(/[\\u0300-\\u036f]/g, '')
          .replace(/[^a-zA-Z0-9 ]/g, ' ')
          .replace(/\\s+/g, ' ')
          .trim().toLowerCase()
      }

      document.addEventListener('DOMContentLoaded', function () {
        var params = new URLSearchParams(window.location.search)
        var cat = normalizar(params.get('cat'))
        var busca = normalizar(params.get('busca'))

        // Deixa o campo mostrando o que foi buscado, como o PHP fazia ao
        // reimprimir a página.
        var campo = document.querySelector('input[name="busca"]')
        if (campo && params.get('busca')) campo.value = params.get('busca')

        // Link de categoria em evidência. O HTML vem com "Todos" marcado.
        document.querySelectorAll('.cat-link').forEach(function (a) {
          var href = a.getAttribute('href') || ''
          var alvo = normalizar(new URLSearchParams(href.split('?')[1] || '').get('cat'))
          a.classList.toggle('ativo', alvo === cat)
        })

        var cards = document.querySelectorAll('.doc-card')
        var visiveis = 0
        cards.forEach(function (card) {
          var categoria = normalizar((card.querySelector('.doc-cat') || {}).textContent)
          var texto = normalizar(card.textContent)
          var passa = (!cat || categoria === cat) && (!busca || texto.indexOf(busca) !== -1)
          card.style.display = passa ? '' : 'none'
          if (passa) visiveis++
        })

        // Sem resultado a grade ficaria simplesmente vazia, sem explicar nada.
        var grade = document.querySelector('.doc-grid')
        if (grade && cards.length && !visiveis) {
          var aviso = document.createElement('p')
          aviso.style.cssText = 'padding:24px;color:#666;font-size:14px'
          aviso.textContent = 'Nenhum documento encontrado para este filtro.'
          grade.appendChild(aviso)
        }
      })
    })()
  </script>
</body>`,
  },
]

export function aplicarCorrecoes(html, pagina) {
  let saida = html
  const aplicadas = []
  for (const c of CORRECOES) {
    if (c.excetoEm?.includes(pagina)) continue
    if (c.apenasEm && !c.apenasEm.includes(pagina)) continue
    // Correção que INSERE conteúdo (em vez de trocar o padrão defeituoso por
    // um correto) casaria de novo a cada execução e duplicaria o que
    // inseriu. `pularSeContem` é a marca de que ela já passou por ali.
    if (c.pularSeContem && saida.includes(c.pularSeContem)) continue
    const antes = saida
    saida = saida.replace(c.de, c.para)
    if (saida !== antes) aplicadas.push(c.nome)
  }
  return { html: saida, aplicadas }
}
