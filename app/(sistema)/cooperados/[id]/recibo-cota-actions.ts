'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

type ParcelaPdf = {
  numero_parcela:  number
  total_parcelas:  number
  forma_pagamento: string
  valor_pago:      number
  data_pagamento:  string | null
  data_vencimento: string | null
  status:          string
  registrado_por:  string | null
}

function fmtBRL(v: number) {
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtData(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR')
}

function fmtForma(f: string) {
  const map: Record<string, string> = {
    dinheiro: 'Dinheiro', pix: 'PIX', cartao: 'Cartão', promessa: 'Promessa',
  }
  return map[f] ?? f
}

function fmtCpf(cpf: string | null) {
  if (!cpf) return '—'
  const s = cpf.replace(/\D/g, '')
  if (s.length !== 11) return cpf
  return `${s.slice(0,3)}.${s.slice(3,6)}.${s.slice(6,9)}-${s.slice(9)}`
}

export async function gerarReciboCota(
  cooperadoId: string,
  cotaId: string,
  pagamentos: ParcelaPdf[]
): Promise<string> {
  const supabase = createAdminClient()

  const [{ data: cooperado }, { data: cota }] = await Promise.all([
    supabase.from('cooperados').select('nome_completo, cpf, organizacao_id').eq('id', cooperadoId).single(),
    supabase.from('cotas_cooperado').select('tipo_cota, quantidade, valor_cota, organizacao_id').eq('id', cotaId).single(),
  ])

  const orgId = cooperado?.organizacao_id ?? cota?.organizacao_id
  const registradorId = pagamentos.find(p => p.registrado_por)?.registrado_por

  const [{ data: org }, { data: registrador }] = await Promise.all([
    orgId
      ? supabase.from('organizacoes').select('nome, cnpj').eq('id', orgId).single()
      : Promise.resolve({ data: null }),
    registradorId
      ? supabase.from('usuarios').select('nome_completo').eq('id', registradorId).single()
      : Promise.resolve({ data: null }),
  ])

  const valorTotalCota = cota
    ? Number(cota.quantidade) * Number(cota.valor_cota)
    : 0

  const totalPago = pagamentos
    .filter(p => p.status === 'pago')
    .reduce((s, p) => s + Number(p.valor_pago), 0)

  const totalPromessa = pagamentos
    .filter(p => p.forma_pagamento === 'promessa')
    .reduce((s, p) => s + Number(p.valor_pago), 0)

  const saldoRestante = Math.max(0, valorTotalCota - totalPago)

  const PAGE_W = 226
  const MARGIN = 12
  const LINE   = 12
  const SEP    = 7
  const pageHeight = Math.max(350, 220 + pagamentos.length * LINE + (totalPromessa > 0 ? LINE : 0))

  const doc   = await PDFDocument.create()
  const fontR = await doc.embedFont(StandardFonts.Helvetica)
  const fontB = await doc.embedFont(StandardFonts.HelveticaBold)
  const page  = doc.addPage([PAGE_W, pageHeight])

  let y = pageHeight - MARGIN

  const gray  = rgb(0.5, 0.5, 0.5)
  const black = rgb(0, 0, 0)
  const green = rgb(0.09, 0.62, 0.46)
  const red   = rgb(0.6, 0.25, 0.06)

  function text(str: string, x: number, bold = false, size = 7.5, color = black) {
    page.drawText(str, { x, y, size, font: bold ? fontB : fontR, color, maxWidth: PAGE_W - x - MARGIN })
    y -= LINE
  }

  function label(lbl: string, val: string, bold = false) {
    page.drawText(lbl, { x: MARGIN, y, size: 7, font: fontR, color: gray })
    page.drawText(val, { x: MARGIN + 50, y, size: 7.5, font: bold ? fontB : fontR, color: black, maxWidth: PAGE_W - MARGIN - 52 })
    y -= LINE
  }

  function line() {
    page.drawLine({
      start: { x: MARGIN, y },
      end:   { x: PAGE_W - MARGIN, y },
      thickness: 0.5,
      color: rgb(0.75, 0.75, 0.75),
    })
    y -= SEP
  }

  function spacer() { y -= SEP }

  // ── Cabeçalho ────────────────────────────────────────────────────────────────
  text(org?.nome ?? 'Organização', MARGIN, true, 9)
  text('RECIBO DE INTEGRALIZAÇÃO DE COTA', MARGIN, false, 7, gray)
  spacer()
  line()

  // ── Dados do cooperado ────────────────────────────────────────────────────────
  label('Cooperado:', cooperado?.nome_completo ?? '—', true)
  label('CPF:', fmtCpf(cooperado?.cpf ?? null))
  label('Tipo de cota:', cota?.tipo_cota === 'plena' ? 'Plena' : 'Colaboradora')
  label('Valor total:', fmtBRL(valorTotalCota), true)
  spacer()
  line()

  // ── Pagamentos ────────────────────────────────────────────────────────────────
  text('PAGAMENTOS:', MARGIN, true)

  for (const p of pagamentos) {
    const dataStr = p.forma_pagamento === 'promessa' && p.data_vencimento
      ? `Vence ${fmtData(p.data_vencimento)}`
      : fmtData(p.data_pagamento)
    const linha = `${p.numero_parcela}/${p.total_parcelas} ${fmtForma(p.forma_pagamento)} — ${fmtBRL(Number(p.valor_pago))} — ${dataStr}`
    text(linha, MARGIN + 4, false, 7)
  }

  spacer()
  line()

  // ── Totais ────────────────────────────────────────────────────────────────────
  const rightX = PAGE_W - MARGIN - 54
  page.drawText('Total pago hoje:', { x: MARGIN, y, size: 7, font: fontR, color: gray })
  page.drawText(fmtBRL(totalPago), { x: rightX, y, size: 7.5, font: fontB, color: green })
  y -= LINE

  if (totalPromessa > 0) {
    page.drawText('Total prometido:', { x: MARGIN, y, size: 7, font: fontR, color: gray })
    page.drawText(fmtBRL(totalPromessa), { x: rightX, y, size: 7.5, font: fontR, color: black })
    y -= LINE
  }

  page.drawText('Saldo restante:', { x: MARGIN, y, size: 7, font: fontR, color: gray })
  page.drawText(fmtBRL(saldoRestante), { x: rightX, y, size: 7.5, font: fontB, color: saldoRestante <= 0 ? green : red })
  y -= LINE

  spacer()
  line()

  // ── Rodapé ────────────────────────────────────────────────────────────────────
  if (registrador?.nome_completo) {
    page.drawText(`Registrado por: ${registrador.nome_completo}`, { x: MARGIN, y, size: 6.5, font: fontR, color: gray })
    y -= LINE
  }

  const hoje = new Date().toLocaleDateString('pt-BR')
  page.drawText(`Data: ${hoje}`, { x: MARGIN, y, size: 6.5, font: fontR, color: gray })
  y -= LINE

  spacer()
  line()

  const cnpjStr = org?.cnpj ? ` — CNPJ: ${org.cnpj}` : ''
  page.drawText(`${org?.nome ?? ''}${cnpjStr}`, { x: MARGIN, y, size: 6, font: fontR, color: gray, maxWidth: PAGE_W - MARGIN * 2 })

  const pdfBytes = await doc.save()
  return Buffer.from(pdfBytes).toString('base64')
}
