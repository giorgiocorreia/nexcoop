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
  return (str ?? '').split('').map(c => ACENTO_MAP[c] ?? c).join('')
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

function formatarDataSimples(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  })
}

function formatarDataInput(s: string): string {
  const [y, m, d] = s.split('-')
  return `${d}/${m}/${y}`
}

const TIPO_LABEL: Record<string, string> = {
  entrega: 'Entrega de produto',
  saque_especie: 'Pagamento especie',
  saque_pix: 'Pagamento Pix',
  ajuste_produto: 'Ajuste produto',
  ajuste_financeiro: 'Ajuste financeiro',
  estorno: 'Estorno',
}

const STATUS_LABEL: Record<string, string> = {
  proposta: 'Proposta',
  probatorio: 'Probatorio',
  ativo: 'Ativo',
  inadimplente: 'Inadimplente',
  suspenso: 'Suspenso',
  demitido: 'Demitido',
  excluido: 'Excluido',
}

const POSSE_LABEL: Record<string, string> = {
  proprietario: 'Proprietario',
  meeiro: 'Meeiro',
  arrendatario: 'Arrendatario',
}

const COR = rgb(0.573, 0.251, 0.055)
const PRETO = rgb(0, 0, 0)
const CINZA = rgb(0.45, 0.45, 0.45)
const CINZA_CL = rgb(0.90, 0.90, 0.90)
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

    let logoImage: Awaited<ReturnType<typeof pdfDoc.embedPng>> | null = null
    if (dados.organizacao.logo_url) {
      try {
        const logoResp = await fetch(dados.organizacao.logo_url)
        if (logoResp.ok) {
          const logoBytes = await logoResp.arrayBuffer()
          const ct = logoResp.headers.get('content-type') ?? ''
          if (ct.includes('png')) {
            logoImage = await pdfDoc.embedPng(logoBytes)
          } else if (ct.includes('jpeg') || ct.includes('jpg')) {
            logoImage = await pdfDoc.embedJpg(logoBytes)
          }
        }
      } catch { /* sem logo */ }
    }

    let page = pdfDoc.addPage([W, H])
    let y = H - 40

    function drawCabecalhoTabela(yy: number) {
      page.drawText('Data/Hora',   { x: ML + 4,   y: yy, size: 8, font: fontB, color: CINZA })
      page.drawText('Operacao',    { x: ML + 110, y: yy, size: 8, font: fontB, color: CINZA })
      page.drawText('Qtd produto', { x: ML + 270, y: yy, size: 8, font: fontB, color: CINZA })
      page.drawText('Qtd vendida', { x: ML + 355, y: yy, size: 8, font: fontB, color: CINZA })
      page.drawText('Valor pago',  { x: ML + 440, y: yy, size: 8, font: fontB, color: CINZA })
    }

    function novaPaginaSeNecessario(altura: number = 24) {
      if (y - altura < 70) {
        page = pdfDoc.addPage([W, H])
        y = H - 40
        page.drawText(`${sa(dados.organizacao.nome)} — Extrato de Produtor (cont.)`, {
          x: ML, y, size: 7, font: fontR, color: CINZA,
        })
        y -= 16
        page.drawRectangle({ x: ML, y: y - 14, width: CW, height: 18, color: CINZA_CL })
        drawCabecalhoTabela(y - 8)
        y -= 20
      }
    }

    function sep(yy: number) {
      page.drawLine({ start: { x: ML, y: yy }, end: { x: W - MR, y: yy }, thickness: 0.4, color: CINZA_CL })
    }

    // CABEÇALHO
    const HEADER_H = 70
    page.drawRectangle({ x: 0, y: H - HEADER_H, width: W, height: HEADER_H, color: COR })

    let logoX = ML
    if (logoImage) {
      const logoDims = logoImage.scaleToFit(44, 44)
      page.drawImage(logoImage, {
        x: ML,
        y: H - HEADER_H + (HEADER_H - logoDims.height) / 2,
        width: logoDims.width,
        height: logoDims.height,
      })
      logoX = ML + logoDims.width + 10
    }

    page.drawText(sa(dados.organizacao.nome).toUpperCase(), {
      x: logoX, y: H - 28, size: 10, font: fontB, color: rgb(1,1,1),
      maxWidth: W - logoX - 160,
    })
    page.drawText(`CNPJ: ${formatarCNPJ(dados.organizacao.cnpj)}`, {
      x: logoX, y: H - 42, size: 8, font: fontR, color: rgb(0.9,0.9,0.9),
    })

    const tituloStr = 'EXTRATO DO PRODUTOR'
    const tW = fontB.widthOfTextAtSize(tituloStr, 13)
    page.drawText(tituloStr, { x: W - MR - tW, y: H - 28, size: 13, font: fontB, color: rgb(1,1,1) })

    let periodoStr = 'Todos os registros'
    if (tipo === 'periodo' && inicio && fim) periodoStr = `${formatarDataInput(inicio)} a ${formatarDataInput(fim)}`
    else if (tipo === 'periodo' && inicio) periodoStr = `A partir de ${formatarDataInput(inicio)}`
    else if (tipo === 'periodo' && fim) periodoStr = `Ate ${formatarDataInput(fim)}`
    const pW = fontR.widthOfTextAtSize(periodoStr, 8)
    page.drawText(periodoStr, { x: W - MR - pW, y: H - 44, size: 8, font: fontR, color: rgb(0.85,0.85,0.85) })

    const geradoStr = `Gerado em: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`
    const gW = fontR.widthOfTextAtSize(geradoStr, 7)
    page.drawText(geradoStr, { x: W - MR - gW, y: H - 57, size: 7, font: fontR, color: rgb(0.75,0.75,0.75) })

    y = H - HEADER_H - 14

    // DADOS DO PRODUTOR
    const PROD_H = dados.cooperado ? 100 : 64
    page.drawRectangle({ x: ML, y: y - PROD_H, width: CW, height: PROD_H + 6, color: rgb(0.99, 0.97, 0.94), borderColor: COR, borderWidth: 0.5 })

    page.drawText(sa(dados.produtor.nome), { x: ML + 8, y: y - 10, size: 12, font: fontB, color: PRETO })

    const cpfTipoStr = [
      dados.produtor.cpf ? `CPF: ${formatarCPF(dados.produtor.cpf)}` : '',
      dados.produtor.tipo === 'cooperado' ? 'Cooperado' : 'Produtor externo',
      dados.produtor.ie_produtor_rural ? `IE: ${dados.produtor.ie_produtor_rural}` : '',
    ].filter(Boolean).join('   ')
    page.drawText(cpfTipoStr, { x: ML + 8, y: y - 24, size: 8, font: fontR, color: CINZA })

    const propStr = [
      dados.produtor.nome_propriedade ? sa(dados.produtor.nome_propriedade) : '',
      dados.produtor.municipio ? sa(dados.produtor.municipio) : '',
      dados.produtor.tipo_posse ? (POSSE_LABEL[dados.produtor.tipo_posse] ?? dados.produtor.tipo_posse) : '',
      dados.produtor.area_cacau_ha !== null ? `${dados.produtor.area_cacau_ha} ha cacau` : '',
    ].filter(Boolean).join('   |   ')
    if (propStr) page.drawText(propStr, { x: ML + 8, y: y - 36, size: 8, font: fontR, color: CINZA })

    if (dados.cooperado) {
      const c = dados.cooperado
      page.drawLine({ start: { x: ML + 8, y: y - 46 }, end: { x: W - MR - 8, y: y - 46 }, thickness: 0.4, color: CINZA_CL })
      page.drawText('DADOS DO COOPERADO', { x: ML + 8, y: y - 58, size: 7, font: fontB, color: COR })

      const coopCols = [
        c.numero_matricula ? `Matricula: ${c.numero_matricula}` : '',
        c.status ? `Status: ${STATUS_LABEL[c.status] ?? sa(c.status)}` : '',
        c.quota_parte !== null ? `Cotas: ${c.quota_parte}` : '',
        c.data_admissao ? `Admissao: ${formatarDataSimples(c.data_admissao)}` : '',
      ].filter(Boolean)

      const coopCols2 = [
        c.caf_numero ? `CAF: ${c.caf_numero}` : '',
        c.dap_numero ? `DAP: ${c.dap_numero}` : '',
        c.area_total_ha !== null ? `Area total: ${c.area_total_ha} ha` : '',
      ].filter(Boolean)

      page.drawText(coopCols.join('   |   '), { x: ML + 8, y: y - 70, size: 8, font: fontR, color: CINZA })
      if (coopCols2.length > 0) {
        page.drawText(coopCols2.join('   |   '), { x: ML + 8, y: y - 82, size: 8, font: fontR, color: CINZA })
      }
    }

    y -= PROD_H + 16

    // SALDOS ATUAIS
    const boxW = (CW - 8) / 2
    page.drawRectangle({ x: ML, y: y - 46, width: boxW, height: 52, color: rgb(0.99, 0.97, 0.94), borderColor: COR, borderWidth: 0.5 })
    page.drawText('SALDO A ORDEM (ATUAL)', { x: ML + 8, y: y - 10, size: 7, font: fontB, color: CINZA })
    page.drawText(dados.produto_nome ? sa(dados.produto_nome) : 'Produto', { x: ML + 8, y: y - 22, size: 8, font: fontR, color: CINZA })
    page.drawText(formatarKg(dados.saldo_atual_produto), { x: ML + 8, y: y - 36, size: 13, font: fontB, color: COR })

    const bx2 = ML + boxW + 8
    page.drawRectangle({ x: bx2, y: y - 46, width: boxW, height: 52, color: rgb(0.94, 0.99, 0.96), borderColor: VERDE, borderWidth: 0.5 })
    page.drawText('SALDO FINANCEIRO (ATUAL)', { x: bx2 + 8, y: y - 10, size: 7, font: fontB, color: CINZA })
    page.drawText('Disponivel para saque', { x: bx2 + 8, y: y - 22, size: 8, font: fontR, color: CINZA })
    page.drawText(formatarReal(dados.saldo_atual_financeiro), { x: bx2 + 8, y: y - 36, size: 13, font: fontB, color: VERDE })

    y -= 62

    // TABELA
    page.drawRectangle({ x: ML, y: y - 16, width: CW, height: 20, color: CINZA_CL })
    drawCabecalhoTabela(y - 10)
    y -= 22

    if (dados.movimentacoes.length === 0) {
      page.drawText('Nenhuma movimentacao no periodo selecionado.', { x: ML, y: y - 14, size: 9, font: fontR, color: CINZA })
      y -= 24
    }

    for (const m of dados.movimentacoes) {
      const linhas = m.observacoes ? 2 : 1
      novaPaginaSeNecessario(linhas * 14 + 6)

      const isEntrega = m.tipo === 'entrega'
      const isSaque = m.tipo === 'saque_especie' || m.tipo === 'saque_pix'

      page.drawText(formatarDataHora(m.created_at), { x: ML + 4, y: y - 12, size: 8, font: fontR, color: PRETO })
      page.drawText(sa(TIPO_LABEL[m.tipo] ?? m.tipo), { x: ML + 110, y: y - 12, size: 8, font: isEntrega ? fontB : fontR, color: isEntrega ? PRETO : CINZA })

      if (m.quantidade_produto) {
        page.drawText(formatarKg(m.quantidade_produto), { x: ML + 270, y: y - 12, size: 8, font: isEntrega ? fontB : fontR, color: isEntrega ? COR : CINZA })
      } else {
        page.drawText('—', { x: ML + 270, y: y - 12, size: 8, font: fontR, color: CINZA_CL })
      }

      if (isSaque && m.quantidade_vendida) {
        page.drawText(formatarKg(m.quantidade_vendida), { x: ML + 355, y: y - 12, size: 8, font: fontB, color: CINZA })
      } else {
        page.drawText('—', { x: ML + 355, y: y - 12, size: 8, font: fontR, color: CINZA_CL })
      }

      if (m.valor_financeiro && isSaque) {
        page.drawText(formatarReal(Math.abs(m.valor_financeiro)), { x: ML + 440, y: y - 12, size: 8, font: fontB, color: VERDE })
      } else {
        page.drawText('—', { x: ML + 440, y: y - 12, size: 8, font: fontR, color: CINZA_CL })
      }

      if (m.observacoes) {
        page.drawText(sa(m.observacoes), { x: ML + 110, y: y - 22, size: 7, font: fontR, color: CINZA })
        y -= 28
      } else {
        y -= 18
      }

      sep(y)
    }

    // TOTAIS
    y -= 10
    novaPaginaSeNecessario(60)

    const totalEntregue = dados.movimentacoes
      .filter(m => m.tipo === 'entrega')
      .reduce((acc, m) => acc + (m.quantidade_produto ?? 0), 0)

    const totalVendidoKg = dados.movimentacoes
      .filter(m => m.tipo === 'saque_especie' || m.tipo === 'saque_pix')
      .reduce((acc, m) => acc + (m.quantidade_vendida ?? 0), 0)

    const totalPago = dados.movimentacoes
      .filter(m => m.tipo === 'saque_especie' || m.tipo === 'saque_pix')
      .reduce((acc, m) => acc + Math.abs(m.valor_financeiro ?? 0), 0)

    page.drawRectangle({ x: ML, y: y - 46, width: CW, height: 52, color: rgb(0.98, 0.98, 0.98), borderColor: CINZA_CL, borderWidth: 0.5 })
    page.drawText('RESUMO DO PERIODO', { x: ML + 8, y: y - 10, size: 7, font: fontB, color: CINZA })

    page.drawText('Total entregue:', { x: ML + 8,   y: y - 24, size: 8, font: fontR, color: CINZA })
    page.drawText(formatarKg(totalEntregue), { x: ML + 100, y: y - 24, size: 8, font: fontB, color: COR })

    page.drawText('Total vendido:',  { x: ML + 200, y: y - 24, size: 8, font: fontR, color: CINZA })
    page.drawText(formatarKg(totalVendidoKg), { x: ML + 285, y: y - 24, size: 8, font: fontB, color: CINZA })

    page.drawText('Total recebido:', { x: ML + 370, y: y - 24, size: 8, font: fontR, color: CINZA })
    page.drawText(formatarReal(totalPago), { x: ML + 455, y: y - 24, size: 8, font: fontB, color: VERDE })

    page.drawText('Saldo a ordem:',   { x: ML + 8,   y: y - 38, size: 8, font: fontR, color: CINZA })
    page.drawText(formatarKg(dados.saldo_atual_produto), { x: ML + 100, y: y - 38, size: 8, font: fontB, color: COR })

    page.drawText('Saldo financeiro:', { x: ML + 200, y: y - 38, size: 8, font: fontR, color: CINZA })
    page.drawText(formatarReal(dados.saldo_atual_financeiro), { x: ML + 290, y: y - 38, size: 8, font: fontB, color: VERDE })

    y -= 58

    // RODAPÉ
    sep(y)
    y -= 14
    page.drawText('Documento de uso interno. Nao tem validade fiscal.', { x: ML, y, size: 7, font: fontR, color: CINZA })
    const nexStr = 'NexCoop - nexcoop.com.br'
    page.drawText(nexStr, { x: W - MR - fontR.widthOfTextAtSize(nexStr, 7), y, size: 7, font: fontR, color: CINZA })

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
