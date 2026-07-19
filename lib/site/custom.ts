// Registro de customizações "porte fiel" por org — convive com o TEMPLATE
// PADRÃO do módulo Site (app/(site-org)/[slug]/*), que continua existindo
// intacto para orgs sem customização e como base a ser replicada no futuro.
//
// Como funciona: cada rota de app/(site-org)/[slug]/ chama
// `temCustomizacao(slug)` logo no início. Se true, renderiza o componente
// custom correspondente (hoje só components/site/custom/coopaibi/*); senão,
// segue o fluxo padrão já existente (não alterado por esta customização).
//
// Registrar uma nova org customizada no futuro:
//   1. Criar components/site/custom/<slug>/ com as páginas fiéis.
//   2. Adicionar '<slug>' ao Set abaixo.
//   3. Em cada app/(site-org)/[slug]/**/page.tsx, importar o componente
//      custom e ramificar por slug (só a COOPAIBI está com if hardcoded
//      hoje — generalizar o dispatch por um mapa fica pra quando houver
//      uma segunda org customizada, ver CLAUDE.md item 4 desta tarefa).
export const SLUGS_COM_CUSTOMIZACAO = new Set(['coopaibi'])

export function temCustomizacao(slug: string): boolean {
  return SLUGS_COM_CUSTOMIZACAO.has(slug)
}
