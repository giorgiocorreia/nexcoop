'use client'

import { useEffect, useRef } from 'react'

interface Props {
  symbol: string
  height?: number
}

export function TradingViewMiniWidget({ symbol, height = 220 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    container.innerHTML = ''
    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js'
    script.type = 'text/javascript'
    script.async = true
    script.innerHTML = JSON.stringify({
      symbol,
      width: '100%',
      height,
      locale: 'br',
      dateRange: '1M',
      colorTheme: 'light',
      isTransparent: true,
      autosize: true,
    })
    container.appendChild(script)
  }, [symbol, height])

  return (
    <div
      ref={containerRef}
      style={{ height, width: '100%', overflow: 'hidden' }}
    />
  )
}
