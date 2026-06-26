import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib"

interface GerarFichasParams {
  inicio: number
  fim: number
  orgNome: string
  orgLogoUrl: string | null
}

export async function gerarFichasPesagemPDF(params: GerarFichasParams): Promise<Uint8Array> {
  const { inicio, fim, orgNome, orgLogoUrl } = params
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
        const yBase = PH - MARGIN - FICHA_H - row * (FICHA_H + ROW_GAP)

        desenharFicha({
          page, x, y: yBase, w: FICHA_W, h: FICHA_H,
          numero: inicio + fichaIdx,
          orgNome, logoImage, fontRegular, fontBold,
        })

        fichaIdx++
      }
    }
  }

  return pdfDoc.save()
}

function desenharFicha({
  page, x, y, w, h, numero, orgNome, logoImage, fontRegular, fontBold,
}: {
  page: any
  x: number; y: number; w: number; h: number
  numero: number
  orgNome: string
  logoImage: any
  fontRegular: any
  fontBold: any
}) {
  const gray = rgb(0.3, 0.3, 0.3)
  const black = rgb(0, 0, 0)
  const lightGray = rgb(0.82, 0.82, 0.82)
  const corMarrom = rgb(0.42, 0.25, 0.04)

  // Borda externa
  page.drawRectangle({ x, y, width: w, height: h, borderColor: rgb(0.2, 0.2, 0.2), borderWidth: 1 })

  // Marca d'água diagonal
  page.drawText(orgNome.toUpperCase(), {
    x: x + w * 0.08,
    y: y + h * 0.28,
    size: 24,
    font: fontBold,
    color: rgb(0.88, 0.88, 0.88),
    rotate: degrees(30),
    opacity: 0.32,
  })

  // === HEADER ===
  const headerH = 32
  page.drawRectangle({
    x, y: y + h - headerH, width: w, height: headerH,
    color: rgb(0.97, 0.97, 0.97),
    borderColor: rgb(0.7, 0.7, 0.7),
    borderWidth: 0.5,
  })

  if (logoImage) {
    const logoDims = logoImage.scaleToFit(40, 24)
    page.drawImage(logoImage, {
      x: x + 5,
      y: y + h - headerH + (headerH - logoDims.height) / 2,
      width: logoDims.width,
      height: logoDims.height,
    })
  }

  // Título centralizado
  const titulo = "FICHA DE PESAGEM"
  const tituloSize = 10
  const tituloW = fontBold.widthOfTextAtSize(titulo, tituloSize)
  page.drawText(titulo, {
    x: x + (w - tituloW) / 2,
    y: y + h - headerH + (headerH - tituloSize) / 2 + 2,
    size: tituloSize,
    font: fontBold,
    color: black,
  })

  // Número da ficha — direita do header
  const numStr = `Nº ${String(numero).padStart(6, "0")}`
  const numSize = 10
  const numW = fontBold.widthOfTextAtSize(numStr, numSize)
  page.drawText(numStr, {
    x: x + w - numW - 6,
    y: y + h - headerH + (headerH - numSize) / 2 + 2,
    size: numSize,
    font: fontBold,
    color: corMarrom,
  })

  // === CAMPOS ===
  const lineX = x + 6
  const lineW = w - 12
  const bodyTop = y + h - headerH - 6

  const campo = (label: string, yPos: number, largura?: number, valorPre?: string) => {
    const lw = largura ?? lineW
    page.drawText(label, { x: lineX, y: yPos + 5, size: 6, font: fontBold, color: gray })
    page.drawLine({
      start: { x: lineX, y: yPos },
      end: { x: lineX + lw, y: yPos },
      thickness: 0.5,
      color: lightGray,
    })
    if (valorPre) {
      const vw = fontRegular.widthOfTextAtSize(valorPre, 7)
      page.drawText(valorPre, { x: lineX + lw - vw, y: yPos + 1, size: 7, font: fontRegular, color: gray })
    }
  }

  campo("PRODUTOR:", bodyTop - 16, lineW)
  campo("DATA:", bodyTop - 36, lineW * 0.45, "____/____/________")
  campo("PRODUTO ENTREGUE:", bodyTop - 56, lineW)

  page.drawLine({
    start: { x: x + 4, y: bodyTop - 66 },
    end: { x: x + w - 4, y: bodyTop - 66 },
    thickness: 0.3,
    color: lightGray,
  })

  campo("PESO BRUTO (kg)", bodyTop - 82, lineW)
  campo("OBSERVAÇÕES:", bodyTop - 100, lineW)

  page.drawLine({
    start: { x: lineX, y: bodyTop - 116 },
    end: { x: lineX + lineW, y: bodyTop - 116 },
    thickness: 0.5,
    color: lightGray,
  })

  page.drawLine({
    start: { x: lineX, y: bodyTop - 130 },
    end: { x: lineX + lineW, y: bodyTop - 130 },
    thickness: 0.5,
    color: lightGray,
  })

  // === RODAPÉ ===
  page.drawLine({
    start: { x: x + 4, y: y + 12 },
    end: { x: x + w - 4, y: y + 12 },
    thickness: 0.3,
    color: lightGray,
  })
  const footer = "nexcoop.com.br"
  const fw = fontRegular.widthOfTextAtSize(footer, 5.5)
  page.drawText(footer, {
    x: x + (w - fw) / 2,
    y: y + 4,
    size: 5.5,
    font: fontRegular,
    color: rgb(0.6, 0.6, 0.6),
  })
}
