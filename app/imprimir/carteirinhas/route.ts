// Impressão em lote das carteirinhas de identificação — folha A4 com 10
// cartões por página (grid 2×5). Mesmas checagens de segurança da rota
// individual (app/imprimir/carteirinha/[cooperadoId]/route.ts).
//
// Query params:
//   ids=uuid,uuid,...   — lista explícita de cooperados (ex.: seleção manual na lista)
//   status=ativo        — alternativa a `ids`: todos os cooperados da org com esse status
//   verso=1             — opcional, gera também o verso (mesma grade, mesma ordem)
// Sem `ids` nem `status`: todos os cooperados da organização (ainda
// filtrados por carteirinha ativa logo abaixo).

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdmin } from '@/lib/permissoes'
import { montarUrlVerificacao } from '@/lib/carteirinha/carteirinha-utils'
import { gerarLoteCarteirinhasPDF, type DadosCartao } from '@/lib/carteirinha/pdf'
import type { StatusCooperado } from '@/types/database'

// Trava de segurança: acima disso o timeout/memória da function serverless
// fica em risco (lote grande = muitos downloads de foto + geração de QR +
// desenho de página). Devolve erro claro em vez de deixar a function estourar.
const LIMITE_LOTE = 500

const STATUS_VALIDOS: StatusCooperado[] = [
  'proposta', 'probatorio', 'ativo', 'inadimplente', 'suspenso', 'demitido', 'excluido',
]

export async function GET(req: NextRequest) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return new NextResponse('Não autenticado', { status: 401 })

  const admin = createAdminClient()
  const { data: usuarioAtual } = await admin
    .from('usuarios')
    .select('role, funcoes, organizacao_id')
    .eq('id', user.id)
    .single()
  if (!usuarioAtual || !isAdmin(usuarioAtual) || !usuarioAtual.organizacao_id) {
    return new NextResponse('Sem permissão', { status: 403 })
  }
  const organizacaoId = usuarioAtual.organizacao_id as string

  const { searchParams } = new URL(req.url)
  const idsParam = searchParams.get('ids')
  const statusParam = searchParams.get('status')
  const comVerso = searchParams.get('verso') === '1'

  let query = admin
    .from('cooperados')
    .select('id, nome_completo, numero_matricula, cpf, data_admissao, foto_url')
    .eq('organizacao_id', organizacaoId)

  if (idsParam) {
    const ids = idsParam.split(',').map(s => s.trim()).filter(Boolean)
    if (ids.length === 0) return new NextResponse('Nenhum cooperado informado.', { status: 400 })
    if (ids.length > LIMITE_LOTE) {
      return new NextResponse(`Limite de ${LIMITE_LOTE} carteirinhas por lote excedido (${ids.length} selecionados).`, { status: 400 })
    }
    query = query.in('id', ids)
  } else if (statusParam && STATUS_VALIDOS.includes(statusParam as StatusCooperado)) {
    query = query.eq('status', statusParam as StatusCooperado)
  }

  const { data: cooperados, error } = await query
  if (error) return new NextResponse('Erro ao buscar cooperados.', { status: 500 })
  if (!cooperados || cooperados.length === 0) {
    return new NextResponse('Nenhum cooperado encontrado para os filtros informados.', { status: 404 })
  }
  if (cooperados.length > LIMITE_LOTE) {
    return new NextResponse(
      `Limite de ${LIMITE_LOTE} carteirinhas por lote excedido (${cooperados.length} encontrados). Refine o filtro/seleção.`,
      { status: 400 }
    )
  }

  // Só entram cooperados com carteirinha ATIVA (não revogada) — quem não
  // tem é silenciosamente pulado, mas contabilizado no header de resumo
  // (regra do prompt: a secretaria não pode achar que imprimiu 200 e
  // receber 140 sem saber por quê).
  const idsCooperados = cooperados.map(c => c.id)
  const { data: carteirinhas } = await admin
    .from('cooperado_carteirinhas')
    .select('cooperado_id, codigo, via, valida_ate')
    .eq('organizacao_id', organizacaoId)
    .in('cooperado_id', idsCooperados)
    .is('revogada_em', null)

  const mapaCarteirinha = new Map(
    (carteirinhas ?? []).map(c => [c.cooperado_id as string, c as { codigo: string; via: number; valida_ate: string | null }])
  )

  const { data: org } = await admin
    .from('organizacoes')
    .select('nome, logo_url, cor_primaria, tipo, email, telefone')
    .eq('id', organizacaoId)
    .single()

  const { data: siteConfig } = await admin
    .from('site_config')
    .select('slug')
    .eq('organizacao_id', organizacaoId)
    .maybeSingle()
  const slug = (siteConfig as { slug: string } | null)?.slug ?? null

  const itens: DadosCartao[] = []
  let puladas = 0

  for (const coop of cooperados) {
    const cart = mapaCarteirinha.get(coop.id)
    if (!cart) { puladas++; continue }
    itens.push({
      cooperado: {
        nome: coop.nome_completo,
        numeroMatricula: coop.numero_matricula,
        cpf: coop.cpf,
        dataAdmissao: coop.data_admissao,
        validaAte: cart.valida_ate,
        fotoUrl: coop.foto_url,
      },
      organizacao: {
        nome: org?.nome ?? 'NexCoop',
        logoUrl: org?.logo_url ?? null,
        corPrimaria: org?.cor_primaria ?? null,
        tipo: org?.tipo ?? 'cooperativa',
        email: org?.email ?? null,
        telefone: org?.telefone ?? null,
      },
      carteirinha: { codigo: cart.codigo, via: cart.via },
      urlVerificacao: montarUrlVerificacao(cart.codigo, slug),
    })
  }

  if (itens.length === 0) {
    return new NextResponse('Nenhum dos cooperados encontrados possui carteirinha ativa.', { status: 404 })
  }

  const pdfBytes = await gerarLoteCarteirinhasPDF(itens, { comVerso })

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="carteirinhas-lote.pdf"',
      // Resumo do lote — pra secretaria não achar que imprimiu N e receber menos.
      'X-Carteirinhas-Impressas': String(itens.length),
      'X-Carteirinhas-Puladas': String(puladas),
    },
  })
}
