import { NextRequest, NextResponse } from 'next/server'
import { PDFDocument, rgb, StandardFonts, PDFFont } from 'pdf-lib'
import { createAdminClient } from '@/lib/supabase/admin'

const PAGE_W = 227
const MARGIN = 8
const CONTENT_W = PAGE_W - MARGIN * 2
const BLACK = rgb(0, 0, 0)

const ACENTO_MAP: Record<string, string> = {
  'à':'a','á':'a','â':'a','ã':'a','ä':'a',
  'À':'A','Á':'A','Â':'A','Ã':'A','Ä':'A',
  'è':'e','é':'e','ê':'e','ë':'e',
  'È':'E','É':'E','Ê':'E','Ë':'E',
  'ì':'i','í':'i','î':'i','ï':'i',
  'Ì':'I','Í':'I','Î':'I','Ï':'I',
  'ò':'o','ó':'o','ô':'o','õ':'o','ö':'o',
  'Ò':'O','Ó':'O','Ô':'O','Õ':'O','Ö':'O',
  'ù':'u','ú':'u','û':'u','ü':'u',
  'Ù':'U','Ú':'U','Û':'U','Ü':'U',
  'ç':'c','Ç':'C','ñ':'n','Ñ':'N',
}
function semAcento(str: string): string {
  return str.split('').map(c => ACENTO_MAP[c] ?? c).join('')
}

function formatarReal(v: number): string {
  const [i, d] = v.toFixed(2).split('.')
  return 'R$ ' + i.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + d
}

function formatarCNPJ(cnpj: string): string {
  const s = cnpj.replace(/\D/g, '')
  return s.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
}

function formatarDataHora(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (font.widthOfTextAtSize(test, size) > maxWidth && line) {
      lines.push(line); line = word
    } else { line = test }
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
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const admin = createAdminClient()

    const { data: venda } = await admin
      .from('loja_vendas')
      .select(`
        id, org_id, total, desconto_total, pago_especie, pago_pix, criado_em,
        tipo_cliente, cooperado_id,
        loja_caixas ( usuario_id, usuarios ( nome_completo ) ),
        loja_venda_itens (
          quantidade, preco_unitario, desconto_pct, subtotal,
          loja_produtos ( nome, unidade )
        )
      `)
      .eq('id', id)
      .single()

    if (!venda) return NextResponse.json({ error: 'Venda nao encontrada' }, { status: 404 })

    const { data: org } = await admin
      .from('organizacoes')
      .select('nome, cnpj')
      .eq('id', venda.org_id)
      .single()

    let nomeCooperado = ''
    if (venda.cooperado_id) {
      const { data: coop } = await admin
        .from('cooperados')
        .select('produtores ( nome )')
        .eq('id', venda.cooperado_id)
        .single()
      nomeCooperado = (coop?.produtores as any)?.nome ?? ''
    }

    const caixa = venda.loja_caixas as any
    const nomeOperador = caixa?.usuarios?.nome_completo ?? 'Operador'
    const itens = (venda.loja_venda_itens ?? []) as unknown as any[]

    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([PAGE_W, 800])
    const fontR = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontB = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    let y = 790

    function sep() {
      page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.5, color: BLACK })
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

    txtC('LOJA AGROPECUARIA', fontB, 11); y -= 14
    const nomeOrgLines = wrapText(semAcento((org as any)?.nome ?? '').toUpperCase(), fontB, 9, CONTENT_W)
    for (const l of nomeOrgLines) { txtC(l, fontB, 9); y -= 12 }
    if ((org as any)?.cnpj) { txtC(`CNPJ: ${formatarCNPJ((org as any).cnpj)}`, fontR, 8); y -= 11 }

    y -= 4; sep(); y -= 12

    txtC('COMPROVANTE DE VENDA', fontB, 10); y -= 13
    txtC(`Venda #${id.slice(-6).toUpperCase()}`, fontR, 8); y -= 11
    txtC(formatarDataHora(venda.criado_em ?? new Date().toISOString()), fontR, 8); y -= 11

    sep(); y -= 12

    txtL(`Operador: ${semAcento(nomeOperador)}`, fontR, 8); y -= 12
    if (nomeCooperado) {
      txtL(`Cooperado: ${semAcento(nomeCooperado)}`, fontR, 8); y -= 12
    }

    y -= 4; sep(); y -= 12

    for (const item of itens) {
      const nomeProd = semAcento(item.loja_produtos?.nome ?? '')
      const nomeLines = wrapText(nomeProd, fontR, 8, CONTENT_W)
      for (const l of nomeLines) { txtL(l, fontR, 8); y -= 11 }
      const qtdStr = `${item.quantidade} ${item.loja_produtos?.unidade ?? ''}`
      const descStr = item.desconto_pct > 0 ? ` (-${item.desconto_pct}%)` : ''
      const precoStr = `${qtdStr} x ${formatarReal(item.preco_unitario)}${descStr}`
      txtL(precoStr, fontR, 7); txtR(formatarReal(item.subtotal), fontR, 8); y -= 13
    }

    sep(); y -= 12

    const descontoTotal = (venda.desconto_total as number) ?? 0
    if (descontoTotal > 0) {
      txtL('Subtotal:', fontR, 8); txtR(formatarReal(venda.total + descontoTotal), fontR, 8); y -= 12
      txtL('Desconto:', fontR, 8); txtR(`- ${formatarReal(descontoTotal)}`, fontR, 8); y -= 12
    }
    txtL('TOTAL:', fontB, 9); txtR(formatarReal(venda.total), fontB, 9); y -= 14

    sep(); y -= 12

    if (venda.pago_especie > 0) { txtL('Dinheiro:', fontR, 8); txtR(formatarReal(venda.pago_especie), fontR, 8); y -= 12 }
    if (venda.pago_pix > 0) { txtL('Pix:', fontR, 8); txtR(formatarReal(venda.pago_pix), fontR, 8); y -= 12 }
    const pagoConta = (venda as any).pago_conta ?? 0
    if (pagoConta > 0) { txtL('Conta corrente:', fontR, 8); txtR(formatarReal(pagoConta), fontR, 8); y -= 12 }
    const troco = Math.max(0, venda.pago_especie - (venda.total - venda.pago_pix - pagoConta))
    if (troco > 0) { txtL('Troco:', fontR, 8); txtR(formatarReal(troco), fontR, 8); y -= 12 }

    y -= 4; sep(); y -= 14

    txtC('OBRIGADO PELA PREFERENCIA!', fontB, 9); y -= 13
    txtC('NexCoop - nexcoop.com.br', fontR, 7)

    const pdfBytes = await pdfDoc.save()
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="venda-${id.slice(-6).toUpperCase()}.pdf"`,
      },
    })
  } catch (err) {
    console.error('[loja/comprovante]', err)
    return NextResponse.json({ error: 'Erro ao gerar comprovante' }, { status: 500 })
  }
}
