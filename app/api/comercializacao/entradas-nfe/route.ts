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
      // autorizada/emitida = emitidas com sucesso; processando = ainda na SEFAZ
      // (só as recentes — as antigas sem chave são emissão incompleta e poluem
      // a lista fiscal do contador).
      .in("status", ["autorizada", "emitida", "processando"])
      .order("created_at", { ascending: false })

    if (error) return NextResponse.json([], { status: 500 })

    const agora = Date.now()
    const JANELA_PROCESSANDO_MS = 48 * 60 * 60 * 1000 // 48h

    const rows = (data ?? []).filter((n: any) => {
      // Notas realmente emitidas (têm chave ou número)
      if (n.chave_nfe || n.numero_nfe) {
        return n.status === "autorizada" || n.status === "emitida"
      }
      // Processando sem chave: só se for recente (ainda faz sentido consultar)
      if (n.status === "processando") {
        const criado = new Date(n.created_at).getTime()
        return Number.isFinite(criado) && agora - criado <= JANELA_PROCESSANDO_MS
      }
      return false
    })

    return NextResponse.json(rows)
  } catch {
    return NextResponse.json([], { status: 500 })
  }
}
