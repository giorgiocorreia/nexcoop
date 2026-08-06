"use server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { podeEmitirRecibo } from "@/lib/permissoes"
import {
  type DirecaoRecibo,
  type TipoRecibo,
  apenasDigitos,
  competenciaParaData,
  documentoValido,
} from "@/lib/pdf/recibo-utils"
import type { OrgRecibo } from "@/lib/pdf/recibo"

export async function reservarFichasPesagem(quantidadePaginas: number): Promise<{
  inicio: number
  fim: number
  orgNome: string
  orgLogo: string | null
  erro?: string
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { inicio: 0, fim: 0, orgNome: "", orgLogo: null, erro: "Não autenticado" }

  const adminClient = createAdminClient()

  const { data: usuarioData } = await adminClient
    .from("usuarios")
    .select("organizacao_id")
    .eq("id", user.id)
    .single()

  if (!usuarioData?.organizacao_id) return { inicio: 0, fim: 0, orgNome: "", orgLogo: null, erro: "Usuário não encontrado" }

  const orgId = usuarioData.organizacao_id
  const quantidadeFichas = quantidadePaginas * 8

  const { data: orgData } = await adminClient
    .from("organizacoes")
    .select("ultimo_numero_ficha, nome_curto, logo_url")
    .eq("id", orgId)
    .single()

  if (!orgData) return { inicio: 0, fim: 0, orgNome: "", orgLogo: null, erro: "Organização não encontrada" }

  const inicio = (orgData.ultimo_numero_ficha ?? 0) + 1
  const fim = inicio + quantidadeFichas - 1

  const { error } = await adminClient
    .from("organizacoes")
    .update({ ultimo_numero_ficha: fim })
    .eq("id", orgId)

  if (error) return { inicio: 0, fim: 0, orgNome: "", orgLogo: null, erro: "Erro ao reservar numeração" }

  return {
    inicio,
    fim,
    orgNome: orgData.nome_curto ?? "Cooperativa",
    orgLogo: orgData.logo_url ?? null,
  }
}

// ── Recibos ──────────────────────────────────────────────────────────────────

export interface GerarReciboInput {
  tipo: TipoRecibo
  direcao: DirecaoRecibo
  pessoaNome: string
  pessoaDoc: string
  valor: number
  descricao: string
  /** "AAAA-MM" vindo do input type="month". Vazio = sem competência. */
  competencia: string
}

export type GerarReciboResultado =
  | { ok: false; erro: string }
  | {
      ok: true
      numero: number
      emitidoEm: string
      /** "AAAA-MM-01" ou null — é o que o PDF imprime. */
      competencia: string | null
      org: OrgRecibo
    }

const TIPOS_VALIDOS: TipoRecibo[] = [
  "prestacao_servico", "pagamento", "aluguel",
  "doacao", "adiantamento", "diaria_rural", "outros",
]

/**
 * Reserva o próximo número de recibo da org, grava a linha em `recibos` e
 * devolve os dados de cabeçalho para o client montar o PDF (mesmo desenho
 * da Ficha de Pesagem: pdf-lib roda no navegador).
 *
 * A numeração é reservada por compare-and-swap em
 * `organizacoes.ultimo_numero_recibo` — o UPDATE só passa se o valor lido
 * ainda for o corrente, então dois usuários emitindo ao mesmo tempo nunca
 * recebem o mesmo número (o perdedor relê e tenta o seguinte).
 */
export async function gerarRecibo(input: GerarReciboInput): Promise<GerarReciboResultado> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, erro: "Não autenticado" }

  const adminClient = createAdminClient()

  const { data: usuarioData } = await adminClient
    .from("usuarios")
    .select("organizacao_id, role, funcoes")
    .eq("id", user.id)
    .single()

  if (!usuarioData?.organizacao_id) return { ok: false, erro: "Usuário não encontrado" }

  if (!podeEmitirRecibo({
    role: usuarioData.role,
    funcoes: usuarioData.funcoes ?? [],
  })) {
    return { ok: false, erro: "Sem permissão para emitir recibo" }
  }

  const orgId = usuarioData.organizacao_id

  // ── Validação ──────────────────────────────────────────────────────────────
  const nome = (input.pessoaNome ?? "").trim()
  const descricao = (input.descricao ?? "").trim()
  const doc = apenasDigitos(input.pessoaDoc ?? "")

  if (nome.length < 3) return { ok: false, erro: "Informe o nome completo da pessoa" }
  if (descricao.length < 3) return { ok: false, erro: "Informe a descrição do recibo" }
  // Acima disso o texto não cabe na via sem ser truncado no PDF.
  if (descricao.length > 500) return { ok: false, erro: "Descrição muito longa (máximo 500 caracteres)" }
  if (nome.length > 120) return { ok: false, erro: "Nome muito longo (máximo 120 caracteres)" }
  if (!TIPOS_VALIDOS.includes(input.tipo)) return { ok: false, erro: "Tipo de recibo inválido" }
  if (input.direcao !== "recebemos" && input.direcao !== "pagamos") {
    return { ok: false, erro: "Direção do recibo inválida" }
  }
  if (!documentoValido(doc)) return { ok: false, erro: "CPF/CNPJ inválido" }

  const competenciaInput = (input.competencia ?? "").trim()
  const competencia = competenciaInput ? competenciaParaData(competenciaInput) : null
  if (competenciaInput && !competencia) return { ok: false, erro: "Competência inválida" }

  const valor = Math.round((Number(input.valor) + Number.EPSILON) * 100) / 100
  if (!Number.isFinite(valor) || valor <= 0) return { ok: false, erro: "Informe um valor maior que zero" }
  if (valor > 99_999_999.99) return { ok: false, erro: "Valor acima do limite do recibo" }

  // ── Cabeçalho da cooperativa (ao vivo) ────────────────────────────────────
  const { data: orgData } = await adminClient
    .from("organizacoes")
    .select("nome, cnpj, logradouro, numero, complemento, bairro, cep, cidade, estado, telefone, email, logo_url, cor_primaria, ultimo_numero_recibo")
    .eq("id", orgId)
    .single()

  if (!orgData) return { ok: false, erro: "Organização não encontrada" }

  // ── Reserva do número + gravação ──────────────────────────────────────────
  let numero = 0
  let emitidoEm = ""
  let competenciaGravada: string | null = null
  let ultimoConhecido = orgData.ultimo_numero_recibo ?? 0

  for (let tentativa = 0; tentativa < 5; tentativa++) {
    const candidato = ultimoConhecido + 1

    const { data: reservado } = await adminClient
      .from("organizacoes")
      .update({ ultimo_numero_recibo: candidato })
      .eq("id", orgId)
      .eq("ultimo_numero_recibo", ultimoConhecido)
      .select("ultimo_numero_recibo")
      .maybeSingle()

    if (!reservado) {
      // Alguém emitiu no meio do caminho — relê e tenta o próximo número.
      const { data: atual } = await adminClient
        .from("organizacoes")
        .select("ultimo_numero_recibo")
        .eq("id", orgId)
        .single()
      ultimoConhecido = atual?.ultimo_numero_recibo ?? ultimoConhecido + 1
      continue
    }

    const { data: recibo, error: erroInsert } = await adminClient
      .from("recibos")
      .insert({
        organizacao_id: orgId,
        numero: candidato,
        tipo: input.tipo,
        direcao: input.direcao,
        pessoa_nome: nome,
        pessoa_cpf: doc.length > 0 ? doc : null,
        valor,
        descricao,
        competencia,
        emitido_por: user.id,
      })
      .select("numero, emitido_em, competencia")
      .single()

    if (erroInsert) {
      // Número já usado (colisão residual) — tenta o seguinte.
      if (erroInsert.code === "23505") {
        ultimoConhecido = candidato
        continue
      }
      return { ok: false, erro: "Erro ao gravar o recibo" }
    }

    numero = recibo.numero
    emitidoEm = recibo.emitido_em
    competenciaGravada = recibo.competencia
    break
  }

  if (!numero) return { ok: false, erro: "Não foi possível reservar a numeração do recibo. Tente novamente." }

  const endereco = [
    [orgData.logradouro, orgData.numero].filter(Boolean).join(", "),
    orgData.complemento,
    orgData.bairro,
    [orgData.cidade, orgData.estado].filter(Boolean).join(" - "),
    orgData.cep ? `CEP ${orgData.cep}` : null,
  ].filter(Boolean).join(" - ")

  return {
    ok: true,
    numero,
    emitidoEm,
    competencia: competenciaGravada,
    org: {
      nome: orgData.nome,
      cnpj: orgData.cnpj,
      endereco: endereco || null,
      cidade: orgData.cidade,
      estado: orgData.estado,
      telefone: orgData.telefone,
      email: orgData.email,
      logoUrl: orgData.logo_url,
      corPrimaria: orgData.cor_primaria,
    },
  }
}
