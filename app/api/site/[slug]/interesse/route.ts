import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validarInteresse, type DadosInteresse } from '@/lib/site/site-utils'

// POST /api/site/[slug]/interesse — recebe o formulário "Quero ser
// cooperado" / "Seja parceiro" dos sites públicos das orgs.
//
// DECISÃO DE ARMAZENAMENTO (documentada por não haver migration disponível
// nesta tarefa — ver restrições em docs/PLANO_MODULO_SITE.md): o módulo
// Captação existente (lib/captacao, tabela `oportunidades`) é modelado para
// EDITAIS de financiamento captados pela org (titulo/financiador/prazo de
// submissão/área temática) — não para leads de pessoas físicas querendo
// virar cooperado ou parceiro. Não existe hoje nenhuma tabela de
// "interessados"/"leads" no schema (conferido em supabase/migrations/).
// Como esta tarefa está proibida de criar migration, o lead é gravado em
// `site_conteudos` (que já existe por org) com tipo='pagina' e ativo=false
// — não aparece em nenhuma seção pública (o widget de conteúdo só lista
// ativo=true), fica só como registro consultável pela org via painel
// interno/admin. O JSON completo do lead vai em `descricao`. Quando o
// módulo Captação ganhar um conceito de "lead de adesão" (ou uma tabela
// dedicada via nexcoop-migration-writer), migrar este insert pra lá.
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  let body: DadosInteresse & { origem?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corpo da requisição inválido.' }, { status: 400 })
  }

  const validacao = validarInteresse(body)
  if (!validacao.ok) {
    return NextResponse.json({ error: validacao.erro }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: config } = await supabase
    .from('site_config')
    .select('organizacao_id')
    .eq('slug', slug)
    .maybeSingle()

  if (!config) {
    return NextResponse.json({ error: 'Site não encontrado.' }, { status: 404 })
  }

  const registro = {
    nome:        body.nome.trim(),
    telefone:    body.telefone.trim(),
    email:       body.email?.trim() || null,
    perfil:      body.perfil ?? null,
    mensagem:    body.mensagem?.trim() || null,
    origem:      body.origem ?? 'site',
    // Campos extras dos formulários fiéis da COOPAIBI (cooperado/parceiro) —
    // opcionais, sem validação própria (ver DadosInteresse em site-utils.ts).
    cpf:         body.cpf?.trim() || null,
    localidade:  body.localidade?.trim() || null,
    area:        body.area?.trim() || null,
    atividade:   body.atividade?.trim() || null,
    empresa:     body.empresa?.trim() || null,
    cargo:       body.cargo?.trim() || null,
    segmento:    body.segmento?.trim() || null,
    cota:        body.cota?.trim() || null,
    recebido_em: new Date().toISOString(),
  }

  const { error } = await supabase.from('site_conteudos').insert({
    organizacao_id: config.organizacao_id,
    tipo:           'pagina',
    titulo:         `Lead do site: ${registro.nome}`,
    descricao:      JSON.stringify(registro),
    ativo:          false,
    ordem:          0,
  })

  if (error) {
    console.error('[site/interesse] Falha ao gravar lead:', error.message)
    return NextResponse.json({ error: 'Não foi possível registrar seu interesse. Tente novamente.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
