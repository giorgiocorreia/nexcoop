'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// ─── Formulário (usa useSearchParams — precisa ficar dentro de <Suspense>) ────

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/dashboard'

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [mostrarSenha, setMostrarSenha] = useState(false)

  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setCarregando(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })

    if (error) {
      setErro('E-mail ou senha incorretos. Tente novamente.')
      setCarregando(false)
      return
    }

    router.push(redirect)
    router.refresh()
  }

  async function handleEsqueciSenha() {
    if (!email) {
      setErro('Digite seu e-mail para recuperar a senha.')
      return
    }
    setCarregando(true)
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    })
    setErro('')
    setCarregando(false)
    alert(`E-mail de recuperação enviado para ${email}`)
  }

  return (
    <div style={{ background: '#ffffff', border: '1px solid #e5e3dc', borderRadius: '16px', padding: '2rem' }}>
      <h2 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 1.5rem', color: '#1a1a1a' }}>
        Entrar na sua conta
      </h2>

      <form onSubmit={handleLogin}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#444', marginBottom: '6px' }}>E-mail</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="seu@email.com" required
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #d5d3cc', borderRadius: '8px', fontSize: '14px', background: '#fafaf8', color: '#1a1a1a', outline: 'none', boxSizing: 'border-box' }}
            onFocus={e => e.target.style.borderColor = '#1D9E75'}
            onBlur={e => e.target.style.borderColor = '#d5d3cc'}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: '500', color: '#444' }}>Senha</label>
            <button type="button" onClick={handleEsqueciSenha}
              style={{ fontSize: '12px', color: '#1D9E75', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              Esqueci a senha
            </button>
          </div>
          <div style={{ position: 'relative' }}>
            <input type={mostrarSenha ? 'text' : 'password'} value={senha}
              onChange={e => setSenha(e.target.value)} placeholder="••••••••" required
              style={{ width: '100%', padding: '10px 40px 10px 12px', border: '1px solid #d5d3cc', borderRadius: '8px', fontSize: '14px', background: '#fafaf8', color: '#1a1a1a', outline: 'none', boxSizing: 'border-box' }}
              onFocus={e => e.target.style.borderColor = '#1D9E75'}
              onBlur={e => e.target.style.borderColor = '#d5d3cc'}
            />
            <button type="button" onClick={() => setMostrarSenha(!mostrarSenha)}
              style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: '14px', padding: '4px' }}>
              {mostrarSenha ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        {erro && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: '#dc2626', marginBottom: '1rem' }}>
            {erro}
          </div>
        )}

        <button type="submit" disabled={carregando}
          style={{ width: '100%', padding: '11px', background: carregando ? '#7fceb1' : '#1D9E75', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: carregando ? 'not-allowed' : 'pointer' }}>
          {carregando ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}

// ─── Page (envolve LoginForm em Suspense para satisfazer next build) ──────────

export default function LoginPage() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#f8f7f4',
      fontFamily: 'system-ui, -apple-system, sans-serif', padding: '1rem',
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '14px', background: '#1D9E75',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem', fontSize: '28px',
          }}>🌱</div>
          <h1 style={{ fontSize: '24px', fontWeight: '600', color: '#1a1a1a', margin: 0 }}>NextCoop</h1>
          <p style={{ fontSize: '14px', color: '#6b6b6b', marginTop: '4px' }}>Plataforma cooperativista</p>
        </div>

        <Suspense fallback={
          <div style={{ background: '#ffffff', border: '1px solid #e5e3dc', borderRadius: '16px', padding: '2rem', textAlign: 'center', color: '#888', fontSize: '14px' }}>
            Carregando…
          </div>
        }>
          <LoginForm />
        </Suspense>

        <p style={{ textAlign: 'center', fontSize: '12px', color: '#999', marginTop: '1.5rem' }}>
          NextCoop © 2026 — Gestão que fortalece quem produz juntos
        </p>
      </div>
    </div>
  )
}
