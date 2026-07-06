'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { CampoSenha } from '@/components/CampoSenha'

const ROXO = '#635BFF'

function AuthForm({ onEmailClick }: { onEmailClick: () => void }) {
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
  const [foco, setFoco] = useState<string | null>(null)

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

    if (data.session) {
      router.push(redirect)
      router.refresh()
      return
    }

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

  const inputStyle = (field: string): React.CSSProperties => ({
    width: '100%',
    padding: '11px 12px',
    border: `1px solid ${foco === field ? '#E07B30' : '#D6D3D1'}`,
    borderRadius: 8,
    fontSize: 14,
    background: '#fff',
    color: '#1C1917',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  })

  return (
    <div>
      <div className="login-tabs">
        {(['login', 'cadastro'] as const).map(a => (
          <button
            key={a}
            type="button"
            className={aba === a ? 'login-tab login-tab--active' : 'login-tab'}
            onClick={() => { setAba(a); setErro(''); setSucesso('') }}
          >
            {a === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        ))}
      </div>

      {sucesso ? (
        <div className="login-alert login-alert--ok">{sucesso}</div>
      ) : aba === 'login' ? (
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 12 }}>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="E-mail"
              required
              style={inputStyle('email')}
              onFocus={() => setFoco('email')}
              onBlur={() => setFoco(null)}
              onClick={onEmailClick}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <CampoSenha
              value={senha}
              onChange={setSenha}
              placeholder="Senha"
              style={{ width: '100%' }}
            />
          </div>

          {erro && <div className="login-alert login-alert--err">{erro}</div>}

          <button type="submit" disabled={carregando} className="login-submit">
            {carregando ? 'Entrando…' : 'Entrar'}
            {!carregando && <span aria-hidden>→</span>}
          </button>

          <button type="button" onClick={handleEsqueciSenha} className="login-link-btn">
            Recuperar senha
          </button>
        </form>
      ) : (
        <form onSubmit={handleCadastro}>
          <div style={{ marginBottom: 12 }}>
            <input
              type="text"
              value={nomeOrg}
              onChange={e => setNomeOrg(e.target.value)}
              placeholder="Nome da cooperativa / associação"
              required
              style={inputStyle('org')}
              onFocus={() => setFoco('org')}
              onBlur={() => setFoco(null)}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="E-mail"
              required
              style={inputStyle('email')}
              onFocus={() => setFoco('email')}
              onBlur={() => setFoco(null)}
              onClick={onEmailClick}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <CampoSenha value={senha} onChange={setSenha} placeholder="Senha (mín. 6 caracteres)" />
          </div>

          {erro && <div className="login-alert login-alert--err">{erro}</div>}

          <button type="submit" disabled={carregando} className="login-submit">
            {carregando ? 'Criando conta…' : 'Criar conta grátis'}
            {!carregando && <span aria-hidden>→</span>}
          </button>

          <p className="login-footnote">
            Plano gratuito até 10 filiados. Sem cartão de crédito.
          </p>
        </form>
      )}
    </div>
  )
}

function PainelMarca({
  videoRef,
  corinaAtiva,
  videoTerminou,
  onVideoEnded,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>
  corinaAtiva: boolean
  videoTerminou: boolean
  onVideoEnded: () => void
}) {
  const mostrarFoto = !corinaAtiva || videoTerminou

  return (
    <div className="login-brand-panel">
      <div className="login-brand-glow login-brand-glow--a" />
      <div className="login-brand-glow login-brand-glow--b" />

      <div className="login-brand-content">
        <h2>Gestão com Inteligência Artificial</h2>
        <p>Sistema para cooperativas e associações</p>
      </div>

      <div className="login-brand-corina" aria-hidden>
        <video
          ref={videoRef}
          src="/videos/corina-login.mp4"
          poster="/images/corina-login.png"
          playsInline
          preload="auto"
          onEnded={onVideoEnded}
          style={{ display: mostrarFoto ? 'none' : 'block' }}
        />
        {mostrarFoto && (
          <img src="/images/corina-login.png" alt="" />
        )}
      </div>
    </div>
  )
}

export default function LoginPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const jaFalou = useRef(false)
  const [corinaAtiva, setCorinaAtiva] = useState(false)
  const [videoTerminou, setVideoTerminou] = useState(false)

  const falarCorina = () => {
    if (jaFalou.current) return
    jaFalou.current = true

    const video = videoRef.current
    if (!video) return

    setCorinaAtiva(true)
    setVideoTerminou(false)
    video.muted = false
    video.volume = 1
    video.currentTime = 0
    video.play().catch(() => {})
  }

  return (
    <div className="login-page">
      <style>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 32px 16px 24px;
          font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
          background-color: #E8E0F4;
          background-image:
            linear-gradient(135deg, rgba(99, 91, 255, 0.05) 25%, transparent 25%),
            linear-gradient(225deg, rgba(99, 91, 255, 0.05) 25%, transparent 25%),
            linear-gradient(45deg, rgba(99, 91, 255, 0.05) 25%, transparent 25%),
            linear-gradient(315deg, rgba(99, 91, 255, 0.05) 25%, #E8E0F4 25%);
          background-size: 40px 40px;
          background-position: 0 0, 0 20px, 20px -20px, -20px 0;
        }
        .login-stage {
          width: 100%;
          max-width: 620px;
          display: flex;
          justify-content: center;
        }
        .login-card {
          display: flex;
          width: 100%;
          background: #fff;
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 12px 40px rgba(72, 64, 204, 0.12), 0 2px 8px rgba(0,0,0,0.04);
        }
        .login-brand-panel {
          flex: 0 0 38%;
          background: linear-gradient(165deg, #0D9488 0%, #635BFF 50%, #4840CC 100%);
          padding: 22px 14px 0;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          color: #fff;
          position: relative;
          overflow: hidden;
          min-height: 340px;
        }
        .login-brand-glow {
          position: absolute;
          border-radius: 50%;
          background: rgba(255,255,255,0.07);
        }
        .login-brand-glow--a { width: 140px; height: 140px; top: -45px; right: -25px; }
        .login-brand-glow--b { width: 90px; height: 90px; bottom: 20px; left: -20px; background: rgba(255,255,255,0.05); }
        .login-brand-content {
          position: relative;
          z-index: 1;
          text-align: center;
          padding: 0 6px;
        }
        .login-brand-content h2 {
          font-size: 1.12rem;
          font-weight: 700;
          line-height: 1.3;
          margin: 0 0 8px;
          text-align: center;
        }
        .login-brand-content p {
          font-size: 11px;
          opacity: 0.92;
          line-height: 1.45;
          margin: 0;
          text-align: center;
        }
        .login-brand-corina {
          position: relative;
          z-index: 1;
          margin-top: 12px;
          width: calc(100% + 28px);
          margin-left: -14px;
          align-self: center;
          line-height: 0;
        }
        .login-brand-corina video,
        .login-brand-corina img {
          width: 100%;
          height: auto;
          max-height: 220px;
          object-fit: cover;
          object-position: center 8%;
          display: block;
        }
        .login-form-panel {
          flex: 1;
          padding: 26px 24px 22px;
          min-width: 0;
          background: #FAFAF9;
        }
        .login-tabs {
          display: flex;
          gap: 0;
          margin-bottom: 18px;
          border-bottom: 1px solid #E7E5E4;
        }
        .login-tab {
          flex: 1;
          padding: 8px 0 10px;
          border: none;
          background: none;
          font-size: 13px;
          font-weight: 600;
          color: #A8A29E;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          margin-bottom: -1px;
          transition: color 0.15s, border-color 0.15s;
        }
        .login-tab--active {
          color: ${ROXO};
          border-bottom-color: ${ROXO};
        }
        .login-submit {
          width: 100%;
          padding: 8px 14px;
          border: none;
          border-radius: 6px;
          background: ${ROXO};
          color: #fff;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          box-shadow: 0 1px 6px rgba(99, 91, 255, 0.22);
        }
        .login-submit:disabled { background: #9F9BFF; cursor: not-allowed; }
        .login-link-btn {
          display: block;
          width: 100%;
          margin-top: 12px;
          font-size: 13px;
          color: ${ROXO};
          background: none;
          border: none;
          cursor: pointer;
          text-align: center;
        }
        .login-alert {
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 13px;
          margin-bottom: 12px;
          text-align: center;
        }
        .login-alert--ok { background: #F0FDF4; border: 1px solid #86EFAC; color: #166534; }
        .login-alert--err { background: #FEF2F2; border: 1px solid #FECACA; color: #DC2626; }
        .login-footnote {
          font-size: 11px;
          color: #A8A29E;
          text-align: center;
          margin: 10px 0 0;
        }
        .login-copyright {
          font-size: 11px;
          color: #9CA3AF;
          margin-top: 16px;
          text-align: center;
        }
        @media (max-width: 640px) {
          .login-stage { max-width: 440px; }
          .login-card { flex-direction: column; }
          .login-brand-panel {
            flex: none;
            min-height: auto;
            padding: 20px 14px 0;
          }
          .login-brand-corina video,
          .login-brand-corina img { max-height: 180px; }
          .login-form-panel { padding: 22px 20px 20px; }
        }
      `}</style>

      <div className="login-stage">
        <div className="login-card">
          <PainelMarca
            videoRef={videoRef}
            corinaAtiva={corinaAtiva}
            videoTerminou={videoTerminou}
            onVideoEnded={() => setVideoTerminou(true)}
          />
          <div className="login-form-panel">
            <Image
              src="/images/logo-nexcoop-horizontal.png"
              alt="NexCoop"
              width={330}
              height={63}
              style={{ height: 60, width: 'auto', display: 'block', margin: '0 auto 20px' }}
              priority
            />

            <Suspense fallback={
              <div style={{ textAlign: 'center', color: '#A8A29E', fontSize: 13, padding: 20 }}>Carregando…</div>
            }>
              <AuthForm onEmailClick={falarCorina} />
            </Suspense>
          </div>
        </div>
      </div>

      <p className="login-copyright">
        NexCoop © 2026 — Gestão que fortalece quem produz juntos
      </p>
    </div>
  )
}