'use client'

import { useEffect, useState } from 'react'

export default function BotaoAjuda({ chave }: { chave: string }) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/manuais?chave=${chave}`)
      .then(r => r.json())
      .then(d => setUrl(d.url))
  }, [chave])

  if (!url) return null

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      title="Abrir manual do módulo"
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 26, height: 26, borderRadius: '50%',
        background: '#f8f7f4', border: '1px solid #e5e3dc',
        color: '#6b7280', fontSize: 12, fontWeight: 700,
        textDecoration: 'none', flexShrink: 0,
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLAnchorElement
        el.style.background = '#635BFF'
        el.style.color = 'white'
        el.style.borderColor = '#635BFF'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLAnchorElement
        el.style.background = '#f8f7f4'
        el.style.color = '#6b7280'
        el.style.borderColor = '#e5e3dc'
      }}
    >
      ?
    </a>
  )
}
