'use client'

import { useCallback } from 'react'
import { gerarPdfSaidasCaixa, DadosSaidasCaixaPdf } from './gerarPdfSaidasCaixa'

export function usePdfSaidasCaixa() {
  const baixarPdf = useCallback(async (dados: DadosSaidasCaixaPdf) => {
    const bytes = await gerarPdfSaidasCaixa(dados)
    const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const periodo = dados.mesLabel.replace('/', '-')
    a.href = url
    a.download = `saidas-caixa-${periodo}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  return { baixarPdf }
}
