import { NextRequest, NextResponse } from 'next/server'
import { PDFDocument, rgb, StandardFonts, PDFFont } from 'pdf-lib'
import { buscarDadosDocumentoTransferencia } from '@/lib/comercializacao/documento-transferencia'

// A4: 595 x 842 pts
const PAGE_W = 595
const PAGE_H = 842
const MARGIN = 48
const CONTENT_W = PAGE_W - MARGIN * 2
const BLACK = rgb(0, 0, 0)
const VERMELHO = rgb(0.7, 0.1, 0.1)
const CINZA = rgb(0.4, 0.4, 0.4)

function formatarCNPJ(cnpj: string): string {
  const s = (cnpj ?? '').replace(/\D/g, '')
  if (s.length !== 14) return cnpj || '—'
  return s.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
}

function formatarReal(v: number): string {
  const [intPart, decPart] = Math.abs(v).toFixed(2).split('.')
  const sinal = v < 0 ? '-' : ''
  return `${sinal}R$ ${intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${decPart}`
}

function formatarKg(v: number): string {
  return `${v.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg`
}

function formatarData(iso: string): string {
  const d = new Date(iso + (iso.length === 10 ? 'T12:00:00' : ''))
  return d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
}

const ACENTO_MAP: Record<string, string> = {
  'á':'a','à':'a','ã':'a','â':'a','ä':'a','Á':'A','À':'A','Ã':'A','Â':'A','Ä':'A',
  'é':'e','è':'e','ê':'e','ë':'e','É':'E','È':'E','Ê':'E','Ë':'E',
  'í':'i','ì':'i','î':'i','ï':'i','Í':'I','Ì':'I','Î':'I','Ï':'I',
  'ó':'o','ò':'o','õ':'o','ô':'o','ö':'o','Ó':'O','Ò':'O','Õ':'O','Ô':'O','Ö':'O',
  'ú':'u','ù':'u','û':'u','ü':'u','Ú':'U','Ù':'U','Û':'U','Ü':'U',
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const dados = await buscarDadosDocumentoTransferencia(id)

    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([PAGE_W, PAGE_H])
    const fontR = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontB = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    let y = PAGE_H - MARGIN

    function txtL(text: string, font: PDFFont, size: number, color = BLACK) {
      page.drawText(text, { x: MARGIN, y, size, font, color })
    }
    function txtR(text: string, font: PDFFont, size: number, color = BLACK) {
      page.drawText(text, { x: PAGE_W - MARGIN - font.widthOfTextAtSize(text, size), y, size, font, color })
    }
    function txtC(text: string, font: PDFFont, size: number, color = BLACK) {
      page.drawText(text, { x: (PAGE_W - font.widthOfTextAtSize(text, size)) / 2, y, size, font, color })
    }
    function sep() {
      page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.75, color: BLACK })
    }
    function linha(label: string, valor: string) {
      txtL(label, fontR, 10, CINZA)
      txtR(valor, fontB, 10)
      y -= 18
    }

    // ── CABEÇALHO ──────────────────────────────────────────
    txtC(semAcento(dados.organizacao.nome).toUpperCase(), fontB, 14); y -= 16
    txtC(`CNPJ: ${formatarCNPJ(dados.organizacao.cnpj)}`, fontR, 9); y -= 24

    txtC('DOCUMENTO DE TRANSFERENCIA INTERNA', fontB, 13); y -= 30
    sep(); y -= 26

    // ── AVISO ──────────────────────────────────────────────
    const aviso1 = 'DOCUMENTO DE TRANSFERENCIA INTERNA — SEM VALOR FISCAL.'
    const aviso2 = 'A NF-e de venda desta operacao e de responsabilidade do comprador.'
    txtC(aviso1, fontB, 10, VERMELHO); y -= 14
    txtC(aviso2, fontR, 9, VERMELHO); y -= 30

    // ── DADOS DO LOTE ──────────────────────────────────────
    txtL('DADOS DO LOTE', fontB, 11); y -= 20
    linha('Codigo do lote', `Lote ${dados.lote.codigo}`)
    linha('Safra', dados.lote.safra_ano ? String(dados.lote.safra_ano) : '—')
    linha('Produto(s)', semAcento(dados.lote.produtos.join(', ')))
    linha('Peso total', formatarKg(dados.venda.quantidade_kg))
    y -= 10
    sep(); y -= 26

    // ── DADOS DO COMPRADOR ─────────────────────────────────
    txtL('DADOS DO COMPRADOR', fontB, 11); y -= 20
    linha('Nome / Razao social', semAcento(dados.comprador.nome))
    linha('CNPJ', dados.comprador.cnpj ? formatarCNPJ(dados.comprador.cnpj) : '—')
    y -= 10
    sep(); y -= 26

    // ── DADOS DA OPERACAO ──────────────────────────────────
    txtL('DADOS DA OPERACAO', fontB, 11); y -= 20
    linha('Data da transferencia', formatarData(dados.venda.data_venda))
    linha('Preco negociado', `${formatarReal(dados.venda.preco_kg)}/kg`)
    linha('Valor bruto', formatarReal(dados.venda.valor_bruto))
    y -= 10

    if (dados.venda.observacoes) {
      sep(); y -= 20
      txtL('Observacoes', fontB, 10); y -= 16
      const obsLines = wrapText(semAcento(dados.venda.observacoes), fontR, 9, CONTENT_W)
      for (const line of obsLines) { txtL(line, fontR, 9, CINZA); y -= 13 }
    }

    // ── ASSINATURAS ────────────────────────────────────────
    y -= 60
    page.drawLine({ start: { x: MARGIN, y }, end: { x: MARGIN + 200, y }, thickness: 0.5, color: BLACK })
    page.drawLine({ start: { x: PAGE_W - MARGIN - 200, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.5, color: BLACK })
    y -= 14
    txtL('Cooperativa', fontR, 9)
    page.drawText('Comprador', { x: PAGE_W - MARGIN - 200, y, size: 9, font: fontR, color: BLACK })

    // ── RODAPÉ ─────────────────────────────────────────────
    y = MARGIN
    txtC('Documento de uso interno. Nao tem validade fiscal.', fontR, 8, CINZA); y -= 11
    txtC('NexCoop - nexcoop.com.br', fontR, 8, CINZA)

    const pdfBytes = await pdfDoc.save()

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="transferencia-lote-${dados.lote.codigo}.pdf"`,
      },
    })
  } catch (err) {
    console.error('[documento-transferencia] Erro:', (err as any)?.message, (err as any)?.stack)
    return NextResponse.json({ error: 'Erro ao gerar documento' }, { status: 500 })
  }
}
