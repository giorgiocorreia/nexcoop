import { NextRequest, NextResponse } from 'next/server'
import { PDFDocument, rgb, StandardFonts, PDFFont } from 'pdf-lib'
import { createAdminClient } from '@/lib/supabase/admin'

const PAGE_W = 227
const MARGIN = 8
const CONTENT_W = PAGE_W - MARGIN * 2
const BLACK = rgb(0, 0, 0)

const ACENTO_MAP: Record<string, string> = {
  'á':'a','à':'a','ã':'a','â':'a','é':'e','è':'e','ê':'e','í':'i','ì':'i','î':'i',
  'ó':'o','ò':'o','õ':'o','ô':'o','ú':'u','ù':'u','û':'u','ç':'c','ñ':'n',
  'Á':'A','À':'A','Ã':'A','Â':'A','É':'E','È':'E','Ê':'E','Í':'I','Ì':'I','Î':'I',
  'Ó':'O','Ò':'O','Õ':'O','Ô':'O','Ú':'U','Ù':'U','Û':'U','Ç':'C','Ñ':'N',
}
function semAcento(str: string): string {
  return str.split('').map(c => ACENTO_MAP[c] ?? c).join('')
}

function fmtReal(v: number): string {
  const [i, d] = v.toFixed(2).split('.')
  return 'R$ ' + i.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + d
}

function fmtDataHora(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
}

function centeredX(text: string, font: PDFFont, size: number): number {
  return Math.max(MARGIN, (PAGE_W - font.widthOfTextAtSize(text, size)) / 2)
}

function rightX(text: string, font: PDFFont, size: number): number {
  return PAGE_W - MARGIN - font.widthOfTextAtSize(text, size)
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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const admin = createAdminClient()

    const { data: caixa, error: errCaixa } = await admin
      .from('loja_caixas')
      .select('id, org_id, usuario_id, valor_abertura, aberto_em, fechado_em, total_especie, total_pix, valor_fechamento')
      .eq('id', id)
      .single()

    if (!caixa) {
      console.error('[loja/fechamento] caixa não encontrado:', id, errCaixa)
      return NextResponse.json({ error: 'Caixa nao encontrado' }, { status: 404 })
    }

    const { data: operador } = await admin
      .from('usuarios')
      .select('nome_completo')
      .eq('id', caixa.usuario_id)
      .maybeSingle()

    const { data: org } = await admin
      .from('organizacoes')
      .select('nome, cnpj')
      .eq('id', caixa.org_id)
      .single()

    const { data: vendas } = await admin
      .from('loja_vendas')
      .select('id, total, pago_especie, pago_pix, status, criado_em')
      .eq('caixa_id', id)

    const { data: sangriasRaw } = await (admin as any)
      .from('loja_sangrias')
      .select('tipo, valor, created_at')
      .eq('caixa_id', id)

    const sangrias = (sangriasRaw ?? []) as { tipo: string; valor: number | null }[]
    const vendasConcluidas = (vendas ?? []).filter(v => v.status !== 'cancelada')
    const totalVendas = vendasConcluidas.reduce((s, v) => s + (v.total ?? 0), 0)
    const totalEspecie = vendasConcluidas.reduce((s, v) => s + (v.pago_especie ?? 0), 0)
    const totalPix = vendasConcluidas.reduce((s, v) => s + (v.pago_pix ?? 0), 0)
    const totalSangrias = sangrias.filter(s => s.tipo === 'sangria').reduce((acc, v) => acc + (v.valor ?? 0), 0)
    const totalAportes = sangrias.filter(s => s.tipo === 'aporte').reduce((acc, v) => acc + (v.valor ?? 0), 0)
    const valorAbertura = caixa.valor_abertura ?? 0
    const saldoFinal = valorAbertura + totalEspecie + totalAportes - totalSangrias

    const nomeOperador = operador?.nome_completo ?? 'Operador'

    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([PAGE_W, 700])
    const fontR = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontB = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    let y = 690

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

    // Cabeçalho
    txtC('RELATORIO DE FECHAMENTO', fontB, 10); y -= 13
    txtC('LOJA AGROPECUARIA', fontB, 9); y -= 12
    const nomeOrg = semAcento((org as any)?.nome ?? '').toUpperCase()
    for (const l of wrapText(nomeOrg, fontR, 8, CONTENT_W)) { txtC(l, fontR, 8); y -= 11 }

    y -= 4; sep(); y -= 12

    txtL(`Operador: ${semAcento(nomeOperador)}`, fontR, 8); y -= 12
    txtL(`Abertura: ${fmtDataHora(caixa.aberto_em)}`, fontR, 8); y -= 12
    txtL(`Fechamento: ${fmtDataHora(caixa.fechado_em ?? new Date().toISOString())}`, fontR, 8); y -= 16

    sep(); y -= 12

    // Resumo
    txtL('RESUMO DO CAIXA', fontB, 8); y -= 14

    function linhaRelatorio(label: string, valor: string) {
      txtL(label, fontR, 8); txtR(valor, fontR, 8); y -= 12
    }

    linhaRelatorio('Fundo de abertura:', fmtReal(valorAbertura))
    linhaRelatorio(`Vendas (${vendasConcluidas.length}):`, fmtReal(totalVendas))
    linhaRelatorio('  Dinheiro:', fmtReal(totalEspecie))
    linhaRelatorio('  Pix:', fmtReal(totalPix))
    if (totalAportes > 0) linhaRelatorio('Aportes:', fmtReal(totalAportes))
    if (totalSangrias > 0) linhaRelatorio('Sangrias:', `- ${fmtReal(totalSangrias)}`)

    y -= 4; sep(); y -= 12

    txtL('SALDO FINAL EM ESPECIE:', fontB, 9); txtR(fmtReal(saldoFinal), fontB, 9); y -= 16

    sep(); y -= 16

    // Assinatura
    y -= 30
    page.drawLine({ start: { x: 10, y }, end: { x: PAGE_W - 10, y }, thickness: 0.5, color: BLACK })
    y -= 12
    txtC(semAcento(nomeOperador), fontR, 8); y -= 10
    txtC('Operador(a) responsavel', fontR, 7); y -= 16

    sep(); y -= 10
    txtC('NexCoop - nexcoop.com.br', fontR, 7)

    const pdfBytes = await pdfDoc.save()
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="fechamento-${id.slice(-6).toUpperCase()}.pdf"`,
      },
    })
  } catch (err) {
    console.error('[loja/fechamento]', err)
    return NextResponse.json({ error: 'Erro ao gerar relatorio' }, { status: 500 })
  }
}
