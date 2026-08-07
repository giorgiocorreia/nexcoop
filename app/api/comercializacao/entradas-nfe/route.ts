import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { getOrgContext } from "@/lib/supabase/impersonation"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json([], { status: 401 })

    const admin = createAdminClient()

    // Usuário da org OU parceiro contábil (cookie parceiro_org_id)
    const { data: usuario } = await admin
      .from("usuarios")
      .select("organizacao_id")
      .eq("id", user.id)
      .maybeSingle()

    let orgId = usuario?.organizacao_id as string | null | undefined
    if (!orgId) {
      const ctx = await getOrgContext()
      orgId = ctx?.orgId
    }
    // Query string ?org= só aceita se for a org já autorizada no contexto
    const orgQs = req.nextUrl.searchParams.get("org")
    if (orgQs && orgId && orgQs !== orgId) {
      return NextResponse.json([], { status: 403 })
    }
    if (!orgId) return NextResponse.json([], { status: 401 })

    const { data, error } = await admin
      .from("notas_entrega")
      .select(`
        id, numero_nfe, serie, chave_nfe, status, created_at,
        quantidade_kg, valor_total, cfop,
        produtores (nome, cpf)
      `)
      .eq("organizacao_id", orgId)
      // 'processando' entra na lista para permitir a consulta manual do status
      // na Focus (botão Consultar → /api/nfe/sincronizar) — sem isso a nota
      // que fica presa em processamento nunca sai desse estado.
      // 'emitida' sem chave/número (legado) não entra — polui a lista fiscal.
      .in("status", ["autorizada", "processando"])
      .order("created_at", { ascending: false })

    if (error) return NextResponse.json([], { status: 500 })

    // Só notas com identificação real ou ainda em processamento na SEFAZ
    const rows = (data ?? []).filter(
      (n: any) =>
        n.status === "processando" ||
        n.chave_nfe ||
        n.numero_nfe,
    )

    return NextResponse.json(rows)
  } catch {
    return NextResponse.json([], { status: 500 })
  }
}
