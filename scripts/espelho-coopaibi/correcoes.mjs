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
]

export function aplicarCorrecoes(html, pagina) {
  let saida = html
  const aplicadas = []
  for (const c of CORRECOES) {
    if (c.excetoEm?.includes(pagina)) continue
    const antes = saida
    saida = saida.replace(c.de, c.para)
    if (saida !== antes) aplicadas.push(c.nome)
  }
  return { html: saida, aplicadas }
}
