'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CampoSenha } from '@/components/CampoSenha'
import { buscarEmailPorCPF } from '@/lib/filiado/actions'
import { COM_C } from '@/components/nexcoop/ui'

const ROXO = '#635BFF'

function formatarCPFInput(valor: string) {
  const s = valor.replace(/\D/g, '').slice(0, 11)
  if (s.length <= 3) return s
  if (s.length <= 6) return `${s.slice(0, 3)}.${s.slice(3)}`
  if (s.length <= 9) return `${s.slice(0, 3)}.${s.slice(3, 6)}.${s.slice(6)}`
  return `${s.slice(0, 3)}.${s.slice(3, 6)}.${s.slice(6, 9)}-${s.slice(9)}`
}

export default function FiliadoLoginPage() {
  const router = useRouter()
  const [cpf, setCpf] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setCarregando(true)

    const lookup = await buscarEmailPorCPF(cpf)
    if ('error' in lookup) {
      setErro(lookup.error)
      setCarregando(false)
      return
    }

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: lookup.email,
      password: senha,
    })

    if (error) {
      setErro('CPF ou senha incorretos.')
      setCarregando(false)
      return
    }

    router.push('/filiado/inicio')
    router.refresh()
  }

  return (
    <div style={{
      background: '#fff',
      borderRadius: 16,
      border: '1px solid #E7E5E4',
      padding: '28px 24px',
      boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
    }}>
      <h1 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800, color: '#1C1917' }}>Entrar</h1>
      <p style={{ margin: '0 0 24px', fontSize: 13, color: '#78716C', lineHeight: 1.5 }}>
        Use seu CPF e a senha enviada pela cooperativa.
      </p>

      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#44403C', marginBottom: 6 }}>CPF</label>
          <input
            type="text"
            value={cpf}
            onChange={e => setCpf(formatarCPFInput(e.target.value))}
            placeholder="000.000.000-00"
            required
            style={{
              width: '100%', padding: '12px 14px', fontSize: 15, borderRadius: 10,
              border: '1px solid #D6D3D1', outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#44403C', marginBottom: 6 }}>Senha</label>
          <CampoSenha value={senha} onChange={setSenha} placeholder="Sua senha" />
        </div>

        {erro && (
          <div style={{
            background: COM_C.vermelhoLt, border: '1px solid #FECACA', borderRadius: 10,
            padding: '10px 14px', fontSize: 13, color: COM_C.vermelho,
          }}>
            {erro}
          </div>
        )}

        <button
          type="submit"
          disabled={carregando}
          style={{
            width: '100%', padding: '14px', background: ROXO, color: '#fff',
            border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700,
            cursor: carregando ? 'wait' : 'pointer', opacity: carregando ? 0.8 : 1,
            marginTop: 4,
          }}
        >
          {carregando ? 'Entrando…' : 'Acessar portal'}
        </button>
      </form>

      <p style={{ margin: '20px 0 0', fontSize: 12, color: '#A8A29E', textAlign: 'center' }}>
        Problemas com o acesso? Fale com a secretaria da sua cooperativa.
      </p>
    </div>
  )
}