export interface ResultadoLimite {
  permitido: boolean
  totalAtual: number
  limite: number | null
  plano: string
}

export async function verificarLimiteFiliados(
  organizacaoId: string
): Promise<ResultadoLimite> {
  const res = await fetch(`/api/assinatura/limite-filiados?org=${organizacaoId}`)
  if (!res.ok) throw new Error('Falha ao verificar limite')
  return res.json()
}
