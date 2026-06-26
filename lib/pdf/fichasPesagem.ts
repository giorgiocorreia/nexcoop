import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib"

interface GerarFichasParams {
  inicio: number
  fim: number
  orgNome: string
  orgLogoUrl: string | null
  dataHoje: string
}

export async function gerarFichasPesagemPDF(params: GerarFichasParams): Promise<Uint8Array> {
  const { inicio, fim, orgNome, orgLogoUrl, dataHoje } = params
  const totalFichas = fim - inicio + 1
  const totalPaginas = Math.ceil(totalFichas / 8)

  const pdfDoc = await PDFDocument.create()
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  let logoImage: Awaited<ReturnType<typeof pdfDoc.embedJpg>> | null = null
  if (orgLogoUrl) {
    try {
      const res = await fetch(orgLogoUrl)
      const buf = await res.arrayBuffer()
      const contentType = res.headers.get("content-type") ?? ""
      logoImage = contentType.includes("png")
        ? await pdfDoc.embedPng(buf)
        : await pdfDoc.embedJpg(buf)
    } catch {
      logoImage = null
    }
  }

  const PW = 595
  const PH = 842
  const MARGIN = 14
  const COL_GAP = 8
  const ROW_GAP = 6
  const FICHA_W = (PW - MARGIN * 2 - COL_GAP) / 2
  const FICHA_H = (PH - MARGIN * 2 - ROW_GAP * 3) / 4

  let fichaIdx = 0

  for (let p = 0; p < totalPaginas; p++) {
    const page = pdfDoc.addPage([PW, PH])

    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 2; col++) {
        if (fichaIdx >= totalFichas) break

        const x = MARGIN + col * (FICHA_W + COL_GAP)
        const yBase = PH - MARGIN - (row + 1) * FICHA_H - row * ROW_GAP

        desenharFicha({
          page, x, y: yBase, w: FICHA_W, h: FICHA_H,
          numero: inicio + fichaIdx,
          data: dataHoje, orgNome, logoImage, fontRegular, fontBold,
        })

        fichaIdx++
      }
    }
  }

  return pdfDoc.save()
}

function desenharFicha({
  page, x, y, w, h, numero, data, orgNome, logoImage, fontRegular, fontBold,
}: {
  page: ReturnType<PDFDocument["addPage"]>
  x: number; y: number; w: number; h: number
  numero: number
  data: string
  orgNome: string
  logoImage: Awaited<ReturnType<PDFDocument["embedJpg"]>> | null
  fontRegular: Awaited<ReturnType<PDFDocument["embedFont"]>>
  fontBold: Awaited<ReturnType<PDFDocument["embedFont"]>>
}) {
  const gray = rgb(0.3, 0.3, 0.3)
  const black = rgb(0, 0, 0)
  const lightGray = rgb(0.85, 0.85, 0.85)

  page.drawRectangle({ x, y, width: w, height: h, borderColor: rgb(0.2, 0.2, 0.2), borderWidth: 1 })

  page.drawText(orgNome.toUpperCase(), {
    x: x + w * 0.1, y: y + h * 0.3, size: 22, font: fontBold,
    color: rgb(0.88, 0.88, 0.88), rotate: degrees(30), opacity: 0.35,
  })

  const headerH = 28
  page.drawRectangle({ x, y: y + h - headerH, width: w, height: headerH, color: rgb(0.97, 0.97, 0.97), borderColor: rgb(0.7, 0.7, 0.7), borderWidth: 0.5 })

  if (logoImage) {
    const logoDims = logoImage.scaleToFit(36, 20)
    page.drawImage(logoImage, { x: x + 4, y: y + h - headerH + (headerH - logoDims.height) / 2, width: logoDims.width, height: logoDims.height })
  } else {
    page.drawText(orgNome.toUpperCase(), { x: x + 5, y: y + h - 18, size: 7, font: fontBold, color: black })
  }

  page.drawText("FICHA DE PESAGEM", { x: x + (logoImage ? 44 : 5), y: y + h - 13, size: 7, font: fontBold, color: black })
  page.drawText("Cacau", { x: x + (logoImage ? 44 : 5), y: y + h - 22, size: 6, font: fontRegular, color: gray })

  const numStr = `Nº ${String(numero).padStart(6, "0")}`
  const numW = fontBold.widthOfTextAtSize(numStr, 9)
  page.drawText(numStr, { x: x + w - numW - 5, y: y + h - 17, size: 9, font: fontBold, color: rgb(0.42, 0.25, 0.04) })

  const lineY = (n: number) => y + h - headerH - 14 - n * 20
  const lineX = x + 5
  const lineW = w - 10

  const desenharCampo = (label: string, yPos: number, valorPre?: string) => {
    page.drawText(label, { x: lineX, y: yPos + 4, size: 6, font: fontBold, color: gray })
    page.drawLine({ start: { x: lineX, y: yPos }, end: { x: lineX + lineW, y: yPos }, thickness: 0.5, color: lightGray })
    if (valorPre) {
      const vw = fontRegular.widthOfTextAtSize(valorPre, 7)
      page.drawText(valorPre, { x: lineX + lineW - vw, y: yPos + 1, size: 7, font: fontRegular, color: black })
    }
  }

  desenharCampo("PRODUTOR:", lineY(0))
  desenharCampo("DATA:", lineY(1), data)
  desenharCampo("PRODUTO ENTREGUE:", lineY(2))

  page.drawLine({ start: { x: x + 4, y: lineY(3) + 8 }, end: { x: x + w - 4, y: lineY(3) + 8 }, thickness: 0.3, color: lightGray })

  const halfW = (lineW - 8) / 2
  page.drawText("PESO BRUTO (kg)", { x: lineX, y: lineY(3) + 4, size: 6, font: fontBold, color: gray })
  page.drawLine({ start: { x: lineX, y: lineY(3) }, end: { x: lineX + halfW, y: lineY(3) }, thickness: 0.5, color: lightGray })
  page.drawText("PESO LÍQUIDO (kg)", { x: lineX + halfW + 8, y: lineY(3) + 4, size: 6, font: fontBold, color: gray })
  page.drawLine({ start: { x: lineX + halfW + 8, y: lineY(3) }, end: { x: lineX + lineW, y: lineY(3) }, thickness: 0.5, color: lightGray })

  desenharCampo("OBSERVAÇÕES:", lineY(4))
  page.drawLine({ start: { x: lineX, y: lineY(5) + 4 }, end: { x: lineX + lineW, y: lineY(5) + 4 }, thickness: 0.5, color: lightGray })

  const footerY = y + 5
  page.drawLine({ start: { x: x + 4, y: footerY + 10 }, end: { x: x + w - 4, y: footerY + 10 }, thickness: 0.3, color: lightGray })
  const footer = "nexcoop.com.br"
  const fw = fontRegular.widthOfTextAtSize(footer, 5.5)
  page.drawText(footer, { x: x + (w - fw) / 2, y: footerY + 2, size: 5.5, font: fontRegular, color: rgb(0.6, 0.6, 0.6) })
}
