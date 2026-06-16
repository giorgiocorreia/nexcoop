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

    // 1. Busca venda sem joins
    const { data: venda, error: errVenda } = await admin
      .from('loja_vendas')
      .select('id, org_id, caixa_id, cooperado_id, total, pago_especie, pago_pix, pago_saldo, criado_em, tipo_cliente')
      .eq('id', id)
      .single()

    if (!venda) return NextResponse.json({ error: 'Venda nao encontrada' }, { status: 404 })

    // 2. Busca itens separado
    const { data: itensRaw } = await admin
      .from('loja_venda_itens')
      .select('produto_id, quantidade, preco_unitario, subtotal')
      .eq('venda_id', id)

    // 3. Busca nomes dos produtos
    const itens: any[] = []
    for (const item of itensRaw ?? []) {
      const { data: prod } = await admin
        .from('loja_produtos')
        .select('nome, unidade')
        .eq('id', item.produto_id)
        .single()
      itens.push({ ...item, nome: prod?.nome ?? '', unidade: prod?.unidade ?? '' })
    }

    // 4. Busca operador via caixa
    let nomeOperador = 'Operador'
    if (venda.caixa_id) {
      const { data: caixa } = await admin
        .from('loja_caixas')
        .select('usuario_id')
        .eq('id', venda.caixa_id)
        .single()
      if (caixa?.usuario_id) {
        const { data: usr } = await admin
          .from('usuarios')
          .select('nome_completo')
          .eq('id', caixa.usuario_id)
          .single()
        nomeOperador = usr?.nome_completo ?? 'Operador'
      }
    }

    // 5. Busca org
    const { data: org } = await admin
      .from('organizacoes')
      .select('nome, cnpj')
      .eq('id', venda.org_id)
      .single()

    // 6. Busca nome cooperado
    let nomeCooperado = ''
    if (venda.cooperado_id) {
      const { data: coop } = await admin
        .from('cooperados')
        .select('nome_completo')
        .eq('id', venda.cooperado_id)
        .single()
      nomeCooperado = coop?.nome_completo ?? ''
    }

    // Gera PDF
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
    for (const l of wrapText(semAcento(org?.nome ?? '').toUpperCase(), fontB, 9, CONTENT_W)) {
      txtC(l, fontB, 9); y -= 12
    }
    if (org?.cnpj) { txtC(`CNPJ: ${formatarCNPJ(org.cnpj)}`, fontR, 8); y -= 11 }

    y -= 4; sep(); y -= 12
    txtC('COMPROVANTE DE VENDA', fontB, 10); y -= 13
    txtC(`Venda #${id.slice(-6).toUpperCase()}`, fontR, 8); y -= 11
    txtC(formatarDataHora(venda.criado_em ?? new Date().toISOString()), fontR, 8); y -= 11

    sep(); y -= 12
    txtL(`Operador: ${semAcento(nomeOperador)}`, fontR, 8); y -= 12
    if (nomeCooperado) { txtL(`Cooperado: ${semAcento(nomeCooperado)}`, fontR, 8); y -= 12 }

    y -= 4; sep(); y -= 12

    if (itens.length === 0) {
      txtL('(sem itens registrados)', fontR, 8); y -= 12
    } else {
      for (const item of itens) {
        for (const l of wrapText(semAcento(item.nome), fontR, 8, CONTENT_W)) { txtL(l, fontR, 8); y -= 11 }
        txtL(`${item.quantidade} ${item.unidade} x ${formatarReal(item.preco_unitario)}`, fontR, 7)
        txtR(formatarReal(item.subtotal), fontR, 8); y -= 13
      }
    }

    sep(); y -= 12
    txtL('TOTAL:', fontB, 9); txtR(formatarReal(venda.total), fontB, 9); y -= 14

    sep(); y -= 12
    if (venda.pago_especie > 0) { txtL('Dinheiro:', fontR, 8); txtR(formatarReal(venda.pago_especie), fontR, 8); y -= 12 }
    if (venda.pago_pix > 0) { txtL('Pix:', fontR, 8); txtR(formatarReal(venda.pago_pix), fontR, 8); y -= 12 }
    const pagoSaldo = ((venda as any).pago_saldo as number) ?? 0
    if (pagoSaldo > 0) { txtL('Conta corrente:', fontR, 8); txtR(formatarReal(pagoSaldo), fontR, 8); y -= 12 }
    const troco = Math.max(0, (venda.pago_especie ?? 0) - venda.total + (venda.pago_pix ?? 0) + pagoSaldo)
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
