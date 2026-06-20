import { NextRequest, NextResponse } from 'next/server'
import { PDFDocument, rgb, StandardFonts, PDFFont } from 'pdf-lib'
import { buscarDadosComprovantePagamento } from '@/lib/comercializacao/comprovantes-pagamento'

const PAGE_W = 227
const MARGIN = 8
const CONTENT_W = PAGE_W - MARGIN * 2
const BLACK = rgb(0, 0, 0)

function formatarCPF(cpf: string): string {
  const s = cpf.replace(/\D/g, '')
  return s.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

function formatarCNPJ(cnpj: string): string {
  const s = cnpj.replace(/\D/g, '')
  return s.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
}

function formatarReal(v: number): string {
  const [intPart, decPart] = v.toFixed(2).split('.')
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + decPart
}

function formatarKg(v: number): string {
  return `${v.toFixed(3).replace('.', ',')} kg`
}

function formatarDataHora(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
}

const ACENTO_MAP: Record<string, string> = {
  'á':'a','à':'a','ã':'a','â':'a','ä':'a',
  'Á':'A','À':'A','Ã':'A','Â':'A','Ä':'A',
  'é':'e','è':'e','ê':'e','ë':'e',
  'É':'E','È':'E','Ê':'E','Ë':'E',
  'í':'i','ì':'i','î':'i','ï':'i',
  'Í':'I','Ì':'I','Î':'I','Ï':'I',
  'ó':'o','ò':'o','õ':'o','ô':'o','ö':'o',
  'Ó':'O','Ò':'O','Õ':'O','Ô':'O','Ö':'O',
  'ú':'u','ù':'u','û':'u','ü':'u',
  'Ú':'U','Ù':'U','Û':'U','Ü':'U',
  'ç':'c','Ç':'C','ñ':'n','Ñ':'N',
}
function semAcento(str: string): string {
  return str.split('').map(c => ACENTO_MAP[c] ?? c).join('')
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (font.widthOfTextAtSize(test, size) > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines
}

function centeredX(text: string, font: PDFFont, size: number): number {
  return Math.max(MARGIN, (PAGE_W - font.widthOfTextAtSize(text, size)) / 2)
}

function rightX(text: string, font: PDFFont, size: number): number {
  return PAGE_W - MARGIN - font.widthOfTextAtSize(text, size)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const dados = await buscarDadosComprovantePagamento(id)

    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([PAGE_W, 700])
    const fontR = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontB = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    let y = 690

    function sep() {
      page.drawLine({
        start: { x: MARGIN, y },
        end: { x: PAGE_W - MARGIN, y },
        thickness: 0.5,
        color: BLACK,
      })
    }

    function txtC(text: string, font: PDFFont, size: number) {
      page.drawText(text, { x: centeredX(text, font, size), y, size, font, color: BLACK })
    }
    function txtL(text: string, font: PDFFont, size: number) {
      page.drawText(text, { x: MARGIN, y, size, font, color: BLACK })
    }
    function txtR(text: string, font: PDFFont, size: number) {
      page.drawText(text, { x: rightX(text, font, size), y, size, font, color: BLACK })
    }

    // ── CABEÇALHO ──
    const nomeLines = wrapText(semAcento(dados.organizacao.nome).toUpperCase(), fontB, 11, CONTENT_W)
    for (const line of nomeLines) { txtC(line, fontB, 11); y -= 14 }

    txtC(`CNPJ: ${formatarCNPJ(dados.organizacao.cnpj)}`, fontR, 8); y -= 11

    y -= 4; sep(); y -= 13

    txtC('COMPROVANTE DE PAGAMENTO', fontB, 11); y -= 14

    const numStr = `N\xBA ${String(dados.comprovante.numero_sequencial).padStart(6, '0')}`
    txtC(numStr, fontR, 8); y -= 11

    sep(); y -= 13

    // ── META ──
    txtL(`Data: ${formatarDataHora(dados.comprovante.emitido_em)}`, fontR, 8); y -= 12
    txtL(`Operador: ${semAcento(dados.operador.nome)}`, fontR, 8); y -= 16

    // ── PRODUTOR ──
    sep(); y -= 13
    txtL('PRODUTOR', fontB, 8); y -= 13
    const produtorLines = wrapText(semAcento(dados.produtor.nome), fontB, 9, CONTENT_W)
    for (const line of produtorLines) { txtL(line, fontB, 9); y -= 12 }
    const cpfStr = dados.produtor.cpf ? formatarCPF(dados.produtor.cpf) : '—'
    const tipoStr = dados.produtor.tipo === 'cooperado' ? 'Cooperado' : dados.produtor.tipo === 'externo' ? 'Externo' : dados.produtor.tipo
    txtL(`CPF: ${cpfStr}   ${semAcento(tipoStr)}`, fontR, 8); y -= 16

    // ── PRODUTO E PAGAMENTO ──
    sep(); y -= 13
    txtL('PRODUTO E PAGAMENTO', fontB, 8); y -= 13

    if (dados.produto.nome) {
      txtL(semAcento(dados.produto.nome), fontR, 8); y -= 12
    }

    if (dados.pagamento.quantidade_kg > 0) {
      txtL('Qtd vendida:', fontR, 8)
      txtR(formatarKg(dados.pagamento.quantidade_kg), fontB, 8)
      y -= 12

      txtL('Cotacao:', fontR, 8)
      txtR(`R$ ${formatarReal(dados.pagamento.cotacao)}/kg`, fontB, 8)
      y -= 10

      page.drawLine({ start: { x: PAGE_W / 2, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.5, color: BLACK })
      y -= 11
    }

    txtL('Valor pago:', fontB, 8)
    txtR(`R$ ${formatarReal(dados.pagamento.valor_pago)}`, fontB, 8)
    y -= 12

    txtL('Forma:', fontR, 8)
    txtR(dados.pagamento.forma, fontR, 8)
    y -= 16

    // ── POSIÇÃO APÓS PAGAMENTO ──
    sep(); y -= 13
    txtL('POSICAO APOS PAGAMENTO', fontB, 8); y -= 13

    txtL('Total entregue:', fontR, 8)
    txtR(formatarKg(dados.posicao.total_entregue_kg), fontR, 8)
    y -= 12

    txtL('Total vendido:', fontR, 8)
    txtR(formatarKg(dados.posicao.total_vendido_kg), fontR, 8)
    y -= 10

    page.drawLine({ start: { x: PAGE_W / 2, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.5, color: BLACK })
    y -= 11

    const saldoStr = formatarKg(dados.posicao.saldo_ordem_kg)
    txtL('Saldo a ordem:', fontB, 8)
    txtR(saldoStr, fontB, 8)
    y -= 16

    // ── ASSINATURAS ──
    sep(); y -= 14
    y -= 35

    page.drawLine({ start: { x: 10, y }, end: { x: 100, y }, thickness: 0.5, color: BLACK })
    page.drawLine({ start: { x: 115, y }, end: { x: 205, y }, thickness: 0.5, color: BLACK })

    y -= 12
    page.drawText(semAcento(dados.produtor.nome), { x: 10, y, size: 8, font: fontR, color: BLACK })
    page.drawText(semAcento(dados.operador.nome), { x: 115, y, size: 8, font: fontR, color: BLACK })

    y -= 12
    page.drawText('Produtor(a)', { x: 10, y, size: 7, font: fontR, color: BLACK })
    page.drawText('Operador(a)', { x: 115, y, size: 7, font: fontR, color: BLACK })
    y -= 14

    sep(); y -= 12

    // ── RODAPÉ ──
    const footer1Lines = wrapText('Documento de uso interno. Nao tem validade fiscal.', fontR, 7, CONTENT_W)
    for (const line of footer1Lines) { txtC(line, fontR, 7); y -= 9 }
    txtC('NexCoop - nexcoop.com.br', fontR, 7)

    const pdfBytes = await pdfDoc.save()

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="pagamento-${String(dados.comprovante.numero_sequencial).padStart(6, '0')}.pdf"`,
      },
    })
  } catch (err) {
    console.error('[comprovante-pagamento] Erro:', (err as any)?.message, (err as any)?.stack)
    return NextResponse.json({ error: 'Erro ao gerar comprovante' }, { status: 500 })
  }
}
