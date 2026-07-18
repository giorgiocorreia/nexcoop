'use client'

import { useCallback } from 'react'
import { gerarPdfPagamentosProdutores, DadosPagamentosProdutoresPdf } from './gerarPdfPagamentosProdutores'

export function usePdfPagamentosProdutores() {
  const baixarPdf = useCallback(async (dados: DadosPagamentosProdutoresPdf) => {
    const bytes = await gerarPdfPagamentosProdutores(dados)
    const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const periodo = dados.mesLabel.replace('/', '-')
    a.href = url
    a.download = `pagamentos-produtores-${periodo}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  return { baixarPdf }
}
