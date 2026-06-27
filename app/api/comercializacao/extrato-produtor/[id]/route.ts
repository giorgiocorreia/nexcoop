import { NextRequest, NextResponse } from 'next/server'
import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from 'pdf-lib'
import { buscarDadosExtratoProdutor } from '@/lib/comercializacao/extrato-produtor'

const ACENTO_MAP: Record<string, string> = {
  'á':'a','à':'a','ã':'a','â':'a','ä':'a','Á':'A','À':'A','Ã':'A','Â':'A','Ä':'A',
  'é':'e','è':'e','ê':'e','ë':'e','É':'E','È':'E','Ê':'E','Ë':'E',
  'í':'i','ì':'i','î':'i','ï':'i','Í':'I','Ì':'I','Î':'I','Ï':'I',
  'ó':'o','ò':'o','õ':'o','ô':'o','ö':'o','Ó':'O','Ò':'O','Õ':'O','Ô':'O','Ö':'O',
  'ú':'u','ù':'u','û':'u','ü':'u','Ú':'U','Ù':'U','Û':'U','Ü':'U',
  'ç':'c','Ç':'C','ñ':'n','Ñ':'N',
}
function sa(str: string): string {
  return str.split('').map(c => ACENTO_MAP[c] ?? c).join('')
}

function formatarCPF(cpf: string): string {
  const s = cpf.replace(/\D/g, '')
  return s.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

function formatarCNPJ(cnpj: string): string {
  const s = cnpj.replace(/\D/g, '')
  return s.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
}

function formatarReal(v: number): string {
  const [i, d] = Math.abs(v).toFixed(2).split('.')
  return 'R$ ' + i.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + d
}

function formatarKg(v: number): string {
  return v.toFixed(3).replace('.', ',') + ' kg'
}

function formatarDataHora(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
}

function formatarData(s: string): string {
  const [y, m, d] = s.split('-')
  return `${d}/${m}/${y}`
}

const TIPO_LABEL: Record<string, string> = {
  entrega: 'Entrega',
  saque_especie: 'Pagamento especie',
  saque_pix: 'Pagamento Pix',
  ajuste_produto: 'Ajuste produto',
  ajuste_financeiro: 'Ajuste financeiro',
  estorno: 'Estorno',
}

const COR = rgb(0.573, 0.251, 0.055)
const PRETO = rgb(0, 0, 0)
const CINZA = rgb(0.5, 0.5, 0.5)
const CINZA_CL = rgb(0.93, 0.93, 0.93)
const VERDE = rgb(0.09, 0.43, 0.34)

const W = 595
const H = 842
const ML = 40
const MR = 40
const CW = W - ML - MR

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const url = new URL(request.url)
    const tipo = (url.searchParams.get('tipo') ?? 'total') as 'total' | 'periodo'
    const inicio = url.searchParams.get('inicio') ?? undefined
    const fim = url.searchParams.get('fim') ?? undefined

    const dados = await buscarDadosExtratoProdutor(id, tipo, inicio, fim)

    const pdfDoc = await PDFDocument.create()
    const fontR = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontB = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    let page = pdfDoc.addPage([W, H])
    let y = H - 40

    function novaPaginaSeNecessario(altura: number = 20) {
      if (y - altura < 60) {
        page = pdfDoc.addPage([W, H])
        y = H - 40
        page.drawText(`${sa(dados.organizacao.nome)} — Extrato de Produtor (continuacao)`, {
          x: ML, y, size: 8, font: fontR, color: CINZA,
        })
        y -= 20
      }
    }

    function txt(p: PDFPage, text: string, x: number, yy: number, font: PDFFont, size: number, color = PRETO) {
      p.drawText(text, { x, y: yy, size, font, color })
    }

    function sep(yy: number) {
      page.drawLine({ start: { x: ML, y: yy }, end: { x: W - MR, y: yy }, thickness: 0.5, color: CINZA_CL })
    }

    // CABEÇALHO
    page.drawRectangle({ x: 0, y: H - 70, width: W, height: 70, color: COR })

    txt(page, sa(dados.organizacao.nome).toUpperCase(), ML, H - 28, fontB, 10, rgb(1,1,1))
    txt(page, `CNPJ: ${formatarCNPJ(dados.organizacao.cnpj)}`, ML, H - 42, fontR, 8, rgb(0.9,0.9,0.9))

    const tituloExtrato = 'EXTRATO DO PRODUTOR'
    const tw = fontB.widthOfTextAtSize(tituloExtrato, 14)
    txt(page, tituloExtrato, W - MR - tw, H - 30, fontB, 14, rgb(1,1,1))

    let periodoStr = 'Periodo: Todos os registros'
    if (tipo === 'periodo' && inicio && fim) {
      periodoStr = `Periodo: ${formatarData(inicio)} a ${formatarData(fim)}`
    } else if (tipo === 'periodo' && inicio) {
      periodoStr = `Periodo: a partir de ${formatarData(inicio)}`
    } else if (tipo === 'periodo' && fim) {
      periodoStr = `Periodo: ate ${formatarData(fim)}`
    }
    const pw = fontR.widthOfTextAtSize(periodoStr, 8)
    txt(page, periodoStr, W - MR - pw, H - 46, fontR, 8, rgb(0.85,0.85,0.85))

    y = H - 80

    // DADOS DO PRODUTOR
    page.drawRectangle({ x: ML, y: y - 48, width: CW, height: 54, color: rgb(0.99, 0.97, 0.94) })

    txt(page, sa(dados.produtor.nome), ML + 8, y - 8, fontB, 11, PRETO)

    const cpfStr = dados.produtor.cpf ? `CPF: ${formatarCPF(dados.produtor.cpf)}` : ''
    const tipoStr = dados.produtor.tipo === 'cooperado' ? 'Cooperado' : 'Produtor externo'
    txt(page, `${cpfStr}   ${tipoStr}`, ML + 8, y - 22, fontR, 8, CINZA)

    const municipioStr = dados.produtor.municipio ? sa(dados.produtor.municipio) : ''
    const ieStr = dados.produtor.ie_produtor_rural ? `IE: ${dados.produtor.ie_produtor_rural}` : ''
    const linha3 = [municipioStr, ieStr].filter(Boolean).join('   ')
    if (linha3) txt(page, linha3, ML + 8, y - 34, fontR, 8, CINZA)

    y -= 60

    // SALDOS ATUAIS
    const boxW = (CW - 8) / 2
    page.drawRectangle({ x: ML, y: y - 44, width: boxW, height: 50, color: rgb(0.99, 0.97, 0.94), borderColor: COR, borderWidth: 0.5 })
    txt(page, 'SALDO PRODUTO (ATUAL)', ML + 8, y - 10, fontR, 7, CINZA)
    txt(page, dados.produto_nome ? sa(dados.produto_nome) : 'Produto', ML + 8, y - 22, fontR, 8, CINZA)
    txt(page, formatarKg(dados.saldo_atual_produto), ML + 8, y - 36, fontB, 12, COR)

    const bx2 = ML + boxW + 8
    page.drawRectangle({ x: bx2, y: y - 44, width: boxW, height: 50, color: rgb(0.94, 0.99, 0.96), borderColor: VERDE, borderWidth: 0.5 })
    txt(page, 'SALDO FINANCEIRO (ATUAL)', bx2 + 8, y - 10, fontR, 7, CINZA)
    txt(page, 'Disponivel para saque', bx2 + 8, y - 22, fontR, 8, CINZA)
    txt(page, formatarReal(dados.saldo_atual_financeiro), bx2 + 8, y - 36, fontB, 12, VERDE)

    y -= 56

    // TABELA DE MOVIMENTAÇÕES
    const COL = {
      data:  { x: ML,        w: 100 },
      tipo:  { x: ML + 100,  w: 160 },
      qtd:   { x: ML + 260,  w: 90  },
      valor: { x: ML + 350,  w: 85  },
      forma: { x: ML + 435,  w: 80  },
    }

    page.drawRectangle({ x: ML, y: y - 16, width: CW, height: 20, color: CINZA_CL })
    txt(page, 'Data/Hora',   COL.data.x + 4,  y - 10, fontB, 8, CINZA)
    txt(page, 'Operacao',    COL.tipo.x + 4,  y - 10, fontB, 8, CINZA)
    txt(page, 'Quantidade',  COL.qtd.x + 4,   y - 10, fontB, 8, CINZA)
    txt(page, 'Valor',       COL.valor.x + 4, y - 10, fontB, 8, CINZA)
    txt(page, 'Forma',       COL.forma.x + 4, y - 10, fontB, 8, CINZA)
    y -= 22

    if (dados.movimentacoes.length === 0) {
      txt(page, 'Nenhuma movimentacao no periodo selecionado.', ML, y - 14, fontR, 9, CINZA)
      y -= 24
    }

    for (const m of dados.movimentacoes) {
      novaPaginaSeNecessario(28)

      const isEntrega = m.tipo === 'entrega'
      const corValor = isEntrega ? PRETO : (m.valor_financeiro && m.valor_financeiro < 0 ? rgb(0.6, 0.1, 0.1) : VERDE)

      txt(page, formatarDataHora(m.created_at), COL.data.x + 4, y - 12, fontR, 8, PRETO)
      txt(page, sa(TIPO_LABEL[m.tipo] ?? m.tipo), COL.tipo.x + 4, y - 12, fontR, 8, PRETO)

      if (m.quantidade_produto) {
        txt(page, formatarKg(m.quantidade_produto), COL.qtd.x + 4, y - 12, fontR, 8, PRETO)
      } else {
        txt(page, '—', COL.qtd.x + 4, y - 12, fontR, 8, CINZA)
      }

      if (m.valor_financeiro) {
        txt(page, formatarReal(Math.abs(m.valor_financeiro)), COL.valor.x + 4, y - 12, fontR, 8, corValor)
      } else {
        txt(page, '—', COL.valor.x + 4, y - 12, fontR, 8, CINZA)
      }

      const formaLabel = m.forma_pagamento === 'pix' ? 'Pix' : m.forma_pagamento === 'especie' ? 'Especie' : '—'
      txt(page, formaLabel, COL.forma.x + 4, y - 12, fontR, 8, CINZA)

      if (m.observacoes) {
        txt(page, sa(m.observacoes), COL.tipo.x + 4, y - 22, fontR, 7, CINZA)
        y -= 26
      } else {
        y -= 18
      }

      sep(y)
    }

    // RODAPÉ
    y -= 20
    novaPaginaSeNecessario(40)
    page.drawLine({ start: { x: ML, y: y }, end: { x: W - MR, y: y }, thickness: 0.5, color: CINZA_CL })
    y -= 14
    txt(page, 'Documento de uso interno. Nao tem validade fiscal.', ML, y, fontR, 7, CINZA)
    const nexStr = 'NexCoop - nexcoop.com.br'
    txt(page, nexStr, W - MR - fontR.widthOfTextAtSize(nexStr, 7), y, fontR, 7, CINZA)

    const pdfBytes = await pdfDoc.save()

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="extrato-${sa(dados.produtor.nome.split(' ')[0].toLowerCase())}.pdf"`,
      },
    })
  } catch (err) {
    console.error('[extrato-produtor] Erro:', (err as any)?.message)
    return NextResponse.json({ error: 'Erro ao gerar extrato' }, { status: 500 })
  }
}
