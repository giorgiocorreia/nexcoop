// Utilitário puro — sem "use server" — pode ser importado pelo client

export interface DadosDevolucao {
  chaveNfe: string
  nomeEmitente: string
  dataEmissao: string
  quantidadeKg: number
  valorUnitario: number
  valorTotal: number
}

export function parsearXmlDevolucao(xml: string): DadosDevolucao | null {
  try {
    const get = (tag: string) => {
      const m = xml.match(new RegExp(`<${tag}[^>]*>([^<]+)<\/${tag}>`))
      return m ? m[1].trim() : ""
    }

    const chaveNfe      = get("chNFe")
    const nomeEmitente  = get("xNome")
    const dataEmissao   = get("dhEmi").substring(0, 10)

    const qtds = [...xml.matchAll(/<qCom>([^<]+)<\/qCom>/g)]
    const quantidadeKg = qtds.reduce((acc, m) => acc + parseFloat(m[1]), 0)

    const vUnMatch      = xml.match(/<vUnCom>([^<]+)<\/vUnCom>/)
    const valorUnitario = vUnMatch ? parseFloat(vUnMatch[1]) : 0

    if (!chaveNfe || quantidadeKg <= 0 || valorUnitario <= 0) return null

    return {
      chaveNfe,
      nomeEmitente,
      dataEmissao,
      quantidadeKg,
      valorUnitario,
      valorTotal: Math.round(quantidadeKg * valorUnitario * 100) / 100,
    }
  } catch {
    return null
  }
}
