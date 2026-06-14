import { NextRequest, NextResponse } from 'next/server'
import { PDFDocument, rgb, StandardFonts, PDFFont } from 'pdf-lib'
import { buscarDadosComprovante } from '@/lib/comercializacao/notas'

// 80mm térmico: 80mm × 2.8346 ≈ 227 pts
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

function formatarKgNum(v: number): string {
  if (Number.isInteger(v)) return `${v} kg`
  return `${v.toFixed(3).replace('.', ',')} kg`
}

// Por extenso apenas para 1-9 inteiros; demais usam numeral
const UNIDADES = ['zero', 'um', 'dois', 'tres', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove']
function kgPorExtenso(kg: number): string {
  if (Number.isInteger(kg) && kg >= 1 && kg <= 9) {
    return `${UNIDADES[kg]} ${kg === 1 ? 'quilo' : 'quilos'}`
  }
  return formatarKgNum(kg)
}

const MESES = [
  'janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]
function dataPorExtenso(iso: string): string {
  const d = new Date(iso)
  const br = new Date(d.getTime() - 3 * 60 * 60 * 1000)
  return `${br.getUTCDate()} de ${MESES[br.getUTCMonth()]} de ${br.getUTCFullYear()}`
}

function formatarDataHora(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
}

// Quebra texto em linhas que cabem em maxWidth pts
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const dados = await buscarDadosComprovante(id)

    const pdfDoc = await PDFDocument.create()
    // Altura generosa — conteúdo fica no topo; espaço em branco na base é ignorado pela impressora
    const page = pdfDoc.addPage([PAGE_W, 600])
    const fontR = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontB = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    let y = 590

    // Linha separadora horizontal
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

    // ── CABEÇALHO ──────────────────────────────────────────
    const nomeLines = wrapText(semAcento(dados.organizacao.nome).toUpperCase(), fontB, 11, CONTENT_W)
    for (const line of nomeLines) { txtC(line, fontB, 11); y -= 14 }

    const cnpjStr = `CNPJ: ${formatarCNPJ(dados.organizacao.cnpj)}`
    txtC(cnpjStr, fontR, 8); y -= 11

    if (dados.organizacao.endereco) {
      const endLines = wrapText(semAcento(dados.organizacao.endereco), fontR, 8, CONTENT_W)
      for (const line of endLines) { txtC(line, fontR, 8); y -= 11 }
    }

    if (dados.organizacao.telefone) {
      txtC(`Tel: ${dados.organizacao.telefone}`, fontR, 8); y -= 11
    }

    y -= 4; sep(); y -= 13

    txtC('COMPROVANTE DE ENTREGA', fontB, 11); y -= 14

    const numStr = `N\xBA ${String(dados.nota.numero_sequencial).padStart(6, '0')}`
    txtC(numStr, fontR, 8); y -= 11

    sep(); y -= 13

    // ── META ───────────────────────────────────────────────
    txtL(`Data: ${formatarDataHora(dados.movimentacao.created_at)}`, fontR, 8); y -= 12
    txtL(`Operador: ${semAcento(dados.operador.nome)}`, fontR, 8); y -= 16

    // ── CORPO ──────────────────────────────────────────────
    const qtdExtenso = kgPorExtenso(dados.movimentacao.quantidade_produto)
    const qtdNum = formatarKgNum(dados.movimentacao.quantidade_produto)
    const dataExtenso = dataPorExtenso(dados.movimentacao.created_at)
    const numPedido = String(dados.nota.numero_sequencial).padStart(6, '0')
    const cidadeFallback = dados.organizacao.cidade || 'Ibirataia'
    const municipioStr = semAcento(dados.produtor.municipio || cidadeFallback) + ' - BA'

    const textoCorrido =
      `Recebemos de ${semAcento(dados.produtor.nome)}, CPF ${formatarCPF(dados.produtor.cpf)},` +
      ` residente em ${municipioStr}, a quantia de ${qtdExtenso} (${qtdNum})` +
      ` de ${semAcento(dados.produto.nome)}, referente a pesada n\xBA ${numPedido}, em ${dataExtenso}.`

    const textoLines = wrapText(textoCorrido, fontR, 8, CONTENT_W)
    for (const line of textoLines) { txtL(line, fontR, 8); y -= 11 }
    y -= 5

    sep(); y -= 13

    // ── SALDOS ─────────────────────────────────────────────
    txtL('SALDOS APOS ENTREGA', fontB, 8); y -= 13

    const saldoAntStr = formatarKgNum(dados.saldo_anterior)
    txtL('Saldo anterior:', fontR, 8); txtR(saldoAntStr, fontR, 8); y -= 12

    const entregaStr = `+ ${formatarKgNum(dados.movimentacao.quantidade_produto)}`
    txtL('Esta entrega:', fontR, 8); txtR(entregaStr, fontR, 8); y -= 10

    // Mini separador lado direito (abaixo das linhas de entrega)
    page.drawLine({
      start: { x: PAGE_W / 2, y },
      end: { x: PAGE_W - MARGIN, y },
      thickness: 0.5,
      color: BLACK,
    })
    y -= 11

    const saldoAtualStr = formatarKgNum(dados.saldo_atual)
    txtL('Saldo atual:', fontB, 8); txtR(saldoAtualStr, fontB, 8); y -= 16

    if (dados.cotacao_atual > 0) {
      txtL('Estimativa a cotacao vigente:', fontR, 8); y -= 12
      const estimStr = `aprox. R$ ${formatarReal(dados.estimativa_valor)} (@ R$ ${formatarReal(dados.cotacao_atual)}/kg)`
      txtL(estimStr, fontB, 8); y -= 12
      txtL('* Estimativa. Nao representa valor confirmado.', fontR, 7); y -= 12
    }

    sep(); y -= 14

    // ── ASSINATURAS ────────────────────────────────────────
    y -= 35  // espaço vazio para assinatura manuscrita

    // Traços: coluna esquerda x=10..100, coluna direita x=115..205
    page.drawLine({ start: { x: 10, y }, end: { x: 100, y }, thickness: 0.5, color: BLACK })
    page.drawLine({ start: { x: 115, y }, end: { x: 205, y }, thickness: 0.5, color: BLACK })

    // Nome: +4pts abaixo da linha
    y -= 12
    page.drawText(semAcento(dados.produtor.nome), { x: 10, y, size: 8, font: fontR, color: BLACK })
    page.drawText(semAcento(dados.operador.nome), { x: 115, y, size: 8, font: fontR, color: BLACK })

    // Função: +12pts abaixo do nome
    y -= 12
    page.drawText('Produtor(a)', { x: 10, y, size: 7, font: fontR, color: BLACK })
    page.drawText('Operador(a)', { x: 115, y, size: 7, font: fontR, color: BLACK })
    y -= 14

    sep(); y -= 12

    // ── RODAPÉ ─────────────────────────────────────────────
    const footer1 = 'Documento de uso interno. Nao tem validade fiscal.'
    const footer1Lines = wrapText(footer1, fontR, 7, CONTENT_W)
    for (const line of footer1Lines) { txtC(line, fontR, 7); y -= 9 }
    txtC('NexCoop - nexcoop.com.br', fontR, 7)

    const pdfBytes = await pdfDoc.save()

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="comprovante-${String(dados.nota.numero_sequencial).padStart(6, '0')}.pdf"`,
      },
    })
  } catch (err) {
    console.error('[comprovante] Erro:', (err as any)?.message, (err as any)?.stack)
    return NextResponse.json({ error: 'Erro ao gerar comprovante' }, { status: 500 })
  }
}
