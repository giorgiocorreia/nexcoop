// Cotação USD → BRL via API pública do Banco Central (PTAX).
// Usada para converter custos em dólar (ex: chamadas ao Claude) em reais
// para exibição, sem depender de uma taxa fixa que fica desatualizada.

const FALLBACK_COTACAO = 5.50 // usado somente se a API do BCB falhar e não houver cache
const CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6 horas

let cache: { valor: number; expiraEm: number } | null = null

function formatarDataBCB(d: Date): string {
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${mes}-${dia}-${d.getFullYear()}`
}

async function buscarCotacaoNaData(data: Date): Promise<number | null> {
  try {
    const dataStr = formatarDataBCB(data)
    const url = `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarDia(dataCotacao=@dataCotacao)?@dataCotacao='${dataStr}'&$format=json`
    const res = await fetch(url)
    if (!res.ok) return null
    const json = await res.json()
    const valor = json?.value?.[0]?.cotacaoVenda
    return typeof valor === 'number' && valor > 0 ? valor : null
  } catch {
    return null
  }
}

// Retorna a cotação de venda do dólar mais recente disponível (PTAX não
// publica em fins de semana/feriados, então tenta os últimos dias úteis).
export async function buscarCotacaoUSDParaBRL(): Promise<number> {
  const agora = Date.now()
  if (cache && cache.expiraEm > agora) return cache.valor

  for (let i = 0; i < 5; i++) {
    const data = new Date()
    data.setDate(data.getDate() - i)
    const valor = await buscarCotacaoNaData(data)
    if (valor != null) {
      cache = { valor, expiraEm: agora + CACHE_TTL_MS }
      return valor
    }
  }

  // API indisponível: usa o último valor em cache mesmo vencido, ou o fallback.
  return cache?.valor ?? FALLBACK_COTACAO
}
