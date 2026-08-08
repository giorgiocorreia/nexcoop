import { NextResponse } from 'next/server'
import { buscarSiteConfigPorSlug, buscarOrganizacao } from '@/lib/site/queries'
import { temCustomizacao } from '@/lib/site/custom'
import { registrarLead, lerCampos, type TipoFormulario } from '@/lib/site/coopaibi/formularios'

// Recebe os formulários do site — substitui os enviar-*.php do cPanel, que
// morrem quando o DNS virar.
//
// Cada formulário tem um contrato de resposta DIFERENTE, herdado do HTML
// original, que não vou reescrever:
//
//   cooperado e parceria  → fetch() com FormData, espera JSON {ok, erro}
//   agendamento_cacau     → <form method="POST"> nativo, espera redirect
//                           de volta com ?agendamento=ok ou ?erro
//
// Manter os dois é o que permite trocar o backend sem tocar nas páginas.

const TIPOS: Record<string, TipoFormulario> = {
  cooperado: 'cooperado',
  parceria: 'parceria',
  'agendamento-cacau': 'agendamento_cacau',
}

// Para onde a página volta depois do POST nativo do agendamento.
const RETORNO_AGENDAMENTO = '/cacau.php'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string; tipo: string }> }
) {
  const { slug, tipo: tipoBruto } = await params
  const tipo = TIPOS[tipoBruto]
  const ehRedirect = tipo === 'agendamento_cacau'

  function falhar(erro: string, status: number) {
    if (ehRedirect) {
      return NextResponse.redirect(new URL(`${RETORNO_AGENDAMENTO}?erro=1`, request.url), 303)
    }
    return NextResponse.json({ ok: false, erro }, { status })
  }

  if (!tipo || !temCustomizacao(slug)) return falhar('Formulário desconhecido.', 404)

  const config = await buscarSiteConfigPorSlug(slug)
  if (!config) return falhar('Formulário desconhecido.', 404)

  const org = await buscarOrganizacao(config.organizacao_id)

  let campos: Record<string, string>
  try {
    campos = await lerCampos(request)
  } catch {
    return falhar('Não foi possível ler o formulário.', 400)
  }

  const resultado = await registrarLead(
    config.organizacao_id,
    tipo,
    campos,
    {
      origem: request.headers.get('referer') ?? undefined,
      // Na Vercel o IP do visitante chega no x-forwarded-for; o primeiro da
      // lista é o cliente, os demais são proxies.
      ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
      userAgent: request.headers.get('user-agent') ?? undefined,
    },
    // Mesmo destino do PHP: a caixa que a cooperativa já acompanha. Cai
    // para o e-mail cadastrado da org se um dia mudar.
    org?.email ?? 'contato@coopaibi.com.br'
  )

  if (!resultado.ok) return falhar(resultado.erro ?? 'Falha ao enviar.', 400)

  if (ehRedirect) {
    // 303 força o navegador a trocar o POST por um GET na volta — sem isso
    // um F5 na página de sucesso reenviaria o agendamento.
    return NextResponse.redirect(new URL(`${RETORNO_AGENDAMENTO}?agendamento=ok`, request.url), 303)
  }
  return NextResponse.json({ ok: true, msg: 'Interesse enviado com sucesso!' })
}
