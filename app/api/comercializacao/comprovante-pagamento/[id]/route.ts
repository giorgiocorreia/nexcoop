import { NextRequest, NextResponse } from 'next/server'
import { PDFDocument, rgb, StandardFonts, PDFFont } from 'pdf-lib'
import { buscarDadosComprovantePagamento } from '@/lib/comercializacao/comprovantes-pagamento'

// A4: 595 × 842 pts
const PAGE_W = 595
const PAGE_H = 842
const MARGIN = 40
const CONTENT_W = PAGE_W - MARGIN * 2
const BROWN = rgb(0.573, 0.251, 0.055)  // #92400e
const WHITE = rgb(1, 1, 1)
const BLACK = rgb(0, 0, 0)
const GRAY  = rgb(0.42, 0.42, 0.42)

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
function sa(str: string): string {
  return str.split('').map(c => ACENTO_MAP[c] ?? c).join('')
}

function fmtReal(v: number): string {
  const [i, d] = v.toFixed(2).split('.')
  return 'R$ ' + i.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + d
}

function fmtCPF(cpf: string): string {
  const s = cpf.replace(/\D/g, '')
  return s.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

function fmtCNPJ(cnpj: string): string {
  const s = cnpj.replace(/\D/g, '')
  return s.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
}

function fmtDataHora(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
}

function fmtForma(f: string | null): string {
  if (!f) return '—'
  if (f === 'especie') return 'Especie'
  if (f === 'pix') return 'Pix'
  return f
}

function fmtKg(v: number): string {
  return v.toFixed(3).replace('.', ',') + ' kg'
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
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const dados = await buscarDadosComprovantePagamento(id)

    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([PAGE_W, PAGE_H])
    const fontR = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontB = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    let y = PAGE_H - MARGIN

    // ── CABEÇALHO (retângulo marrom) ────────────────────────────────────
    const headerH = 64
    page.drawRectangle({ x: 0, y: y - headerH + MARGIN / 2, width: PAGE_W, height: headerH, color: BROWN })

    const orgNome = sa(dados.organizacao.nome).toUpperCase()
    const nomeLines = wrapText(orgNome, fontB, 14, CONTENT_W - 120)
    const nomeStartY = y - 4 - (nomeLines.length - 1) * 16
    for (let i = 0; i < nomeLines.length; i++) {
      page.drawText(nomeLines[i], { x: MARGIN, y: nomeStartY + i * 16, size: 14, font: fontB, color: WHITE })
    }

    const numStr = `N\xBA ${String(dados.comprovante.numero_sequencial).padStart(6, '0')}`
    page.drawText('COMPROVANTE DE PAGAMENTO', {
      x: PAGE_W - MARGIN - fontB.widthOfTextAtSize('COMPROVANTE DE PAGAMENTO', 9),
      y: y - 8, size: 9, font: fontB, color: WHITE,
    })
    page.drawText(numStr, {
      x: PAGE_W - MARGIN - fontB.widthOfTextAtSize(numStr, 18),
      y: y - 8 - 22, size: 18, font: fontB, color: WHITE,
    })

    y -= headerH + 16

    // ── DATA / OPERADOR ─────────────────────────────────────────────────
    const dataHora = dados.pagamento.created_at ? fmtDataHora(dados.pagamento.created_at) : '—'
    page.drawText(`Data: ${dataHora}`, { x: MARGIN, y, size: 10, font: fontR, color: BLACK })
    page.drawText(`Operador: ${sa(dados.operador.nome)}`, {
      x: PAGE_W - MARGIN - fontR.widthOfTextAtSize(`Operador: ${sa(dados.operador.nome)}`, 10),
      y, size: 10, font: fontR, color: BLACK,
    })
    y -= 20

    // Linha divisória
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) })
    y -= 20

    // ── PRODUTOR ─────────────────────────────────────────────────────────
    page.drawText('PRODUTOR', { x: MARGIN, y, size: 8, font: fontB, color: BROWN })
    y -= 16

    page.drawText(sa(dados.produtor.nome), { x: MARGIN, y, size: 13, font: fontB, color: BLACK })
    y -= 16

    if (dados.produtor.cpf) {
      page.drawText(`CPF: ${fmtCPF(dados.produtor.cpf)}`, { x: MARGIN, y, size: 10, font: fontR, color: GRAY })
      y -= 16
    }

    y -= 8
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) })
    y -= 20

    // ── PRODUTO E PAGAMENTO (tabela 5 linhas) ────────────────────────────
    page.drawText('PRODUTO E PAGAMENTO', { x: MARGIN, y, size: 8, font: fontB, color: BROWN })
    y -= 14

    function tableRow(label: string, value: string) {
      page.drawText(sa(label), { x: MARGIN, y, size: 10, font: fontR, color: GRAY })
      page.drawText(sa(value), {
        x: PAGE_W - MARGIN - fontB.widthOfTextAtSize(sa(value), 11),
        y, size: 11, font: fontB, color: BLACK,
      })
      page.drawLine({ start: { x: MARGIN, y: y - 4 }, end: { x: PAGE_W - MARGIN, y: y - 4 }, thickness: 0.3, color: rgb(0.9, 0.9, 0.9) })
      y -= 22
    }

    // Row 1: Produto
    tableRow('Produto', dados.produto?.nome ?? '—')

    // Row 2: Quantidade (só para conversao)
    if (dados.pagamento.quantidade_produto) {
      tableRow('Quantidade', fmtKg(dados.pagamento.quantidade_produto))
    } else {
      tableRow('Quantidade', '—')
    }

    // Row 3: Preco/kg (só para conversao)
    if (dados.pagamento.preco_unitario) {
      tableRow('Preco/kg', fmtReal(dados.pagamento.preco_unitario))
    } else {
      tableRow('Preco/kg', '—')
    }

    // Row 4: Forma de pagamento
    tableRow('Forma de pagamento', fmtForma(dados.pagamento.forma_pagamento))

    // Row 5: Valor total
    const valorLabel = fmtReal(Math.abs(dados.pagamento.valor_financeiro))
    page.drawText('Valor pago', { x: MARGIN, y, size: 10, font: fontR, color: GRAY })
    page.drawText(valorLabel, {
      x: PAGE_W - MARGIN - fontB.widthOfTextAtSize(valorLabel, 14),
      y: y - 2, size: 14, font: fontB, color: BROWN,
    })
    y -= 24

    y -= 8
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) })
    y -= 20

    // ── POSIÇÃO APÓS PAGAMENTO (3 linhas) ────────────────────────────────
    page.drawText('POSICAO APOS PAGAMENTO', { x: MARGIN, y, size: 8, font: fontB, color: BROWN })
    y -= 14

    tableRow('Saldo financeiro antes', fmtReal(dados.posicao.saldo_financeiro_antes))
    tableRow('Valor pago', `- ${fmtReal(dados.posicao.valor_pago)}`)

    // Saldo após (destaque)
    page.drawText('Saldo financeiro atual', { x: MARGIN, y, size: 10, font: fontB, color: BLACK })
    const saldoDepStr = fmtReal(dados.posicao.saldo_financeiro_depois)
    page.drawText(saldoDepStr, {
      x: PAGE_W - MARGIN - fontB.widthOfTextAtSize(saldoDepStr, 13),
      y, size: 13, font: fontB, color: dados.posicao.saldo_financeiro_depois >= 0 ? rgb(0.09, 0.40, 0.20) : rgb(0.60, 0.11, 0.11),
    })
    y -= 28

    y -= 8
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) })
    y -= 50  // espaço para assinatura

    // ── ASSINATURAS ──────────────────────────────────────────────────────
    const midX = PAGE_W / 2
    page.drawLine({ start: { x: MARGIN, y }, end: { x: midX - 20, y }, thickness: 0.5, color: BLACK })
    page.drawLine({ start: { x: midX + 20, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.5, color: BLACK })

    y -= 12
    page.drawText(sa(dados.produtor.nome), { x: MARGIN, y, size: 9, font: fontR, color: BLACK })
    page.drawText(sa(dados.operador.nome), { x: midX + 20, y, size: 9, font: fontR, color: BLACK })
    y -= 11
    page.drawText('Produtor(a)', { x: MARGIN, y, size: 8, font: fontR, color: GRAY })
    page.drawText('Operador(a)', { x: midX + 20, y, size: 8, font: fontR, color: GRAY })

    y -= 30

    // ── RODAPÉ ───────────────────────────────────────────────────────────
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) })
    y -= 14

    const footer = 'Documento de uso interno. Nao tem validade fiscal.'
    page.drawText(footer, {
      x: (PAGE_W - fontR.widthOfTextAtSize(footer, 8)) / 2,
      y, size: 8, font: fontR, color: GRAY,
    })
    y -= 11

    const orgCNPJ = dados.organizacao.cnpj ? `CNPJ ${fmtCNPJ(dados.organizacao.cnpj)} | ` : ''
    const footer2 = `${orgCNPJ}NexCoop - nexcoop.com.br`
    page.drawText(sa(footer2), {
      x: (PAGE_W - fontR.widthOfTextAtSize(sa(footer2), 8)) / 2,
      y, size: 8, font: fontR, color: GRAY,
    })

    const pdfBytes = await pdfDoc.save()
    const numPad = String(dados.comprovante.numero_sequencial).padStart(6, '0')

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="comprovante-pagamento-${numPad}.pdf"`,
      },
    })
  } catch (err) {
    console.error('[comprovante-pagamento] Erro:', (err as any)?.message)
    return NextResponse.json({ error: 'Erro ao gerar comprovante de pagamento' }, { status: 500 })
  }
}
