'use client'

import { useEffect, useRef } from 'react'

interface Props {
  symbol: string
}

export function TradingViewMiniWidget({ symbol }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    container.innerHTML = ''
    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-single-quote.js'
    script.type = 'text/javascript'
    script.async = true
    script.innerHTML = JSON.stringify({
      symbol,
      width: '100%',
      isTransparent: true,
      colorTheme: 'light',
      locale: 'br',
    })
    container.appendChild(script)
  }, [symbol])

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', minHeight: '60px', overflow: 'hidden' }}
    />
  )
}
