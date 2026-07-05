'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function FiliadoSairButton() {
  const router = useRouter()

  async function handleSair() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/filiado/login')
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={handleSair}
      style={{
        width: '100%', padding: '12px', background: '#fff',
        border: '1px solid #E7E5E4', borderRadius: 10,
        fontSize: 13, fontWeight: 600, color: '#78716C', cursor: 'pointer',
      }}
    >
      Sair e voltar ao login
    </button>
  )
}