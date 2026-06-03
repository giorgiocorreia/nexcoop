'use client'

import { useEffect } from 'react'

export default function InviteDetector() {
  useEffect(() => {
    const hash = window.location.hash.slice(1)
    if (!hash) return
    const params = new URLSearchParams(hash)
    if (params.get('error_code') === 'otp_expired' || params.get('error') === 'access_denied') {
      window.location.replace('/link-expirado')
      return
    }
    if (params.get('type') === 'invite' && params.get('access_token')) {
      window.location.replace('/aceitar-convite' + window.location.hash)
    }
  }, [])

  return null
}
