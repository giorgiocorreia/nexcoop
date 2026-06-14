'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CampoSenha } from '@/components/CampoSenha'

export const dynamic = 'force-dynamic'

const PURPLE = '#635BFF'

export default function AceitarConvitePage() {
  const router = useRouter()
  const supabase = useRef(createClient()).current

  const [fase, setFase] = useState<'carregando' | 'formulario' | 'salvando' | 'erro'>('carregando')
  const [erroMsg, setErroMsg] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')

  useEffect(() => {
    const hash = window.location.hash.slice(1)
    const params = new URLSearchParams(hash)
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')

    if (!accessToken || !refreshToken) {
      setErroMsg('Link de convite inválido ou expirado. Solicite um novo convite ao administrador.')
      setFase('erro')
      return
    }

    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        if (error) {
          setErroMsg('Não foi possível validar o convite: ' + error.message)
          setFase('erro')
        } else {
          setFase('formulario')
        }
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleDefinirSenha(e: React.FormEvent) {
    e.preventDefault()
    if (senha.length < 6) {
      setErroMsg('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (senha !== confirmar) {
      setErroMsg('As senhas não coincidem.')
      return
    }
    setErroMsg('')
    setFase('salvando')

    const { error } = await supabase.auth.updateUser({ password: senha })
    if (error) {
      setErroMsg('Erro ao definir senha: ' + error.message)
      setFase('formulario')
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const res = await fetch('/api/aceitar-parceiro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, email: user.email }),
      })
      const data = await res.json()
      if (data.isParceiro) {
        router.push('/escritorio')
        return
      }
    }

    router.push('/dashboard')
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', border: '1px solid #d5d3cc',
    borderRadius: '8px', fontSize: '14px', background: '#fafaf8',
    color: '#1a1a1a', outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#f8f7f4',
      fontFamily: 'system-ui, -apple-system, sans-serif', padding: '1rem',
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img src="/images/logo-nexcoop-horizontal.png" alt="NexCoop" style={{ height: 36, width: 'auto', display: 'block', margin: '0 auto 1.5rem' }} />
          <p style={{ fontSize: '14px', color: '#6b6b6b', marginTop: '4px' }}>
            Plataforma cooperativista
          </p>
        </div>

        {/* Card */}
        <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '16px', overflow: 'hidden' }}>

          {/* Carregando */}
          {fase === 'carregando' && (
            <div style={{ padding: '3rem 2rem', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '1rem' }}>⏳</div>
              <p style={{ fontSize: '14px', color: '#888' }}>Validando seu convite…</p>
            </div>
          )}

          {/* Erro */}
          {fase === 'erro' && (
            <div style={{ padding: '2rem' }}>
              <div style={{
                background: '#fef2f2', border: '1px solid #fca5a5',
                borderRadius: '10px', padding: '1rem 1.25rem',
                fontSize: '14px', color: '#dc2626', textAlign: 'center', lineHeight: 1.5,
              }}>
                {erroMsg}
              </div>
              <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '13px', color: '#888' }}>
                Dúvidas? Entre em contato com o administrador da sua cooperativa.
              </p>
            </div>
          )}

          {/* Formulário */}
          {(fase === 'formulario' || fase === 'salvando') && (
            <div style={{ padding: '2rem' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1a1a1a', margin: '0 0 0.5rem' }}>
                Bem-vindo ao NexCoop
              </h2>
              <p style={{ fontSize: '14px', color: '#6b6b6b', margin: '0 0 1.5rem', lineHeight: 1.5 }}>
                Defina sua senha para acessar o sistema.
              </p>

              <form onSubmit={handleDefinirSenha}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#444', marginBottom: '6px' }}>
                    Nova senha
                  </label>
                  <CampoSenha value={senha} onChange={setSenha} placeholder="Mínimo 6 caracteres" />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#444', marginBottom: '6px' }}>
                    Confirmar senha
                  </label>
                  <CampoSenha value={confirmar} onChange={setConfirmar} placeholder="Repita a senha" />
                </div>

                {erroMsg && (
                  <div style={{
                    background: '#fef2f2', border: '1px solid #fca5a5',
                    borderRadius: '8px', padding: '10px 12px',
                    fontSize: '13px', color: '#dc2626', marginBottom: '1rem',
                  }}>
                    {erroMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={fase === 'salvando'}
                  style={{
                    width: '100%', padding: '11px',
                    background: fase === 'salvando' ? '#9F9BFF' : PURPLE,
                    color: '#fff', border: 'none', borderRadius: '8px',
                    fontSize: '14px', fontWeight: '600',
                    cursor: fase === 'salvando' ? 'not-allowed' : 'pointer',
                  }}
                >
                  {fase === 'salvando' ? 'Salvando…' : 'Acessar o NexCoop'}
                </button>
              </form>
            </div>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: '12px', color: '#999', marginTop: '1.5rem' }}>
          NexCoop © 2026 — Gestão que fortalece quem produz juntos
        </p>
      </div>
    </div>
  )
}
