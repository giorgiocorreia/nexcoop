import { NextRequest, NextResponse } from 'next/server'
import { gerarManualContabil, gerarManualFinanceiro, gerarTodosManuais } from '@/lib/manuais/generator'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const { tipo } = await request.json()
    let url: string | Record<string, string>

    if (tipo === 'contabil') {
      url = await gerarManualContabil()
    } else if (tipo === 'financeiro') {
      url = await gerarManualFinanceiro()
    } else if (tipo === 'todos') {
      url = await gerarTodosManuais()
    } else {
      return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
    }

    return NextResponse.json({ url })
  } catch (error: any) {
    console.error('Erro ao gerar manual:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
