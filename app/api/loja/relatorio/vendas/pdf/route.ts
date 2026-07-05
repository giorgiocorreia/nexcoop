import { NextRequest, NextResponse } from 'next/server'
import { PDFDocument, rgb, StandardFonts, PDFFont, PDFPage } from 'pdf-lib'
import { createClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/supabase/impersonation'
import { getVendasRelatorio } from '@/lib/loja/vendas-relatorio-actions'
import { podeGerenciarLoja } from '@/lib/permissoes'

const ACENTO_MAP: Record<string, string> = {
  'á':'a','à':'a','ã':'a','â':'a','é':'e','è':'e','ê':'e','í':'i','ì':'i','î':'i',
  'ó':'o','ò':'o','õ':'o','ô':'o','ú':'u','ù':'u','û':'u','ç':'c','ñ':'n',
  'Á':'A','À':'A','Ã':'A','Â':'A','É':'E','È':'E','Ê':'E','Í':'I','Ì':'I','Î':'I',
  'Ó':'O','Ò':'O','Õ':'O','Ô':'O','Ú':'U','Ù':'U','Û':'U','Ç':'C','Ñ':'N',
}

function sa(str: string): string {
  return (str ?? '').split('').map(c => ACENTO_MAP[c] ?? c).join('')
}

function fmtReal(v: number): string {
  const [i, d] = Math.abs(v).toFixed(2).split('.')
  return 'R$ ' + i.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + d
}

function fmtForma(f: string): string {
  const map: Record<string, string> = {
    especie: 'Dinheiro',
    pix: 'PIX',
    cartao: 'Cartao',
    credito_cooperado: 'Credito Coop.',
  }
  return map[f] ?? f
}

const W = 595
const H = 842
const ML = 40
const MR = 40
const CW = W - ML - MR
const PRETO = rgb(0, 0, 0)
const CINZA = rgb(0.45, 0.45, 0.45)
const CINZA_CL = rgb(0.80, 0.80, 0.80)
const CINZA_BG = rgb(0.92, 0.92, 0.92)

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const ctx = await getOrgContext()
    if (!ctx) {
      return NextResponse.json({ error: 'Organizacao nao encontrada' }, { status: 403 })
    }

    const { data: usuario } = await ctx.supabase
      .from('usuarios')
      .select('role, funcoes')
      .eq('id', user.id)
      .single()

    const isGerente = podeGerenciarLoja({
      role: usuario?.role ?? '',
      funcoes: (usuario?.funcoes ?? []) as string[],
    })

    const url = new URL(request.url)
    const dataInicio = url.searchParams.get('dataInicio') ?? undefined
    const dataFim = url.searchParams.get('dataFim') ?? undefined

    const [vendas, { data: org }] = await Promise.all([
      getVendasRelatorio(ctx.orgId, {
        dataInicio,
        dataFim,
        usuarioId: isGerente ? undefined : user.id,
      }),
      ctx.supabase
        .from('organizacoes')
        .select('nome, cnpj')
        .eq('id', ctx.orgId)
        .single(),
    ])

    const totalGeral = vendas.reduce((a, v) => a + v.total, 0)
    const totalEspecie = vendas.reduce((a, v) => a + v.pago_especie, 0)
    const totalPix = vendas.reduce((a, v) => a + v.pago_pix, 0)
    const totalCartao = vendas.reduce((a, v) => a + v.pago_cartao, 0)
    const totalSaldo = vendas.reduce((a, v) => a + v.pago_saldo, 0)

    const pdfDoc = await PDFDocument.create()
    const fontR = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontB = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    let page: PDFPage = pdfDoc.addPage([W, H])
    let y = H - 40

    function novaPagina() {
      page = pdfDoc.addPage([W, H])
      y = H - 40
      page.drawText(sa(org?.nome ?? 'Loja') + ' — Relatorio de Vendas (cont.)', {
        x: ML, y, size: 7, font: fontR, color: CINZA,
      })
      y -= 20
      desenharCabecalhoTabela(y)
      y -= 22
    }

    function desenharCabecalhoTabela(yy: number) {
      page.drawRectangle({ x: ML, y: yy - 14, width: CW, height: 18, color: CINZA_BG })
      const cols = [
        { label: 'Data', x: ML + 4 },
        { label: 'Hora', x: ML + 58 },
        { label: 'No', x: ML + 100 },
        { label: 'Operador', x: ML + 145 },
        { label: 'Forma', x: ML + 255 },
        { label: 'Total', x: ML + 340 },
      ]
      for (const c of cols) {
        page.drawText(c.label, { x: c.x, y: yy - 8, size: 8, font: fontB, color: PRETO })
      }
    }

    const titulo = 'RELATORIO DE VENDAS'
    const tW = fontB.widthOfTextAtSize(titulo, 12)
    page.drawText(sa(org?.nome ?? 'Loja').toUpperCase(), { x: ML, y, size: 11, font: fontB, color: PRETO })
    page.drawText(titulo, { x: W - MR - tW, y, size: 12, font: fontB, color: PRETO })
    y -= 16

    let periodoStr = 'Todos os registros'
    if (dataInicio && dataFim) {
      const [yi, mi, di] = dataInicio.split('-')
      const [yf, mf, df] = dataFim.split('-')
      periodoStr = `${di}/${mi}/${yi} a ${df}/${mf}/${yf}`
    } else if (dataInicio) {
      const [y, m, d] = dataInicio.split('-')
      periodoStr = `A partir de ${d}/${m}/${y}`
    } else if (dataFim) {
      const [y, m, d] = dataFim.split('-')
      periodoStr = `Ate ${d}/${m}/${y}`
    }
    page.drawText(`Periodo: ${periodoStr}`, { x: ML, y, size: 8, font: fontR, color: CINZA })
    const geradoStr = `Gerado em: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`
    page.drawText(geradoStr, { x: W - MR - fontR.widthOfTextAtSize(geradoStr, 7), y, size: 7, font: fontR, color: CINZA })
    y -= 14

    page.drawLine({ start: { x: ML, y }, end: { x: W - MR, y }, thickness: 0.5, color: CINZA_CL })
    y -= 18

    page.drawRectangle({ x: ML, y: y - 50, width: CW, height: 56, color: CINZA_BG })
    page.drawText('RESUMO', { x: ML + 8, y: y - 12, size: 8, font: fontB, color: PRETO })
    page.drawText(`${vendas.length} venda(s) — Total: ${fmtReal(totalGeral)}`, { x: ML + 8, y: y - 26, size: 9, font: fontB, color: PRETO })
    page.drawText(
      `Dinheiro: ${fmtReal(totalEspecie)}   PIX: ${fmtReal(totalPix)}   Cartao: ${fmtReal(totalCartao)}   Credito Coop.: ${fmtReal(totalSaldo)}`,
      { x: ML + 8, y: y - 40, size: 8, font: fontR, color: CINZA, maxWidth: CW - 16 },
    )
    y -= 66

    desenharCabecalhoTabela(y)
    y -= 22

    if (vendas.length === 0) {
      page.drawText('Nenhuma venda encontrada no periodo.', { x: ML, y: y - 12, size: 9, font: fontR, color: CINZA })
    }

    for (const v of vendas) {
      if (y < 80) novaPagina()

      page.drawText(v.data, { x: ML + 4, y: y - 12, size: 8, font: fontR, color: PRETO })
      page.drawText(v.hora, { x: ML + 58, y: y - 12, size: 8, font: fontR, color: CINZA })
      page.drawText(v.num, { x: ML + 100, y: y - 12, size: 8, font: fontB, color: PRETO })
      page.drawText(sa(v.operador).slice(0, 18), { x: ML + 145, y: y - 12, size: 8, font: fontR, color: PRETO, maxWidth: 100 })
      page.drawText(fmtForma(v.forma), { x: ML + 255, y: y - 12, size: 8, font: fontR, color: CINZA })
      page.drawText(fmtReal(v.total), { x: ML + 340, y: y - 12, size: 8, font: fontB, color: PRETO })

      y -= 18
      page.drawLine({ start: { x: ML, y: y + 4 }, end: { x: W - MR, y: y + 4 }, thickness: 0.3, color: CINZA_CL })
    }

    y -= 10
    if (y < 60) novaPagina()
    page.drawText(`Total geral: ${fmtReal(totalGeral)}`, { x: ML, y: y - 10, size: 10, font: fontB, color: PRETO })

    const pdfBytes = await pdfDoc.save()
    const filename = `vendas-${dataInicio ?? 'todas'}-${dataFim ?? 'todas'}.pdf`

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
      },
    })
  } catch (err) {
    console.error('[relatorio-vendas-pdf]', (err as Error)?.message)
    return NextResponse.json({ error: 'Erro ao gerar PDF' }, { status: 500 })
  }
}