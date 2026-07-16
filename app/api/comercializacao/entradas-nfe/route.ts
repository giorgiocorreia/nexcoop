import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json([], { status: 401 })

    const admin = createAdminClient()

    const { data: usuario } = await admin
      .from("usuarios")
      .select("organizacao_id")
      .eq("id", user.id)
      .single()

    if (!usuario?.organizacao_id) return NextResponse.json([], { status: 401 })

    const { data, error } = await admin
      .from("notas_entrega")
      .select(`
        id, numero_nfe, serie, chave_nfe, status, created_at,
        quantidade_kg, valor_total, cfop,
        produtores (nome, cpf)
      `)
      .eq("organizacao_id", usuario.organizacao_id)
      // 'processando' entra na lista para permitir a consulta manual do status
      // na Focus (botão Consultar → /api/nfe/sincronizar) — sem isso a nota
      // que fica presa em processamento nunca sai desse estado.
      .in("status", ["autorizada", "emitida", "processando"])
      .order("created_at", { ascending: false })

    if (error) return NextResponse.json([], { status: 500 })

    return NextResponse.json(data ?? [])
  } catch {
    return NextResponse.json([], { status: 500 })
  }
}
