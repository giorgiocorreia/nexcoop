import { NextRequest, NextResponse } from 'next/server'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { buscarDadosComprovante } from '@/lib/comercializacao/notas'

function formatarCPF(cpf: string): string {
  const s = cpf.replace(/\D/g, '')
  return s.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

function formatarCNPJ(cnpj: string): string {
  const s = cnpj.replace(/\D/g, '')
  return s.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
}

function formatarKg(valor: number): string {
  if (Number.isInteger(valor)) return `${valor} kg`
  return `${valor.toFixed(3).replace('.', ',')} kg`
}

function formatarData(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const dados = await buscarDadosComprovante(id)

    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([595, 842]) // A4
    const { width, height } = page.getSize()

    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    const marrom = rgb(0.573, 0.251, 0.055)
    const cinzaEscuro = rgb(0.2, 0.2, 0.2)
    const cinzaMedio = rgb(0.5, 0.5, 0.5)
    const cinzaClaro = rgb(0.93, 0.93, 0.93)

    let y = height - 40

    // Barra de cor no topo
    page.drawRectangle({ x: 0, y: height - 60, width, height: 60, color: marrom })

    page.drawText(dados.organizacao.nome.toUpperCase(), {
      x: 30, y: height - 30,
      size: 10, font: fontBold, color: rgb(1, 1, 1),
      maxWidth: width - 180,
    })
    page.drawText(`CNPJ: ${formatarCNPJ(dados.organizacao.cnpj)}`, {
      x: 30, y: height - 46,
      size: 8, font: fontRegular, color: rgb(0.9, 0.9, 0.9),
    })

    const numText = `Nº ${String(dados.nota.numero_sequencial).padStart(6, '0')}`
    const numW = fontBold.widthOfTextAtSize(numText, 18)
    page.drawText(numText, {
      x: width - numW - 30, y: height - 35,
      size: 18, font: fontBold, color: rgb(1, 1, 1),
    })
    page.drawText('COMPROVANTE DE ENTREGA', {
      x: width - 175, y: height - 50,
      size: 7, font: fontRegular, color: rgb(0.85, 0.85, 0.85),
    })

    y = height - 80

    page.drawText(`Emitido em: ${formatarData(dados.nota.emitida_em)}`, {
      x: 30, y, size: 9, font: fontRegular, color: cinzaMedio,
    })
    page.drawText(`Operador: ${dados.operador.nome}`, {
      x: 300, y, size: 9, font: fontRegular, color: cinzaMedio,
    })

    y -= 24

    // Seção Produtor
    page.drawRectangle({ x: 30, y: y - 2, width: width - 60, height: 14, color: cinzaClaro })
    page.drawText('PRODUTOR', { x: 34, y, size: 8, font: fontBold, color: marrom })
    y -= 20

    page.drawText(dados.produtor.nome, {
      x: 30, y, size: 11, font: fontBold, color: cinzaEscuro,
    })
    y -= 16
    page.drawText(`CPF: ${formatarCPF(dados.produtor.cpf)}   |   Município: ${dados.produtor.municipio || '—'}`, {
      x: 30, y, size: 9, font: fontRegular, color: cinzaMedio,
    })

    y -= 28

    // Seção Produto
    page.drawRectangle({ x: 30, y: y - 2, width: width - 60, height: 14, color: cinzaClaro })
    page.drawText('PRODUTO ENTREGUE', { x: 34, y, size: 8, font: fontBold, color: marrom })
    y -= 22

    page.drawRectangle({
      x: 30, y: y - 10, width: width - 60, height: 44,
      color: rgb(0.99, 0.97, 0.94),
      borderColor: marrom, borderWidth: 1,
    })
    page.drawText(dados.produto.nome, {
      x: 42, y: y + 16, size: 13, font: fontBold, color: cinzaEscuro,
    })
    const kgText = formatarKg(dados.movimentacao.quantidade_produto)
    const kgW = fontBold.widthOfTextAtSize(kgText, 20)
    page.drawText(kgText, {
      x: width - kgW - 42, y: y + 14, size: 20, font: fontBold, color: marrom,
    })
    page.drawText(dados.produto.unidade || 'kg', {
      x: width - kgW - 42, y: y - 4, size: 8, font: fontRegular, color: cinzaMedio,
    })

    y -= 50

    // Rateio
    if (dados.rateio.length > 0) {
      y -= 6
      page.drawRectangle({ x: 30, y: y - 2, width: width - 60, height: 14, color: cinzaClaro })
      page.drawText('RATEIO DA ENTREGA', { x: 34, y, size: 8, font: fontBold, color: marrom })
      y -= 20

      page.drawText('Participante', { x: 30, y, size: 8, font: fontBold, color: cinzaEscuro })
      page.drawText('CPF', { x: 250, y, size: 8, font: fontBold, color: cinzaEscuro })
      page.drawText('%', { x: 380, y, size: 8, font: fontBold, color: cinzaEscuro })
      page.drawText('Quantidade', { x: 430, y, size: 8, font: fontBold, color: cinzaEscuro })
      y -= 4
      page.drawLine({ start: { x: 30, y }, end: { x: width - 30, y }, thickness: 0.5, color: cinzaClaro })
      y -= 14

      for (const p of dados.rateio) {
        page.drawText(p.nome, { x: 30, y, size: 8, font: fontRegular, color: cinzaEscuro, maxWidth: 210 })
        page.drawText(formatarCPF(p.cpf), { x: 250, y, size: 8, font: fontRegular, color: cinzaEscuro })
        page.drawText(`${p.percentual}%`, { x: 380, y, size: 8, font: fontRegular, color: cinzaEscuro })
        page.drawText(formatarKg(p.quantidade_kg), { x: 430, y, size: 8, font: fontRegular, color: cinzaEscuro })
        y -= 16
      }
    }

    // Observações
    if (dados.movimentacao.observacoes) {
      y -= 10
      page.drawRectangle({ x: 30, y: y - 2, width: width - 60, height: 14, color: cinzaClaro })
      page.drawText('OBSERVAÇÕES', { x: 34, y, size: 8, font: fontBold, color: marrom })
      y -= 18
      page.drawText(dados.movimentacao.observacoes, {
        x: 30, y, size: 9, font: fontRegular, color: cinzaEscuro, maxWidth: width - 60,
      })
      y -= 20
    }

    // Assinaturas
    y = Math.min(y - 30, 200)

    page.drawLine({ start: { x: 60, y }, end: { x: 250, y }, thickness: 0.8, color: cinzaMedio })
    page.drawText('Assinatura do Produtor', {
      x: 80, y: y - 14, size: 8, font: fontRegular, color: cinzaMedio,
    })
    page.drawText(dados.produtor.nome, {
      x: 62, y: y - 24, size: 7, font: fontRegular, color: cinzaMedio, maxWidth: 180,
    })

    page.drawLine({ start: { x: 340, y }, end: { x: 540, y }, thickness: 0.8, color: cinzaMedio })
    page.drawText('Assinatura do Operador', {
      x: 358, y: y - 14, size: 8, font: fontRegular, color: cinzaMedio,
    })
    page.drawText(dados.operador.nome, {
      x: 342, y: y - 24, size: 7, font: fontRegular, color: cinzaMedio, maxWidth: 180,
    })

    // Rodapé
    page.drawLine({ start: { x: 30, y: 40 }, end: { x: width - 30, y: 40 }, thickness: 0.5, color: cinzaClaro })
    page.drawText('Documento de uso interno. Não tem validade fiscal.', {
      x: 30, y: 28, size: 7, font: fontRegular, color: cinzaMedio,
    })
    page.drawText('NexCoop — nexcoop.com.br', {
      x: width - 145, y: 28, size: 7, font: fontRegular, color: cinzaMedio,
    })

    const pdfBytes = await pdfDoc.save()

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="comprovante-${String(dados.nota.numero_sequencial).padStart(6, '0')}.pdf"`,
      },
    })
  } catch (err) {
    console.error('[comprovante] Erro:', err)
    return NextResponse.json({ error: 'Erro ao gerar comprovante' }, { status: 500 })
  }
}
