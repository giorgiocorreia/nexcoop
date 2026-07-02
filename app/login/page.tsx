'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CampoSenha } from '@/components/CampoSenha'

const GREEN = '#635BFF'

function AuthForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/dashboard'

  useEffect(() => {
    if (redirect !== '/dashboard' && window.location.hash.includes('access_token')) {
      router.replace(redirect + window.location.hash)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [aba, setAba] = useState<'login' | 'cadastro'>('login')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [nomeOrg, setNomeOrg] = useState('')
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [carregando, setCarregando] = useState(false)

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
      redirectTo: `${window.location.origin}/auth/callback`,
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
              <CampoSenha value={senha} onChange={setSenha} placeholder="••••••••" />
            </div>

            {erro && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: '#dc2626', marginBottom: '1rem' }}>{erro}</div>}

            <button type="submit" disabled={carregando}
              style={{ width: '100%', padding: '11px', background: carregando ? '#9F9BFF' : GREEN, color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: carregando ? 'not-allowed' : 'pointer' }}>
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
              <CampoSenha value={senha} onChange={setSenha} placeholder="Mínimo 6 caracteres" />
            </div>

            {erro && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: '#dc2626', marginBottom: '1rem' }}>{erro}</div>}

            <button type="submit" disabled={carregando}
              style={{ width: '100%', padding: '11px', background: carregando ? '#9F9BFF' : GREEN, color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: carregando ? 'not-allowed' : 'pointer' }}>
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
    <div className="login-page" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <style>{`
        .login-page { display: flex; min-height: 100vh; }
        .login-left {
          flex: 1; display: flex; align-items: center; justify-content: center;
          background: #f8f7f4; padding: 1rem;
        }
        .login-right { display: none; }
        @media (min-width: 900px) {
          .login-left { flex: 0 0 460px; }
          .login-right {
            display: flex; flex: 1; align-items: center; justify-content: center;
            position: relative; overflow: hidden;
          }
        }
      `}</style>

      {/* Esquerda — formulário (conteúdo original inalterado) */}
      <div className="login-left">
        <div style={{ width: '100%', maxWidth: '400px' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <img src="/images/logo-nexcoop-horizontal.png" alt="NexCoop" style={{ height: 40, width: 'auto', display: 'block', margin: '0 auto 1.5rem' }} />
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
            NexCoop © 2026 — Gestão que fortalece quem produz juntos
          </p>
        </div>
      </div>

      {/* Direita — painel de marca (visível a partir de 900px) */}
      <div className="login-right" style={{ background: `linear-gradient(160deg, ${GREEN} 0%, #4840CC 100%)` }}>
        <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', top: -120, right: -100 }} />
        <div style={{ position: 'absolute', width: 260, height: 260, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', bottom: -80, left: -60 }} />

        <div style={{ position: 'relative', textAlign: 'center', padding: '3rem', maxWidth: 440 }}>
          <div style={{
            width: 88, height: 88, borderRadius: '50%', background: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 2rem', boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          }}>
            <img src="/images/logo-nexcoop-onlyone.png" alt="NexCoop" style={{ width: 52, height: 52 }} />
          </div>
          <h1 style={{ color: '#fff', fontSize: '28px', fontWeight: 700, lineHeight: 1.3, margin: '0 0 12px' }}>
            Gestão que fortalece quem produz juntos
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '15px', margin: 0 }}>
            Plataforma cooperativista
          </p>
        </div>
      </div>
    </div>
  )
}