'use client'

import { useCallback } from 'react'
import { gerarPdfFechamentoCaixa, DadosFechamentoPdf } from './gerarPdfFechamento'

export function usePdfFechamento() {
  const baixarPdf = useCallback(async (dados: DadosFechamentoPdf) => {
    const bytes = await gerarPdfFechamentoCaixa(dados)
    const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const data = new Date(dados.dataFechamento)
      .toLocaleDateString('pt-BR', { timeZone: 'America/Bahia' })
      .replace(/\//g, '-')
    a.href = url
    a.download = `fechamento-caixa-${data}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  return { baixarPdf }
}
