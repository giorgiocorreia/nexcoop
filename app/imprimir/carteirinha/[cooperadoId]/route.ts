// Impressão individual da carteirinha de identificação do filiado — peça
// dobrável única (frente + verso unidos, 85,6 × 108 mm), seguindo o mesmo
// padrão de rota de impressão de app/imprimir/caixa/[id]/route.ts.
//
// SEGURANÇA (crítico): este handler devolve PII (nome, CPF mascarado, foto)
// em PDF. Checa auth.getUser() + admin da org via lib/permissoes.ts (regra 7
// do CLAUDE.md) + confirma que o cooperado pertence à MESMA org do usuário
// logado — sem isso, qualquer autenticado baixaria a carteirinha de
// qualquer cooperado de qualquer organização só trocando o id na URL.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdmin } from '@/lib/permissoes'
import { buscarCarteirinhaAtivaDoCooperado } from '@/lib/carteirinha/queries'
import { montarUrlVerificacao } from '@/lib/carteirinha/carteirinha-utils'
import { gerarCartaoCarteirinhaPDF } from '@/lib/carteirinha/pdf'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ cooperadoId: string }> }
) {
  const { cooperadoId } = await params

  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return new NextResponse('Não autenticado', { status: 401 })

  // createAdminClient() a partir daqui — leitura cross-tabela e checagem de
  // permissão, nunca o client do navegador (regra 2 do CLAUDE.md).
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

  const { data: cooperado } = await admin
    .from('cooperados')
    .select('id, organizacao_id, nome_completo, numero_matricula, cpf, data_admissao, foto_url')
    .eq('id', cooperadoId)
    .single()

  // 404 (não 403) quando o cooperado não existe OU é de outra org — não
  // vazamos qual dos dois casos é, pra não confirmar existência a quem não
  // tem acesso.
  if (!cooperado || cooperado.organizacao_id !== organizacaoId) {
    return new NextResponse('Não encontrado', { status: 404 })
  }

  const carteirinha = await buscarCarteirinhaAtivaDoCooperado(cooperadoId, organizacaoId)
  if (!carteirinha) {
    return new NextResponse('Este cooperado não possui carteirinha ativa para impressão.', { status: 404 })
  }

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

  const urlVerificacao = montarUrlVerificacao(carteirinha.codigo, (siteConfig as { slug: string } | null)?.slug ?? null)

  // ?tamanho=cartao devolve a página no tamanho exato da peça (242,6 ×
  // 306,2 pt), pra quem tem impressora de cartão — qualquer outro valor
  // (ou ausência do param) cai no padrão A4, pensado pra impressora comum
  // (pedido do Giorgio, 24/07/2026: sem isso o "ajustar à página" do leitor
  // de PDF amplia a peça e o cartão perde o tamanho CR80/CNH).
  const formato = req.nextUrl.searchParams.get('tamanho') === 'cartao' ? 'cartao' : 'a4'

  const pdfBytes = await gerarCartaoCarteirinhaPDF({
    cooperado: {
      nome: cooperado.nome_completo,
      numeroMatricula: cooperado.numero_matricula,
      cpf: cooperado.cpf,
      dataAdmissao: cooperado.data_admissao,
      validaAte: carteirinha.validaAte,
      fotoUrl: cooperado.foto_url,
    },
    organizacao: {
      nome: org?.nome ?? 'NexCoop',
      logoUrl: org?.logo_url ?? null,
      corPrimaria: org?.cor_primaria ?? null,
      tipo: org?.tipo ?? 'cooperativa',
      email: org?.email ?? null,
      telefone: org?.telefone ?? null,
    },
    carteirinha: { codigo: carteirinha.codigo, via: carteirinha.via },
    urlVerificacao,
  }, formato)

  const nomeArquivo = cooperado.nome_completo
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // remove acentos
    .replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="carteirinha-${nomeArquivo}.pdf"`,
    },
  })
}
