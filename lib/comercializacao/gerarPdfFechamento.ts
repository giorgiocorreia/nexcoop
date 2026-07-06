'use client'

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

export interface DadosFechamentoPdf {
  orgNome: string
  orgCnpj: string
  operadorNome: string
  dataAbertura: string
  dataFechamento: string
  saldoInicial: number
  totalAportes: number
  totalSangrias: number
  totalSaquesEspecie: number
  totalPix: number
  totalEntradasPixCota?: number
  totalEntradasCartaoCota?: number
  saldoEsperado: number
  saldoContado: number
  diferenca: number
  aportesSangrias: Array<{
    tipo: 'aporte' | 'sangria'
    valor: number
    formaPagamento?: string
    motivo: string
    autorizadorNome: string
    horario: string
  }>
  operacoes: Array<{
    horario: string
    produtor: string
    produto: string
    kg: number
    valorEspecie: number
    valorPix: number
    total: number
  }>
  movimentacaoProdutos: Array<{
    produto: string
    totalKg: number
    nProdutores: number
  }>
  observacoes?: string
}

const A4 = { width: 595.28, height: 841.89 }
const MARGIN = 40
const LINE_H = 14
const COL_W = A4.width - MARGIN * 2

function fmt(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function fmtKg(kg: number) {
  return kg.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) + ' kg'
}
function fmtData(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Bahia' })
}

export async function gerarPdfFechamentoCaixa(dados: DadosFechamentoPdf): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const fontR = await doc.embedFont(StandardFonts.Helvetica)
  const fontB = await doc.embedFont(StandardFonts.HelveticaBold)

  let page = doc.addPage([A4.width, A4.height])
  let y = A4.height - MARGIN

  function checkPage(needed = LINE_H * 2) {
    if (y - needed < MARGIN + 30) {
      page = doc.addPage([A4.width, A4.height])
      y = A4.height - MARGIN
      drawHeader()
    }
  }

  function drawHeader() {
    page.drawText('NexCoop — Fechamento de Caixa', {
      x: MARGIN, y: y - 2,
      size: 9, font: fontR,
      color: rgb(0.5, 0.5, 0.5)
    })
    page.drawLine({
      start: { x: MARGIN, y: y - 8 },
      end: { x: A4.width - MARGIN, y: y - 8 },
      thickness: 0.3, color: rgb(0.8, 0.8, 0.8)
    })
    y -= 20
  }

  function text(t: string, x: number, size = 9, bold = false, color = rgb(0.1, 0.1, 0.1)) {
    page.drawText(t, { x, y, size, font: bold ? fontB : fontR, color })
  }

  function row(label: string, value: string, highlight = false) {
    checkPage()
    if (highlight) {
      page.drawRectangle({
        x: MARGIN - 4, y: y - 11,
        width: COL_W + 8, height: LINE_H + 2,
        color: rgb(0.95, 0.95, 0.92)
      })
    }
    text(label, MARGIN, 9, false)
    text(value, MARGIN + COL_W - 120, 9, highlight)
    y -= LINE_H
  }

  function sectionTitle(titulo: string) {
    checkPage(LINE_H * 3)
    y -= 6
    page.drawRectangle({
      x: MARGIN - 4, y: y - 12,
      width: COL_W + 8, height: 18,
      color: rgb(0.39, 0.36, 0.56)
    })
    text(titulo.toUpperCase(), MARGIN, 8, true, rgb(1, 1, 1))
    y -= 22
  }

  function divider() {
    page.drawLine({
      start: { x: MARGIN, y: y + 2 },
      end: { x: A4.width - MARGIN, y: y + 2 },
      thickness: 0.3, color: rgb(0.85, 0.85, 0.85)
    })
    y -= 6
  }

  // ── CABEÇALHO ──────────────────────────────────────────────
  text('FECHAMENTO DE CAIXA', MARGIN, 16, true, rgb(0.2, 0.2, 0.2))
  y -= 20
  text(dados.orgNome, MARGIN, 10, true)
  y -= 14
  text(`CNPJ: ${dados.orgCnpj}`, MARGIN, 8)
  y -= 12
  text(`Operador: ${dados.operadorNome}`, MARGIN, 8)
  y -= 12
  text(`Abertura: ${fmtData(dados.dataAbertura)}   Fechamento: ${fmtData(dados.dataFechamento)}`, MARGIN, 8)
  y -= 16
  divider()

  // ── BALANÇO FINANCEIRO ─────────────────────────────────────
  sectionTitle('Balanço Financeiro')
  row('Saldo inicial (espécie)', fmt(dados.saldoInicial))
  row('(+) Aportes do dia', fmt(dados.totalAportes))
  row('(-) Sangrias do dia', fmt(dados.totalSangrias))
  row('(-) Saques em espécie (operações)', fmt(dados.totalSaquesEspecie))
  row('(+) Entradas via Pix (operações)', fmt(dados.totalPix))
  if (dados.totalEntradasPixCota) row('(  ) Entradas Pix — cota/outros (não afeta espécie)', fmt(dados.totalEntradasPixCota))
  if (dados.totalEntradasCartaoCota) row('(  ) Entradas cartão — cota/outros (não afeta espécie)', fmt(dados.totalEntradasCartaoCota))
  y -= 4; divider()
  row('Saldo esperado (sistema)', fmt(dados.saldoEsperado), true)
  row('Saldo contado (operador)', fmt(dados.saldoContado), true)

  const difColor = dados.diferenca === 0 ? rgb(0.1, 0.6, 0.2) : rgb(0.8, 0.1, 0.1)
  checkPage()
  page.drawRectangle({
    x: MARGIN - 4, y: y - 11,
    width: COL_W + 8, height: LINE_H + 2,
    color: dados.diferenca === 0 ? rgb(0.9, 1, 0.92) : rgb(1, 0.92, 0.92)
  })
  text('Diferença', MARGIN, 9, true, difColor)
  text(
    (dados.diferenca > 0 ? '+' : '') + fmt(dados.diferenca),
    MARGIN + COL_W - 120, 9, true, difColor
  )
  y -= LINE_H + 4

  // ── MOVIMENTAÇÃO DE PRODUTOS ───────────────────────────────
  if (dados.movimentacaoProdutos.length > 0) {
    sectionTitle('Movimentação de Produtos')
    checkPage()
    page.drawRectangle({
      x: MARGIN - 4, y: y - 11,
      width: COL_W + 8, height: 14,
      color: rgb(0.88, 0.88, 0.88)
    })
    text('Produto', MARGIN, 8, true)
    text('Total kg', MARGIN + 240, 8, true)
    text('Produtores', MARGIN + 340, 8, true)
    y -= 16
    for (const mp of dados.movimentacaoProdutos) {
      checkPage()
      text(mp.produto, MARGIN, 8)
      text(fmtKg(mp.totalKg), MARGIN + 240, 8)
      text(String(mp.nProdutores), MARGIN + 340, 8)
      y -= LINE_H
    }
    y -= 4
  }

  // ── APORTES E SANGRIAS ─────────────────────────────────────
  if (dados.aportesSangrias.length > 0) {
    sectionTitle('Aportes e Sangrias do Dia')
    checkPage()
    page.drawRectangle({
      x: MARGIN - 4, y: y - 11,
      width: COL_W + 8, height: 14,
      color: rgb(0.88, 0.88, 0.88)
    })
    text('Horário', MARGIN, 8, true)
    text('Tipo', MARGIN + 60, 8, true)
    text('Forma', MARGIN + 110, 8, true)
    text('Valor', MARGIN + 155, 8, true)
    text('Motivo', MARGIN + 215, 8, true)
    text('Autorizador', MARGIN + 385, 8, true)
    y -= 16
    for (const as of dados.aportesSangrias) {
      checkPage()
      const tipoColor = as.tipo === 'aporte' ? rgb(0.1, 0.5, 0.2) : rgb(0.7, 0.1, 0.1)
      text(as.horario, MARGIN, 8)
      text(as.tipo === 'aporte' ? 'Aporte' : 'Sangria', MARGIN + 60, 8, false, tipoColor)
      text(as.formaPagamento ?? 'Espécie', MARGIN + 110, 8)
      text(fmt(as.valor), MARGIN + 155, 8)
      const motivo = as.motivo.length > 24 ? as.motivo.slice(0, 23) + '…' : as.motivo
      text(motivo, MARGIN + 215, 8)
      text(as.autorizadorNome, MARGIN + 385, 8)
      y -= LINE_H
    }
    y -= 4
  }

  // ── TABELA DE OPERAÇÕES ────────────────────────────────────
  if (dados.operacoes.length > 0) {
    sectionTitle('Operações do Dia')
    checkPage()
    page.drawRectangle({
      x: MARGIN - 4, y: y - 11,
      width: COL_W + 8, height: 14,
      color: rgb(0.88, 0.88, 0.88)
    })
    text('Hora', MARGIN, 7, true)
    text('Produtor', MARGIN + 42, 7, true)
    text('Produto', MARGIN + 175, 7, true)
    text('kg', MARGIN + 255, 7, true)
    text('Espécie', MARGIN + 295, 7, true)
    text('Pix', MARGIN + 365, 7, true)
    text('Total', MARGIN + 435, 7, true)
    y -= 15
    for (const op of dados.operacoes) {
      checkPage(LINE_H + 2)
      const produtor = op.produtor.length > 20 ? op.produtor.slice(0, 19) + '…' : op.produtor
      const produto = op.produto.length > 12 ? op.produto.slice(0, 11) + '…' : op.produto
      text(op.horario, MARGIN, 7)
      text(produtor, MARGIN + 42, 7)
      text(produto, MARGIN + 175, 7)
      text(fmtKg(op.kg), MARGIN + 255, 7)
      text(fmt(op.valorEspecie), MARGIN + 295, 7)
      text(fmt(op.valorPix), MARGIN + 365, 7)
      text(fmt(op.total), MARGIN + 435, 7)
      y -= LINE_H
    }
    y -= 4
  }

  // ── OBSERVAÇÕES ────────────────────────────────────────────
  if (dados.observacoes) {
    sectionTitle('Observações')
    const maxChars = 95
    const linhas: string[] = []
    let restante = dados.observacoes
    while (restante.length > 0) {
      linhas.push(restante.slice(0, maxChars))
      restante = restante.slice(maxChars)
    }
    for (const linha of linhas) {
      checkPage()
      text(linha, MARGIN, 8)
      y -= LINE_H
    }
    y -= 4
  }

  // ── ASSINATURA ─────────────────────────────────────────────
  checkPage(LINE_H * 8)
  y -= 20
  const sigY = y
  page.drawLine({
    start: { x: MARGIN, y: sigY },
    end: { x: MARGIN + 200, y: sigY },
    thickness: 0.5, color: rgb(0.3, 0.3, 0.3)
  })
  text('Operador de Caixa', MARGIN + 30, 8)
  y -= 12
  text(dados.operadorNome, MARGIN + 30, 7, false, rgb(0.4, 0.4, 0.4))
  y = sigY

  page.drawLine({
    start: { x: MARGIN + 280, y: sigY },
    end: { x: MARGIN + 480, y: sigY },
    thickness: 0.5, color: rgb(0.3, 0.3, 0.3)
  })
  text('Supervisor / Tesoureiro', MARGIN + 310, 8)

  // ── RODAPÉ EM TODAS AS PÁGINAS ─────────────────────────────
  const totalPages = doc.getPageCount()
  for (let i = 0; i < totalPages; i++) {
    const pg = doc.getPage(i)
    pg.drawText(
      `Gerado por NexCoop em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Bahia' })}   |   Página ${i + 1} de ${totalPages}`,
      { x: MARGIN, y: 20, size: 7, font: fontR, color: rgb(0.6, 0.6, 0.6) }
    )
  }

  return doc.save()
}
