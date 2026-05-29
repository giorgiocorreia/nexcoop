'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const GREEN = '#1D9E75'

function AuthForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/dashboard'

  const [aba, setAba] = useState<'login' | 'cadastro'>('login')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [nomeOrg, setNomeOrg] = useState('')
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
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

  async function handleCadastro(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setCarregando(true)

    if (!nomeOrg.trim()) {
      setErro('Informe o nome da sua cooperativa ou associação.')
      setCarregando(false)
      return
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        data: { nome_organizacao: nomeOrg.trim() },
      },
    })

    if (error) {
      setErro(error.message === 'User already registered'
        ? 'Este e-mail já está cadastrado. Faça login.'
        : 'Erro ao criar conta. Tente novamente.')
      setCarregando(false)
      return
    }

    // Se sessão foi criada, redireciona direto (confirm email desabilitado)
    if (data.session) {
      router.push(redirect)
      router.refresh()
      return
    }

    // Confirm email habilitado — pede confirmação
    setSucesso('Conta criada! Verifique seu e-mail para confirmar o cadastro.')
    setCarregando(false)
  }

  async function handleEsqueciSenha() {
    if (!email) { setErro('Digite seu e-mail para recuperar a senha.'); return }
    setCarregando(true)
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    })
    setErro('')
    setCarregando(false)
    alert(`E-mail de recuperação enviado para ${email}`)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', border: '1px solid #d5d3cc',
    borderRadius: '8px', fontSize: '14px', background: '#fafaf8',
    color: '#1a1a1a', outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '16px', overflow: 'hidden' }}>
      <div style={{ display: 'flex', borderBottom: '1px solid #e5e3dc' }}>
        {(['login', 'cadastro'] as const).map(a => (
          <button key={a} onClick={() => { setAba(a); setErro(''); setSucesso('') }}
            style={{
              flex: 1, padding: '14px', background: 'none', border: 'none',
              borderBottom: aba === a ? `2px solid ${GREEN}` : '2px solid transparent',
              fontSize: '14px', fontWeight: aba === a ? '600' : '400',
              color: aba === a ? GREEN : '#888', cursor: 'pointer',
              marginBottom: '-1px',
            }}>
            {a === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        ))}
      </div>

      <div style={{ padding: '2rem' }}>
        {sucesso ? (
          <div style={{ background: '#f0faf6', border: '1px solid #6ee7b7', borderRadius: '8px', padding: '16px', fontSize: '14px', color: '#065f46', textAlign: 'center' }}>
            ✅ {sucesso}
          </div>
        ) : aba === 'login' ? (
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#444', marginBottom: '6px' }}>E-mail</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com" required style={inputStyle}
                onFocus={e => e.target.style.borderColor = GREEN}
                onBlur={e => e.target.style.borderColor = '#d5d3cc'}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: '500', color: '#444' }}>Senha</label>
                <button type="button" onClick={handleEsqueciSenha}
                  style={{ fontSize: '12px', color: GREEN, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  Esqueci a senha
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <input type={mostrarSenha ? 'text' : 'password'} value={senha}
                  onChange={e => setSenha(e.target.value)} placeholder="••••••••" required
                  style={{ ...inputStyle, padding: '10px 40px 10px 12px' }}
                  onFocus={e => e.target.style.borderColor = GREEN}
                  onBlur={e => e.target.style.borderColor = '#d5d3cc'}
                />
                <button type="button" onClick={() => setMostrarSenha(!mostrarSenha)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: '14px', padding: '4px' }}>
                  {mostrarSenha ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {erro && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: '#dc2626', marginBottom: '1rem' }}>{erro}</div>}

            <button type="submit" disabled={carregando}
              style={{ width: '100%', padding: '11px', background: carregando ? '#7fceb1' : GREEN, color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: carregando ? 'not-allowed' : 'pointer' }}>
              {carregando ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleCadastro}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#444', marginBottom: '6px' }}>Nome da cooperativa / associação</label>
              <input type="text" value={nomeOrg} onChange={e => setNomeOrg(e.target.value)}
                placeholder="Ex: COOPAIBI" required style={inputStyle}
                onFocus={e => e.target.style.borderColor = GREEN}
                onBlur={e => e.target.style.borderColor = '#d5d3cc'}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#444', marginBottom: '6px' }}>E-mail</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com" required style={inputStyle}
                onFocus={e => e.target.style.borderColor = GREEN}
                onBlur={e => e.target.style.borderColor = '#d5d3cc'}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#444', marginBottom: '6px' }}>Senha</label>
              <div style={{ position: 'relative' }}>
                <input type={mostrarSenha ? 'text' : 'password'} value={senha}
                  onChange={e => setSenha(e.target.value)} placeholder="Mínimo 6 caracteres" required minLength={6}
                  style={{ ...inputStyle, padding: '10px 40px 10px 12px' }}
                  onFocus={e => e.target.style.borderColor = GREEN}
                  onBlur={e => e.target.style.borderColor = '#d5d3cc'}
                />
                <button type="button" onClick={() => setMostrarSenha(!mostrarSenha)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: '14px', padding: '4px' }}>
                  {mostrarSenha ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {erro && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: '#dc2626', marginBottom: '1rem' }}>{erro}</div>}

            <button type="submit" disabled={carregando}
              style={{ width: '100%', padding: '11px', background: carregando ? '#7fceb1' : GREEN, color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: carregando ? 'not-allowed' : 'pointer' }}>
              {carregando ? 'Criando conta...' : 'Criar conta grátis'}
            </button>

            <p style={{ fontSize: '12px', color: '#999', textAlign: 'center', marginTop: '12px' }}>
              Plano gratuito até 10 filiados. Sem cartão de crédito.
            </p>
          </form>
        )}
      </div>
    </div>
  )
}

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
            width: '56px', height: '56px', borderRadius: '14px', background: GREEN,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem', fontSize: '28px',
          }}>🌱</div>
          <h1 style={{ fontSize: '24px', fontWeight: '600', color: '#1a1a1a', margin: 0 }}>NextCoop</h1>
          <p style={{ fontSize: '14px', color: '#6b6b6b', marginTop: '4px' }}>Plataforma cooperativista</p>
        </div>

        <Suspense fallback={
          <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '16px', padding: '2rem', textAlign: 'center', color: '#888', fontSize: '14px' }}>
            Carregando…
          </div>
        }>
          <AuthForm />
        </Suspense>

        <p style={{ textAlign: 'center', fontSize: '12px', color: '#999', marginTop: '1.5rem' }}>
          NextCoop © 2026 — Gestão que fortalece quem produz juntos
        </p>
      </div>
    </div>
  )
}