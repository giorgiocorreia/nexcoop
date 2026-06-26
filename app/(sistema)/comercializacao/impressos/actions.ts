"use server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

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
