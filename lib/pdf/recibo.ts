import { PDFDocument, rgb, StandardFonts } from "pdf-lib"
import {
  type DirecaoRecibo,
  type TipoRecibo,
  assinante,
  formatarMoeda,
  fraseAbertura,
  formatarCompetencia,
  labelTipo,
  localEData,
  mascararDocumento,
} from "./recibo-utils"

export interface OrgRecibo {
  nome: string
  cnpj: string | null
  endereco: string | null
  cidade: string
  estado: string
  telefone: string | null
  email: string | null
  logoUrl: string | null
  corPrimaria: string | null
}

export interface GerarReciboParams {
  numero: number
  tipo: TipoRecibo
  direcao: DirecaoRecibo
  pessoaNome: string
  pessoaDoc: string | null
  valor: number
  descricao: string
  emitidoEm: Date
  /** Competência no formato date do Postgres ("AAAA-MM-01"). null = não imprime. */
  competencia: string | null
  org: OrgRecibo
}

const PW = 595
const PH = 842
const VIA_H = PH / 2

/**
 * Recibo A4 em duas vias idênticas na mesma folha, separadas por linha de
 * corte tracejada no meio da página. Via de cima fica com quem paga, via de
 * baixo com quem recebe — ambas assinadas pelo mesmo assinante.
 */
export async function gerarReciboPDF(params: GerarReciboParams): Promise<Uint8Array> {
  const { org } = params

  const pdfDoc = await PDFDocument.create()
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique)

  const logoImage = await carregarLogo(pdfDoc, org.logoUrl)
  const cor = hexParaRgb(org.corPrimaria) ?? rgb(0.42, 0.25, 0.04)

  const page = pdfDoc.addPage([PW, PH])

  const ctx: CtxVia = { page, fontRegular, fontBold, fontItalic, logoImage, cor, params }

  // Via de cima e via de baixo — conteúdo idêntico, só o rótulo muda.
  desenharVia({ ...ctx, y: VIA_H, rotulo: "1a VIA - PAGADOR" })
  desenharVia({ ...ctx, y: 0, rotulo: "2a VIA - RECEBEDOR" })

  desenharLinhaCorte(page, fontRegular)

  return pdfDoc.save()
}

// ── Desenho ─────────────────────────────────────────────────────────────────

interface CtxVia {
  page: any
  fontRegular: any
  fontBold: any
  fontItalic: any
  logoImage: any
  cor: ReturnType<typeof rgb>
  params: GerarReciboParams
}

function desenharVia(ctx: CtxVia & { y: number; rotulo: string }) {
  const { page, fontRegular, fontBold, fontItalic, logoImage, cor, params, y: base, rotulo } = ctx
  const { numero, tipo, direcao, pessoaNome, pessoaDoc, valor, descricao, emitidoEm, competencia, org } = params

  const cinza = rgb(0.45, 0.45, 0.45)
  const cinzaClaro = rgb(0.8, 0.8, 0.8)
  const preto = rgb(0.1, 0.1, 0.1)

  const M = 40
  const x = M
  const w = PW - M * 2
  const topo = base + VIA_H - 28

  // ── Cabeçalho da cooperativa ──────────────────────────────────────────────
  let yCab = topo
  let xTexto = x

  if (logoImage) {
    const dims = logoImage.scaleToFit(58, 40)
    page.drawImage(logoImage, {
      x,
      y: yCab - dims.height + 8,
      width: dims.width,
      height: dims.height,
    })
    xTexto = x + dims.width + 12
  }

  page.drawText(sanitizar(org.nome).toUpperCase(), {
    x: xTexto, y: yCab, size: 11, font: fontBold, color: preto,
  })
  yCab -= 11

  const linhasOrg = [
    org.cnpj ? `CNPJ: ${mascararDocumento(org.cnpj)}` : null,
    org.endereco ? sanitizar(org.endereco) : null,
    [org.telefone, org.email].filter((v): v is string => !!v).map(sanitizar).join("  |  ") || null,
  ].filter(Boolean) as string[]

  for (const linha of linhasOrg) {
    page.drawText(recortar(linha, fontRegular, 7.5, w - (xTexto - x) - 150), {
      x: xTexto, y: yCab, size: 7.5, font: fontRegular, color: cinza,
    })
    yCab -= 9.5
  }

  // ── Caixa do número + valor (canto superior direito) ──────────────────────
  const boxW = 150
  const boxH = 46
  const boxX = x + w - boxW
  const boxY = topo - boxH + 11

  page.drawRectangle({
    x: boxX, y: boxY, width: boxW, height: boxH,
    borderColor: cor, borderWidth: 1.2, color: rgb(0.985, 0.985, 0.985),
  })

  const numStr = `RECIBO No ${String(numero).padStart(5, "0")}`
  centralizar(page, numStr, fontBold, 8.5, boxX, boxW, boxY + boxH - 15, cor)

  const valorStr = formatarMoeda(valor)
  centralizar(page, valorStr, fontBold, 17, boxX, boxW, boxY + 10, preto)

  // ── Título ────────────────────────────────────────────────────────────────
  const yTitulo = Math.min(yCab, boxY) - 20
  page.drawLine({
    start: { x, y: yTitulo + 22 }, end: { x: x + w, y: yTitulo + 22 },
    thickness: 1, color: cor,
  })

  centralizar(page, `RECIBO - ${sanitizar(labelTipo(tipo)).toUpperCase()}`, fontBold, 12, x, w, yTitulo, preto)

  // Competência logo abaixo do título — só aparece quando informada.
  const competenciaStr = formatarCompetencia(competencia)
  if (competenciaStr) {
    centralizar(page, `Competencia: ${competenciaStr}`, fontRegular, 8.5, x, w, yTitulo - 12, cinza)
  }

  // ── Corpo ─────────────────────────────────────────────────────────────────
  // Piso do corpo: 20pt acima da linha de local/data (base + 62), para o texto
  // nunca encostar na assinatura por mais longa que seja a descrição.
  const yMinCorpo = base + 82
  let yCorpo = yTitulo - (competenciaStr ? 38 : 26)

  const abertura = sanitizar(fraseAbertura({
    direcao,
    pessoaNome,
    pessoaDoc,
    orgNome: org.nome,
    orgCnpj: org.cnpj,
    valor,
  }))

  // A abertura (nome, valor, quem recebeu) é o núcleo jurídico do recibo:
  // reserva espaço para a descrição e a quitação, mas nunca é cortada antes delas.
  yCorpo = paragrafo(page, abertura, x, yCorpo, w, fontRegular, 10, 14, preto, yMinCorpo + 34)
  yCorpo -= 8

  yCorpo = paragrafo(page, sanitizar(descricao), x, yCorpo, w, fontRegular, 10, 14, preto, yMinCorpo + 20)
  yCorpo -= 8

  const quitacao = direcao === "recebemos"
    ? "Para clareza, firmamos o presente recibo, dando plena e geral quitacao do valor acima."
    : "Para clareza, firmo o presente recibo, dando plena e geral quitacao do valor acima."
  paragrafo(page, quitacao, x, yCorpo, w, fontItalic, 9, 12, cinza, yMinCorpo)

  // ── Assinatura ────────────────────────────────────────────────────────────
  const yData = base + 62
  const dataStr = sanitizar(localEData(org.cidade, org.estado, emitidoEm))
  const dataW = fontRegular.widthOfTextAtSize(dataStr, 9.5)
  page.drawText(dataStr, { x: x + w - dataW, y: yData, size: 9.5, font: fontRegular, color: preto })

  const assW = 260
  const assX = x + (w - assW) / 2
  const yLinha = base + 36

  page.drawLine({
    start: { x: assX, y: yLinha }, end: { x: assX + assW, y: yLinha },
    thickness: 0.8, color: rgb(0.3, 0.3, 0.3),
  })

  const nomeAssinante = sanitizar(assinante({ direcao, pessoaNome, orgNome: org.nome }))
  centralizar(page, recortar(nomeAssinante, fontBold, 9, assW), fontBold, 9, assX, assW, yLinha - 11, preto)

  const docAssinante = direcao === "recebemos"
    ? (org.cnpj ? `CNPJ ${mascararDocumento(org.cnpj)}` : "")
    : (pessoaDoc ? `${pessoaDoc.length === 14 ? "CNPJ" : "CPF"} ${mascararDocumento(pessoaDoc)}` : "")

  if (docAssinante) {
    centralizar(page, docAssinante, fontRegular, 7.5, assX, assW, yLinha - 21, cinza)
  }

  // ── Rodapé da via ─────────────────────────────────────────────────────────
  page.drawText(rotulo, { x, y: base + 14, size: 6.5, font: fontBold, color: cinzaClaro })

  const marca = "nexcoop.com.br"
  const marcaW = fontRegular.widthOfTextAtSize(marca, 6.5)
  page.drawText(marca, {
    x: x + w - marcaW, y: base + 14, size: 6.5, font: fontRegular, color: cinzaClaro,
  })
}

function desenharLinhaCorte(page: any, font: any) {
  const cinza = rgb(0.62, 0.62, 0.62)
  const y = VIA_H
  const aviso = "corte aqui"
  const avisoW = font.widthOfTextAtSize(aviso, 6.5)
  const gapIni = (PW - avisoW) / 2 - 8
  const gapFim = (PW + avisoW) / 2 + 8

  // Tracejado manual — pdf-lib não expõe dash pattern em drawLine.
  const traco = 4
  const vao = 3
  for (let x = 24; x < PW - 24; x += traco + vao) {
    if (x > gapIni && x < gapFim) continue
    page.drawLine({
      start: { x, y }, end: { x: Math.min(x + traco, PW - 24), y },
      thickness: 0.5, color: cinza,
    })
  }

  page.drawText(aviso, { x: (PW - avisoW) / 2, y: y - 2.5, size: 6.5, font, color: cinza })
}

// ── Helpers de texto ────────────────────────────────────────────────────────

function centralizar(
  page: any, texto: string, font: any, size: number,
  x: number, largura: number, y: number, cor: ReturnType<typeof rgb>,
) {
  const w = font.widthOfTextAtSize(texto, size)
  page.drawText(texto, { x: x + (largura - w) / 2, y, size, font, color: cor })
}

/**
 * Escreve um parágrafo com quebra de linha e devolve o y final.
 * `yMin` é o piso do corpo: nada é desenhado abaixo dele, senão uma descrição
 * comprida invadiria a data e a linha de assinatura. Ao bater no piso, corta
 * e marca com reticências — recibo truncado é feio, recibo ilegível é inválido.
 */
function paragrafo(
  page: any, texto: string, x: number, y: number, largura: number,
  font: any, size: number, entrelinha: number, cor: ReturnType<typeof rgb>,
  yMin = -Infinity,
): number {
  const linhas = quebrarTexto(texto, font, size, largura)
  let yAtual = y

  for (let i = 0; i < linhas.length; i++) {
    if (yAtual < yMin) break

    const ultimaCabivel = yAtual - entrelinha < yMin
    const sobrou = i < linhas.length - 1
    const linha = ultimaCabivel && sobrou
      ? recortar(`${linhas[i]} ...`, font, size, largura)
      : linhas[i]

    page.drawText(linha, { x, y: yAtual, size, font, color: cor })
    yAtual -= entrelinha
  }

  return yAtual
}

function quebrarTexto(texto: string, font: any, size: number, largura: number): string[] {
  const linhas: string[] = []

  for (const bloco of texto.split(/\r?\n/)) {
    let atual = ""
    for (const palavra of bloco.split(/\s+/).filter(Boolean)) {
      const tentativa = atual ? `${atual} ${palavra}` : palavra
      if (font.widthOfTextAtSize(tentativa, size) <= largura) {
        atual = tentativa
      } else {
        if (atual) linhas.push(atual)
        atual = palavra
      }
    }
    linhas.push(atual)
  }

  return linhas
}

/** Trunca com reticências para caber numa largura fixa (cabeçalho, assinatura). */
function recortar(texto: string, font: any, size: number, largura: number): string {
  if (font.widthOfTextAtSize(texto, size) <= largura) return texto
  let corte = texto
  while (corte.length > 1 && font.widthOfTextAtSize(`${corte}...`, size) > largura) {
    corte = corte.slice(0, -1)
  }
  return `${corte}...`
}

/**
 * As fontes padrão do pdf-lib usam WinAnsi: acentos do português passam, mas
 * qualquer coisa fora de Latin-1 (emoji colado na descrição, aspas curvas de
 * Word) faz o embedFont lançar. Mapeia o que dá e descarta o resto.
 */
function sanitizar(texto: string): string {
  return (texto ?? "")
    .replace(/[‘’‛]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/ /g, " ")
    // Mantem \n (quebrarTexto respeita paragrafos) + Latin-1 imprimivel.
    .replace(/[^\n\u0020-\u00ff]/g, "")
}

// ── Helpers visuais ─────────────────────────────────────────────────────────

function hexParaRgb(hex: string | null): ReturnType<typeof rgb> | null {
  if (!hex) return null
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const n = parseInt(m[1], 16)
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255)
}

async function carregarLogo(pdfDoc: PDFDocument, url: string | null) {
  if (!url) return null
  try {
    const res = await fetch(url)
    const buf = await res.arrayBuffer()
    const contentType = res.headers.get("content-type") ?? ""
    return contentType.includes("png")
      ? await pdfDoc.embedPng(buf)
      : await pdfDoc.embedJpg(buf)
  } catch {
    return null
  }
}
