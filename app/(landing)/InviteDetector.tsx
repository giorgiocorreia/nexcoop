'use client'

import { useEffect } from 'react'

export default function InviteDetector() {
  useEffect(() => {
    const hash = window.location.hash.slice(1)
    if (!hash) return
    const params = new URLSearchParams(hash)
    if (params.get('type') === 'invite' && params.get('access_token')) {
      window.location.replace('/aceitar-convite' + window.location.hash)
    }
  }, [])

  return null
}
