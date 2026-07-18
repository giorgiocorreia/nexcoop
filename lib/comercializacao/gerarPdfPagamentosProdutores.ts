'use client'

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import type { PagamentoProdutorLinha } from './pagamentos-produtores-utils'

export interface DadosPagamentosProdutoresPdf {
  orgNome: string
  orgCnpj: string
  mesLabel: string
  linhas: PagamentoProdutorLinha[]
  total: number
  totalEspecie: number
  totalPix: number
}

const A4 = { width: 595.28, height: 841.89 }
const MARGIN = 40
const LINE_H = 14
const COL_W = A4.width - MARGIN * 2

function fmt(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function fmtData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Bahia' })
}

// pdf-lib (não pdfkit — pdfkit é incompatível com o runtime serverless da
// Vercel). Layout espelha gerarPdfFechamentoCaixa (mesma paleta, mesma
// paginação A4) por consistência visual entre os relatórios do módulo.
export async function gerarPdfPagamentosProdutores(dados: DadosPagamentosProdutoresPdf): Promise<Uint8Array> {
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
    page.drawText('NexCoop — Pagamentos a Produtores', {
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
  text('PAGAMENTOS A PRODUTORES', MARGIN, 16, true, rgb(0.2, 0.2, 0.2))
  y -= 20
  text(dados.orgNome, MARGIN, 10, true)
  y -= 14
  text(`CNPJ: ${dados.orgCnpj}`, MARGIN, 8)
  y -= 12
  text(`Período: ${dados.mesLabel}`, MARGIN, 8)
  y -= 16
  divider()

  // ── RESUMO DO PERÍODO ──────────────────────────────────────
  sectionTitle('Resumo do Período')
  row('Total pago em espécie', fmt(dados.totalEspecie))
  row('Total pago via Pix', fmt(dados.totalPix))
  row('Quantidade de pagamentos', String(dados.linhas.length))
  y -= 4; divider()
  row('Total do período', fmt(dados.total), true)
  y -= 4

  // ── DETALHAMENTO ───────────────────────────────────────────
  sectionTitle('Detalhamento')
  if (dados.linhas.length === 0) {
    checkPage()
    text('Nenhum pagamento registrado no período.', MARGIN, 9, false, rgb(0.5, 0.5, 0.5))
    y -= LINE_H
  } else {
    checkPage()
    page.drawRectangle({
      x: MARGIN - 4, y: y - 11,
      width: COL_W + 8, height: 14,
      color: rgb(0.88, 0.88, 0.88)
    })
    text('Data', MARGIN, 8, true)
    text('Produtor', MARGIN + 70, 8, true)
    text('CPF', MARGIN + 300, 8, true)
    text('Forma', MARGIN + 400, 8, true)
    text('Valor', MARGIN + 460, 8, true)
    y -= 16
    for (const l of dados.linhas) {
      checkPage(LINE_H + 2)
      const nome = l.produtor_nome.length > 34 ? l.produtor_nome.slice(0, 33) + '…' : l.produtor_nome
      text(fmtData(l.data), MARGIN, 8)
      text(nome, MARGIN + 70, 8)
      text(l.produtor_cpf ?? '—', MARGIN + 300, 8)
      text(l.forma_pagamento === 'pix' ? 'Pix' : 'Espécie', MARGIN + 400, 8)
      text(fmt(l.valor), MARGIN + 460, 8)
      y -= LINE_H
    }
  }

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
